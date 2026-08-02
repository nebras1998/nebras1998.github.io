'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import type { Vehicle } from '@/lib/services/vehicles';
import { Query } from '@/lib/services';
import { getExpense, updateExpense } from '@/lib/services/expenses';
import { listVehicles } from '@/lib/services/vehicles';
import { toast } from 'sonner';

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    expenseNumber: '',
    type: '',
    amount: '',
    date: '',
    vehicleId: '',
    vendor: '',
    description: '',
    paymentMethod: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [exp, vehRes] = await Promise.all([
          getExpense(expenseId),
          listVehicles([Query.limit(50)]),
        ]);
        setForm({
          expenseNumber: exp.expenseNumber,
          type: exp.type,
          amount: String(exp.amount ?? ''),
          date: exp.date,
          vehicleId: exp.vehicleId || '',
          vendor: exp.vendor || '',
          description: exp.description || '',
          paymentMethod: exp.paymentMethod || 'نقداً',
          notes: exp.notes || '',
        });
        setVehicles(vehRes.documents);
      } catch (err) { toast.error('فشل تحميل البيانات'); } finally { setLoading(false); }
    };
    fetchData();
  }, [expenseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateExpense(expenseId, { ...form, amount: parseFloat(form.amount || '0') });
      toast.success('تم تحديث المصروف');
      router.push('/dashboard/finance/expenses');
    } catch (err: unknown) { toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err))); setSaving(false); }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">تعديل المصروف</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block mb-1">رقم المصروف</label><input value={form.expenseNumber} disabled className="w-full border p-2 rounded bg-concrete-100" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">النوع *</label><select name="type" value={form.type} onChange={handleChange} required className="w-full border p-2 rounded"><option value="سولار">سولار</option><option value="صيانة">صيانة</option><option value="شراء مواد">شراء مواد</option><option value="رواتب">رواتب</option><option value="إيجار">إيجار</option><option value="أخرى">أخرى</option></select></div>
            <div><label className="block mb-1">المبلغ *</label><input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} required className="w-full border p-2 rounded" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">التاريخ *</label><input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border p-2 rounded" /></div>
            <div><label className="block mb-1">طريقة الدفع</label><select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="w-full border p-2 rounded"><option value="نقداً">نقداً</option><option value="بطاقة">بطاقة</option><option value="حوالة">حوالة</option></select></div>
          </div>
          <div><label className="block mb-1">المركبة</label><select name="vehicleId" value={form.vehicleId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">بدون مركبة</option>{vehicles.map(v => <option key={v.$id} value={v.$id}>{v.plateNumber}</option>)}</select></div>
          <div><label className="block mb-1">البائع / المحطة</label><input name="vendor" value={form.vendor} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block mb-1">الوصف</label><input name="description" value={form.description} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" /></div>
          <button type="submit" disabled={saving} className="w-full bg-petrol text-white py-2 rounded hover:bg-petrol-dark disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}
