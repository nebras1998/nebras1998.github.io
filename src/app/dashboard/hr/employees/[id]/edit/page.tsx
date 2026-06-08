'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases, storage } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { ID } from 'appwrite';
import { Upload, X, FileDown } from 'lucide-react';

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
    notes: '',
  });
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const doc = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId);
        setForm({
          employeeNumber: doc.employeeNumber,
          name: doc.name,
          jobTitle: doc.jobTitle,
          department: doc.department || '',
          email: doc.email || '',
          phone: doc.phone || '',
          qualification: doc.qualification || '',
          certifications: doc.certifications || '',
          hireDate: doc.hireDate || '',
          status: doc.status,
          notes: doc.notes || '',
        });

        if (doc.documentIds) {
          try {
            const ids = JSON.parse(doc.documentIds);
            const docsData = await Promise.all(
              ids.map(async (fileId: string) => {
                try {
                  const file = await storage.getFile(REPORTS_BUCKET_ID, fileId);
                  const viewUrl = storage.getFileView(REPORTS_BUCKET_ID, fileId);
                  return { $id: file.$id, name: file.name, viewUrl: viewUrl.toString() };
                } catch {
                  return null;
                }
              })
            );
            setExistingDocs(docsData.filter(Boolean));
          } catch (err) {
            console.warn('فشل تحليل documentIds');
          }
        }
      } catch (err: any) {
        toast.error('خطأ في جلب بيانات الموظف: ' + err.message);
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
      await storage.deleteFile(REPORTS_BUCKET_ID, fileId);
      setExistingDocs((prev) => prev.filter((doc) => doc.$id !== fileId));
      toast.success('تم حذف المستند بنجاح');
    } catch (err: any) {
      toast.error('فشل حذف المستند: ' + err.message);
    }
  };

  const uploadNewFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    setUploading(true);
    const uploadedIds: string[] = [];
    try {
      for (const file of selectedFiles) {
        const result = await storage.createFile(REPORTS_BUCKET_ID, ID.unique(), file);
        uploadedIds.push(result.$id);
      }
      toast.success('تم رفع المستندات الجديدة');
      return uploadedIds;
    } catch (err: any) {
      toast.error('فشل رفع بعض المستندات: ' + err.message);
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

      await databases.updateDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId, updatedData);
      toast.success('تم تحديث بيانات الموظف بنجاح');
      router.push('/dashboard/hr/employees');
    } catch (err: any) {
      toast.error('خطأ في التحديث: ' + err.message);
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
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">تعديل بيانات الموظف</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">رقم الموظف</label>
              <input
                value={form.employeeNumber}
                readOnly
                className="w-full border p-2 rounded bg-gray-100 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">الاسم *</label>
                <input name="name" value={form.name} onChange={handleChange} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">المسمى الوظيفي *</label>
                <input name="jobTitle" value={form.jobTitle} onChange={handleChange} required className="w-full border p-2 rounded" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">القسم</label>
                <input name="department" value={form.department} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">تاريخ التعيين</label>
                <input name="hireDate" type="date" value={form.hireDate} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">البريد الإلكتروني</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">الهاتف</label>
                <input name="phone" value={form.phone} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>

            <div>
              <label className="block mb-1">المؤهل العلمي</label>
              <input name="qualification" value={form.qualification} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>

            <div>
              <label className="block mb-1">الشهادات المهنية</label>
              <textarea name="certifications" value={form.certifications} onChange={handleChange} rows={2} className="w-full border p-2 rounded" />
            </div>

            <div>
              <label className="block mb-1">الحالة *</label>
              <select name="status" value={form.status} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="يعمل">يعمل</option>
                <option value="إجازة">إجازة</option>
                <option value="مستقيل">مستقيل</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full border p-2 rounded" />
            </div>

            {/* قسم المستندات الحالية */}
            {existingDocs.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-bold mb-2">المستندات الحالية</h3>
                <ul className="space-y-2">
                  {existingDocs.map((doc: any) => (
                    <li key={doc.$id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <a
                        href={doc.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileDown size={16} /> {doc.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingDoc(doc.$id)}
                        className="text-red-500"
                        title="حذف المستند نهائياً"
                      >
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-200 px-3 py-1 rounded flex items-center gap-1 hover:bg-gray-300"
                >
                  <Upload size={16} /> اختر ملفات
                </button>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-sm text-gray-500">{selectedFiles.length} ملفات محددة</span>
              </div>
              {selectedFiles.length > 0 && (
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center text-sm bg-gray-50 p-1 rounded">
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeNewFile(index)} className="text-red-500"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {uploading && <p className="text-sm text-blue-600 mt-1">جارٍ رفع الملفات...</p>}
            </div>

            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}