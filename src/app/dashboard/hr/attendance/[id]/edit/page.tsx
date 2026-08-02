'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
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
        <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">تعديل سجل الحضور</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">التاريخ</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">وقت الحضور</label>
                <input type="time" name="checkIn" value={form.checkIn} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">وقت الانصراف</label>
                <input type="time" name="checkOut" value={form.checkOut} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div>
              <label className="block mb-1">الحالة</label>
              <select name="status" value={form.status} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="حاضر">حاضر</option>
                <option value="غائب">غائب</option>
                <option value="متأخر">متأخر</option>
                <option value="إجازة">إجازة</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-petrol text-white py-2 rounded hover:bg-petrol-dark disabled:opacity-50">
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}