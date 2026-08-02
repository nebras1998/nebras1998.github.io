'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
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
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">إضافة موظف جديد</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">رقم الموظف</label>
              <input
                value={generatedNumber}
                readOnly
                className="w-full border p-2 rounded bg-concrete-100 font-mono"
              />
              <p className="text-sm text-concrete-500 mt-1">يتم توليده تلقائياً</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">الاسم *</label>
                <input name="name" value={form.name} onChange={handleChange} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">المسمى الوظيفي *</label>
                <input name="jobTitle" value={form.jobTitle} onChange={handleChange} required className="w-full border p-2 rounded" placeholder="فني مختبر، مهندس مواد..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">القسم</label>
                <input name="department" value={form.department} onChange={handleChange} className="w-full border p-2 rounded" placeholder="المختبر، الإدارة..." />
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
              <textarea name="certifications" value={form.certifications} onChange={handleChange} rows={2} className="w-full border p-2 rounded" placeholder="سجل الشهادات المهنية الحاصل عليها" />
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

            {/* قسم رفع المستندات */}
            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">المستندات (السيرة الذاتية، الشهادات)</h3>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-concrete-200 px-3 py-1 rounded flex items-center gap-1 hover:bg-concrete-200"
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
                <span className="text-sm text-concrete-500">{selectedFiles.length} ملفات محددة</span>
              </div>
              {selectedFiles.length > 0 && (
                <ul className="space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center text-sm bg-concrete-50 p-1 rounded">
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)} className="text-danger"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {uploading && <p className="text-sm text-petrol mt-1">جارٍ رفع الملفات...</p>}
            </div>

            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-petrol text-white py-2 rounded hover:bg-petrol-dark disabled:opacity-50"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ الموظف'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}