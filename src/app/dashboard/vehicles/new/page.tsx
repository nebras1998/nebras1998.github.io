'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { createVehicle } from '@/lib/services/vehicles';
import { toast } from 'sonner';

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    year: '',
    type: 'بيك أب',
    color: '',
    status: 'جاهزة',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createVehicle('unique()', form);
      toast.success('تم إضافة المركبة');
      router.push('/dashboard/vehicles');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <FormCard title="إضافة مركبة جديدة" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="رقم اللوحة" name="plateNumber" value={form.plateNumber} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="الماركة" name="brand" value={form.brand} onChange={handleChange} />
            <TextField label="الموديل" name="model" value={form.model} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="سنة الصنع" name="year" value={form.year} onChange={handleChange} />
            <TextField label="اللون" name="color" value={form.color} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="النوع" name="type" value={form.type} onChange={handleChange}><option value="بيك أب">بيك أب</option><option value="سيارة">سيارة</option><option value="شاحنة">شاحنة</option></SelectField>
            <SelectField label="الحالة" name="status" value={form.status} onChange={handleChange} required><option value="جاهزة">جاهزة</option><option value="قيد الصيانة">قيد الصيانة</option><option value="خارج الخدمة">خارج الخدمة</option></SelectField>
          </div>
          <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={2} />
          <SubmitButton loading={loading}>حفظ المركبة</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}