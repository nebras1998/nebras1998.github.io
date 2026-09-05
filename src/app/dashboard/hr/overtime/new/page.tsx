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
import { createOvertime } from '@/lib/services/overtime';
import { Query } from '@/lib/services';
import { computeWorkHours } from '@/lib/work-time';

export default function NewOvertimePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    hours: 0,
    reason: '',
    status: 'معلق',
    notes: '',
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

  // حساب الساعات تلقائياً عند تغيير الوقت
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      if (name === 'startTime' || name === 'endTime') {
        newForm.hours = computeWorkHours(
          name === 'startTime' ? value : prev.startTime,
          name === 'endTime' ? value : prev.endTime
        );
      }
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) { toast.error('اختر الموظف'); return; }
    if (form.hours <= 0) { toast.error('يجب أن تكون الساعات أكبر من صفر'); return; }
    setLoading(true);
    try {
      await createOvertime('unique()', form);
      toast.success('تم تقديم طلب العمل الإضافي');
      router.push('/dashboard/hr/overtime');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="طلب عمل إضافي جديد" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <SelectField label="الموظف" name="employeeId" value={form.employeeId} onChange={handleChange} required>
              <option value="">اختر الموظف</option>
              {employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}
            </SelectField>
            <TextField label="التاريخ" type="date" name="date" value={form.date} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="وقت البداية" type="time" name="startTime" value={form.startTime} onChange={handleChange} />
              <TextField label="وقت النهاية" type="time" name="endTime" value={form.endTime} onChange={handleChange} />
            </div>
            <TextField label="عدد الساعات" type="number" step="0.5" min="0" name="hours" value={form.hours} onChange={handleChange} required />
            <p className="text-sm text-text-muted mt-1">يتم حسابه تلقائياً من الوقت (يمكنك تعديله)</p>
            <TextAreaField label="سبب العمل الإضافي" name="reason" value={form.reason} onChange={handleChange} rows={3} />
            <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            <SubmitButton loading={loading} loadingText="جارٍ التقديم...">تقديم الطلب</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}