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
      <FormCard title="تعديل المصروف" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="رقم المصروف" value={form.expenseNumber} disabled inputClassName="bg-concrete-100" />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="النوع" name="type" value={form.type} onChange={handleChange} required><option value="سولار">سولار</option><option value="صيانة">صيانة</option><option value="شراء مواد">شراء مواد</option><option value="رواتب">رواتب</option><option value="إيجار">إيجار</option><option value="أخرى">أخرى</option></SelectField>
            <TextField label="المبلغ" type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="التاريخ" type="date" name="date" value={form.date} onChange={handleChange} required />
            <SelectField label="طريقة الدفع" name="paymentMethod" value={form.paymentMethod} onChange={handleChange}><option value="نقداً">نقداً</option><option value="بطاقة">بطاقة</option><option value="حوالة">حوالة</option></SelectField>
          </div>
          <SelectField label="المركبة" name="vehicleId" value={form.vehicleId} onChange={handleChange}><option value="">بدون مركبة</option>{vehicles.map(v => <option key={v.$id} value={v.$id}>{v.plateNumber}</option>)}</SelectField>
          <TextField label="البائع / المحطة" name="vendor" value={form.vendor} onChange={handleChange} />
          <TextField label="الوصف" name="description" value={form.description} onChange={handleChange} />
          <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={2} />
          <SubmitButton loading={saving} className="w-full">حفظ التعديلات</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}
