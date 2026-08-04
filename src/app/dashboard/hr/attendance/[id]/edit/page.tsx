'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import { getAttendance, updateAttendance } from '@/lib/services/attendance';

export default function EditAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;

  const [form, setForm] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'حاضر',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const record = await getAttendance(recordId);
        setForm({
          date: record.date,
          checkIn: record.checkIn || '',
          checkOut: record.checkOut || '',
          status: record.status,
          notes: record.notes || '',
        });
      } catch {
        toast.error('فشل تحميل بيانات السجل');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAttendance(recordId, form);
      toast.success('تم تحديث السجل');
      router.push('/dashboard/hr/attendance');
    } catch (err: unknown) {
      toast.error('خطأ في التحديث: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="تعديل سجل الحضور" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="التاريخ" type="date" name="date" value={form.date} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="وقت الحضور" type="time" name="checkIn" value={form.checkIn} onChange={handleChange} />
              <TextField label="وقت الانصراف" type="time" name="checkOut" value={form.checkOut} onChange={handleChange} />
            </div>
            <SelectField label="الحالة" name="status" value={form.status} onChange={handleChange} required>
              <option value="حاضر">حاضر</option>
              <option value="غائب">غائب</option>
              <option value="متأخر">متأخر</option>
              <option value="إجازة">إجازة</option>
            </SelectField>
            <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            <SubmitButton loading={saving}>حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}