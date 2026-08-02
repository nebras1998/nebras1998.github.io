'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import type { Vehicle } from '@/lib/services/vehicles';
import { Query } from '@/lib/services';
import { listExpenses, createExpense } from '@/lib/services/expenses';
import { listVehicles } from '@/lib/services/vehicles';
import { toast } from 'sonner';

export default function NewExpensePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    expenseNumber: '',
    type: 'سولار',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    vendor: '',
    description: '',
    paymentMethod: 'نقداً',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await listVehicles([Query.limit(50)]);
      setVehicles(res.documents);
    })();
    (async () => {
      const currentYear = new Date().getFullYear();
      const prefix = `EXP-${currentYear}-`;
      let nextNumber = 1;
      try {
        const res = await listExpenses([Query.startsWith('expenseNumber', prefix), Query.orderDesc('expenseNumber'), Query.limit(1)]);
        if (res.documents.length > 0) {
          const last = res.documents[0].expenseNumber.split('-').pop();
          if (last) nextNumber = parseInt(last, 10) + 1;
        }
      } catch {}
      let isUnique = false;
      let newNumber = '';
      while (!isUnique) {
        newNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;
        try {
          const check = await listExpenses([Query.equal('expenseNumber', newNumber), Query.limit(1)]);
          if (check.documents.length === 0) isUnique = true;
          else nextNumber++;
        } catch { isUnique = true; }
      }
      setForm(prev => ({ ...prev, expenseNumber: newNumber }));
      setGeneratingNumber(false);
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let isSuccess = false;
      let nextNumberStr = form.expenseNumber;
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          await createExpense(nextNumberStr, { ...form, expenseNumber: nextNumberStr, amount: parseFloat(form.amount) });
          isSuccess = true;
        } catch (err: unknown) {
          if ((err as Record<string, unknown>).code === 409) {
            attempts++;
            const currentYear = new Date().getFullYear();
            const prefix = `EXP-${currentYear}-`;
            const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
            nextNumberStr = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        toast.success('تم إضافة المصروف');
        router.push('/dashboard/finance/expenses');
      } else {
        throw new Error('تعذر توليد رقم مصروف فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">إضافة مصروف جديد</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block mb-1">رقم المصروف</label><input value={form.expenseNumber} disabled className="w-full border p-2 rounded bg-concrete-100 font-mono" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">النوع *</label><select name="type" value={form.type} onChange={handleChange} required className="w-full border p-2 rounded"><option value="سولار">سولار</option><option value="صيانة">صيانة</option><option value="شراء مواد">شراء مواد</option><option value="رواتب">رواتب</option><option value="إيجار">إيجار</option><option value="أخرى">أخرى</option></select></div>
            <div><label className="block mb-1">المبلغ *</label><input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} required className="w-full border p-2 rounded" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">التاريخ *</label><input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border p-2 rounded" /></div>
            <div><label className="block mb-1">طريقة الدفع</label><select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="w-full border p-2 rounded"><option value="نقداً">نقداً</option><option value="بطاقة">بطاقة</option><option value="حوالة">حوالة</option></select></div>
          </div>
          <div><label className="block mb-1">المركبة (اختياري)</label><select name="vehicleId" value={form.vehicleId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">بدون مركبة</option>{vehicles.map(v => <option key={v.$id} value={v.$id}>{v.plateNumber}</option>)}</select></div>
          <div><label className="block mb-1">البائع / المحطة</label><input name="vendor" value={form.vendor} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block mb-1">الوصف</label><input name="description" value={form.description} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" /></div>
          <button type="submit" disabled={loading} className="w-full bg-danger-solid text-white py-2 rounded hover:bg-danger-solid disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : 'حفظ المصروف'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}
