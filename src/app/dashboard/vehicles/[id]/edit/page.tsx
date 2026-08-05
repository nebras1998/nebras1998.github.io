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
import TableSkeleton from '@/components/TableSkeleton';
import Breadcrumb from '@/components/Breadcrumb';
import { getVehicle, updateVehicle } from '@/lib/services/vehicles';
import { toast } from 'sonner';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const vehicle = await getVehicle(vehicleId);
        setForm({
          plateNumber: vehicle.plateNumber,
          brand: vehicle.brand || '',
          model: vehicle.model || '',
          year: vehicle.year || '',
          type: vehicle.type || 'بيك أب',
          color: vehicle.color || '',
          status: vehicle.status,
          notes: vehicle.notes || '',
        });
      } catch {
        toast.error('فشل تحميل بيانات المركبة');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [vehicleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateVehicle(vehicleId, form);
      toast.success('تم تحديث المركبة');
      router.push('/dashboard/vehicles');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={2} /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto mb-4">
          <Breadcrumb items={[{ href: '/dashboard/vehicles', label: 'المركبات' }, { label: 'تعديل المركبة' }]} />
        </div>
        <FormCard title="تعديل المركبة" maxWidth="max-w-xl">
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
            <SubmitButton loading={saving}>حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}