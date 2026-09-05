'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import { listEmployees, createEmployee } from '@/lib/services/employees';
import { createFile } from '@/lib/services/files';
import { Query } from '@/lib/services';
import { Upload, X } from 'lucide-react';

export default function NewEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatedNumber, setGeneratedNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const doGenerate = async () => {
      const currentYear = new Date().getFullYear();
      const prefix = `EMP-${currentYear}-`;
      let nextNumber = 1;
      try {
        const response = await listEmployees([
          Query.startsWith('employeeNumber', prefix),
          Query.orderDesc('employeeNumber'),
          Query.limit(1),
        ]);
        if (response.documents.length > 0) {
          const lastNumber = response.documents[0].employeeNumber.split('-').pop();
          if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
        }
      } catch {}

      let isUnique = false;
      let newNumber = '';
      while (!isUnique) {
        const padded = String(nextNumber).padStart(3, '0');
        newNumber = `${prefix}${padded}`;
        try {
          const check = await listEmployees([
            Query.equal('employeeNumber', newNumber),
            Query.limit(1),
          ]);
          if (check.documents.length === 0) isUnique = true;
          else nextNumber++;
        } catch { isUnique = true; }
      }
      setGeneratedNumber(newNumber);
    };
    doGenerate();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    setUploading(true);
    const uploadedIds: string[] = [];
    try {
      for (const file of selectedFiles) {
        const result = await createFile(file);
        uploadedIds.push(result.$id);
      }
      toast.success('تم رفع المستندات بنجاح');
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
    setLoading(true);
    try {
      const documentIds = await uploadFiles();
      let isSuccess = false;
      let nextNumberStr = generatedNumber;
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          const employeeData = {
            ...form,
            employeeNumber: nextNumberStr,
            documentIds: JSON.stringify(documentIds),
          };
          await createEmployee(nextNumberStr, employeeData);
          isSuccess = true;
        } catch (err: unknown) {
          const appwriteErr = err as { code?: number };
          if (appwriteErr.code === 409) {
            attempts++;
            const currentYear = new Date().getFullYear();
            const prefix = `EMP-${currentYear}-`;
            const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
            nextNumberStr = `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        toast.success('تم إضافة الموظف بنجاح');
        router.push('/dashboard/hr/employees');
      } else {
        throw new Error('تعذر توليد رقم موظف فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ في إضافة الموظف: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="إضافة موظف جديد">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="رقم الموظف"
              value={generatedNumber}
              readOnly
              inputClassName="bg-surface-muted font-mono"
            />
            <p className="text-sm text-text-muted mt-1">يتم توليده تلقائياً</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} required />
              <TextField
                label="المسمى الوظيفي"
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                required
                placeholder="فني مختبر، مهندس مواد..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="القسم"
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="المختبر، الإدارة..."
              />
              <TextField label="تاريخ التعيين" name="hireDate" type="date" value={form.hireDate} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={handleChange} />
              <TextField label="الهاتف" name="phone" value={form.phone} onChange={handleChange} />
            </div>

            <TextField label="المؤهل العلمي" name="qualification" value={form.qualification} onChange={handleChange} />

            <TextAreaField
              label="الشهادات المهنية"
              name="certifications"
              value={form.certifications}
              onChange={handleChange}
              rows={2}
              placeholder="سجل الشهادات المهنية الحاصل عليها"
            />

            <SelectField label="الحالة" name="status" value={form.status} onChange={handleChange} required>
              <option value="يعمل">يعمل</option>
              <option value="إجازة">إجازة</option>
              <option value="مستقيل">مستقيل</option>
            </SelectField>

            <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={3} />

            {/* قسم رفع المستندات */}
            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">المستندات (السيرة الذاتية، الشهادات)</h3>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-border px-3 py-1 rounded flex items-center gap-1 hover:bg-border"
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
                <span className="text-sm text-text-muted">{selectedFiles.length} ملفات محددة</span>
              </div>
              {selectedFiles.length > 0 && (
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center text-sm bg-surface-dim p-1 rounded">
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)} className="text-danger"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {uploading && <p className="text-sm text-primary mt-1">جارٍ رفع الملفات...</p>}
            </div>

            <SubmitButton loading={loading || uploading}>حفظ الموظف</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}