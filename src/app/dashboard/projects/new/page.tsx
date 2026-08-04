'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Client } from '@/types';
import { listClients, createProject } from '@/lib/services';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import { generateUniqueProjectNumber } from '@/lib/helpers';

export default function NewProjectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    projectNumber: '',
    name: '',
    location: '',
    clientId: '',
    contractor: '',
    consultant: '',
    startDate: '',
    status: 'نشط',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(true);

  // توليد رقم المشروع تلقائياً باستخدام الدالة الموحدة
  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const newNumber = await generateUniqueProjectNumber();
        setFormData(prev => ({ ...prev, projectNumber: newNumber }));
      } catch {
        // رقم افتراضي في حال الفشل
        setFormData(prev => ({ ...prev, projectNumber: `PRJ-${new Date().getFullYear()}-001` }));
      } finally {
        setGeneratingNumber(false);
      }
    };
    fetchNumber();
  }, []);

  // جلب قائمة العملاء
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await listClients([Query.limit(200)]);
        setClients(response.documents);
      } catch {
        toast.error('فشل تحميل قائمة العملاء');
      }
    };
    fetchClients();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let isSuccess = false;
      let nextNumberStr = formData.projectNumber;
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          await createProject(nextNumberStr, { ...formData, projectNumber: nextNumberStr });
          isSuccess = true;
        } catch (err: unknown) {
          const appwriteErr = err as { code?: number };
          if (appwriteErr.code === 409) {
            attempts++;
            const currentYear = new Date().getFullYear();
            const prefix = `PRJ-${currentYear}-`;
            const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
            nextNumberStr = `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        toast.success('تم إضافة المشروع بنجاح');
        router.push('/dashboard/projects');
      } else {
        throw new Error('تعذر توليد رقم مشروع فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ في إضافة المشروع: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="إضافة مشروع جديد" maxWidth="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <TextField
                label="رقم المشروع"
                name="projectNumber"
                value={formData.projectNumber}
                onChange={handleChange}
                required
                inputClassName="bg-concrete-50"
                placeholder={generatingNumber ? 'جارٍ التوليد...' : 'رقم المشروع'}
                readOnly={generatingNumber}
              />
              <p className="text-sm text-concrete-500 mt-1">يتم توليده تلقائياً (يمكنك تعديله يدوياً)</p>
            </div>
            <TextField label="اسم المشروع" name="name" value={formData.name} onChange={handleChange} required />
            <SelectField label="العميل" name="clientId" value={formData.clientId} onChange={handleChange} required>
              <option value="">اختر العميل</option>
              {clients.map(client => <option key={client.$id} value={client.$id}>{client.name}</option>)}
            </SelectField>
            <TextField label="الموقع" name="location" value={formData.location} onChange={handleChange} />
            <TextField label="المقاول" name="contractor" value={formData.contractor} onChange={handleChange} />
            <TextField label="الاستشاري" name="consultant" value={formData.consultant} onChange={handleChange} />
            <TextField label="تاريخ البداية" name="startDate" type="date" value={formData.startDate} onChange={handleChange} />
            <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required>
              <option value="نشط">نشط</option>
              <option value="مكتمل">مكتمل</option>
              <option value="متوقف">متوقف</option>
            </SelectField>
            <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
            <SubmitButton loading={loading}>حفظ المشروع</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}