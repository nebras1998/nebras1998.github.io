'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEquipment } from '@/lib/services/equipment';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';

export default function NewEquipmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    calibrationDate: '',
    nextCalibrationDate: '',
    maintenanceDate: '',
    status: 'يعمل',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createEquipment('unique()', formData);
      toast.success('تم إضافة الجهاز بنجاح');
      router.push('/dashboard/equipment');
    } catch (err: unknown) {
      toast.error('خطأ في إضافة الجهاز: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <FormCard title="إضافة جهاز جديد" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="اسم الجهاز" name="name" value={formData.name} onChange={handleChange} required />
            <TextField label="الموديل" name="model" value={formData.model} onChange={handleChange} />
          </div>
          <TextField label="الرقم التسلسلي" name="serialNumber" value={formData.serialNumber} onChange={handleChange} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="تاريخ الشراء" name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleChange} />
            <TextField label="تاريخ آخر معايرة" name="calibrationDate" type="date" value={formData.calibrationDate} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="تاريخ المعايرة القادمة" name="nextCalibrationDate" type="date" value={formData.nextCalibrationDate} onChange={handleChange} />
            <TextField label="تاريخ آخر صيانة" name="maintenanceDate" type="date" value={formData.maintenanceDate} onChange={handleChange} />
          </div>
          <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required>
            <option value="يعمل">يعمل</option>
            <option value="قيد الصيانة">قيد الصيانة</option>
            <option value="متوقف">متوقف</option>
            <option value="خارج الخدمة">خارج الخدمة</option>
          </SelectField>
          <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
          <SubmitButton loading={loading}>حفظ الجهاز</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}