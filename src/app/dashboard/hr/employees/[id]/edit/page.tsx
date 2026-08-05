'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import Breadcrumb from '@/components/Breadcrumb';
import { toast } from 'sonner';
import { Upload, X, FileDown } from 'lucide-react';
import { getEmployee, updateEmployee } from '@/lib/services/employees';
import { createFile, deleteFile, getFile, getFileViewUrl } from '@/lib/services/files';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [form, setForm] = useState({
    employeeNumber: '',
    name: '',
    jobTitle: '',
    department: '',
    email: '',
    phone: '',
    qualification: '',
    certifications: '',
    hireDate: '',
    status: 'يعمل',
    role: 'فني',
    notes: '',
  });
  const [existingDocs, setExistingDocs] = useState<{ $id: string; name: string; viewUrl: string }[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const doc = await getEmployee(employeeId);
        setForm({
          employeeNumber: doc.employeeNumber,
          name: doc.name,
          jobTitle: doc.jobTitle || '',
          department: doc.department || '',
          email: doc.email || '',
          phone: doc.phone || '',
          qualification: doc.qualification || '',
          certifications: doc.certifications || '',
          hireDate: doc.hireDate || '',
          status: doc.status || 'يعمل',
          role: doc.role || 'فني',
          notes: doc.notes || '',
        });

        if (doc.documentIds) {
          try {
            const ids = JSON.parse(doc.documentIds);
            const docsData = await Promise.all(
              ids.map(async (fileId: string) => {
                try {
                  const file = await getFile(fileId);
                  const viewUrl = getFileViewUrl(fileId);
                  return { $id: file.$id, name: file.name, viewUrl };
                } catch {
                  return null;
                }
              })
            );
            setExistingDocs(docsData.filter(Boolean));
          } catch { console.warn('فشل تحليل documentIds'); }
        }
      } catch (err: unknown) {
        toast.error('خطأ في جلب بيانات الموظف: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [employeeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeNewFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingDoc = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      setExistingDocs((prev) => prev.filter((doc) => doc.$id !== fileId));
      toast.success('تم حذف المستند بنجاح');
    } catch (err: unknown) {
      toast.error('فشل حذف المستند: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const uploadNewFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    setUploading(true);
    const uploadedIds: string[] = [];
    try {
      for (const file of selectedFiles) {
        const result = await createFile(file);
        uploadedIds.push(result.$id);
      }
      toast.success('تم رفع المستندات الجديدة');
      return uploadedIds;
    } catch (err: unknown) {
      toast.error('فشل رفع بعض المستندات: ' + (err instanceof Error ? err.message : String(err)));
      return uploadedIds;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const currentDocIds = existingDocs.map((doc) => doc.$id);
      const newDocIds = await uploadNewFiles();
      const allDocIds = [...currentDocIds, ...newDocIds];

      const updatedData = {
        ...form,
        documentIds: JSON.stringify(allDocIds),
      };

      await updateEmployee(employeeId, updatedData);
      toast.success('تم تحديث بيانات الموظف بنجاح');
      router.push('/dashboard/hr/employees');
    } catch (err: unknown) {
      toast.error('خطأ في التحديث: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center p-10">جارٍ تحميل بيانات الموظف...</div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mb-4">
          <Breadcrumb items={[{ href: '/dashboard/hr/employees', label: 'الموظفون' }, { label: 'تعديل بيانات الموظف' }]} />
        </div>
        <FormCard title="تعديل بيانات الموظف">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="رقم الموظف" value={form.employeeNumber} readOnly inputClassName="bg-concrete-100 font-mono" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} required />
              <TextField label="المسمى الوظيفي" name="jobTitle" value={form.jobTitle} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="القسم" name="department" value={form.department} onChange={handleChange} />
              <TextField label="تاريخ التعيين" name="hireDate" type="date" value={form.hireDate} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={handleChange} />
              <TextField label="الهاتف" name="phone" value={form.phone} onChange={handleChange} />
            </div>

            <TextField label="المؤهل العلمي" name="qualification" value={form.qualification} onChange={handleChange} />

            <TextAreaField label="الشهادات المهنية" name="certifications" value={form.certifications} onChange={handleChange} rows={2} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="الحالة" name="status" value={form.status} onChange={handleChange} required>
                <option value="يعمل">يعمل</option>
                <option value="إجازة">إجازة</option>
                <option value="مستقيل">مستقيل</option>
              </SelectField>
              <SelectField label="الدور" name="role" value={form.role} onChange={handleChange} required>
                <option value="فني">فني</option>
                <option value="مدير">مدير</option>
                <option value="إداري">إداري</option>
              </SelectField>
            </div>

            <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={3} />

            {/* قسم المستندات الحالية */}
            {existingDocs.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-bold mb-2">المستندات الحالية</h3>
                <ul className="space-y-2">
                  {existingDocs.map((doc) => (
                    <li key={doc.$id} className="flex justify-between items-center bg-concrete-50 p-2 rounded">
                      <a href={doc.viewUrl} target="_blank" rel="noopener noreferrer" className="text-petrol hover:underline flex items-center gap-1">
                        <FileDown size={16} /> {doc.name}
                      </a>
                      <button type="button" onClick={() => handleDeleteExistingDoc(doc.$id)} className="text-danger" title="حذف المستند نهائياً">
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* قسم رفع مستندات جديدة */}
            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">إضافة مستندات جديدة</h3>
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-concrete-200 px-3 py-1 rounded flex items-center gap-1 hover:bg-concrete-200">
                  <Upload size={16} /> اختر ملفات
                </button>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <span className="text-sm text-concrete-500">{selectedFiles.length} ملفات محددة</span>
              </div>
              {selectedFiles.length > 0 && (
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center text-sm bg-concrete-50 p-1 rounded">
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeNewFile(index)} className="text-danger"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {uploading && <p className="text-sm text-petrol mt-1">جارٍ رفع الملفات...</p>}
            </div>

            <SubmitButton loading={saving || uploading}>حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}