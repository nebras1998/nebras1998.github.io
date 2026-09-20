'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import type { Employee } from '@/types';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';
import { apiFetch } from '@/lib/api-client';

export default function NewLeavePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    type: 'سنوي',
    status: 'معلق',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await listEmployees([Query.equal('status', 'يعمل'), Query.limit(200)]);
        setEmployees(res.documents);
      } catch {
        toast.error('فشل تحميل الموظفين');
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) { toast.error('اختر الموظف'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/leaves', { method: 'POST', body: { documentId: 'unique()', ...form } });
      toast.success('تم تقديم طلب الإجازة');
      router.push('/dashboard/hr/leaves');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="طلب إجازة جديد" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <SelectField label="الموظف" name="employeeId" value={form.employeeId} onChange={handleChange} required>
              <option value="">اختر الموظف</option>
              {employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}
            </SelectField>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="تاريخ البداية" type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
              <TextField label="تاريخ النهاية" type="date" name="endDate" value={form.endDate} onChange={handleChange} required />
            </div>
            <SelectField label="نوع الإجازة" name="type" value={form.type} onChange={handleChange} required>
              <option value="سنوي">سنوية</option>
              <option value="مرضي">مرضية</option>
              <option value="طارئ">طارئة</option>
              <option value="بدون راتب">بدون راتب</option>
            </SelectField>
            <TextAreaField label="السبب" name="reason" value={form.reason} onChange={handleChange} rows={3} />
            <SubmitButton loading={loading} loadingText="جارٍ التقديم...">تقديم الطلب</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}