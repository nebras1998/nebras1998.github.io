'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createService } from '@/lib/services/services-catalog';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';

const COMMON_CATEGORIES = [
  'فحوصات خرسانة',
  'فحوصات تربة',
  'فحوصات أسفلت',
  'فحوصات ركام',
  'فحوصات مياه',
  'فحوصات فولاذ',
  'فحوصات حجر وبلاط',
  'خدمات ميدانية',
  'أخرى',
];

export default function NewServicePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    unit: '',
    price: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createService('unique()', {
        ...form,
        price: parseFloat(form.price) || 0,
      });
      toast.success('تم إضافة الخدمة');
      router.push('/dashboard/finance/services');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="إضافة خدمة جديدة" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} required />
            <div>
              <SelectField label="الفئة" name="category" value={form.category} onChange={handleChange}>
                <option value="">اختر الفئة</option>
                {COMMON_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </SelectField>
              <p className="text-xs text-concrete-500 mt-1">يمكنك كتابة فئة جديدة مباشرة</p>
            </div>
            <TextAreaField label="الوصف" name="description" value={form.description} onChange={handleChange} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="الوحدة" name="unit" value={form.unit} onChange={handleChange} placeholder="مثلاً: مكعب، عينة" />
              <TextField label="السعر (₪)" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
            </div>
            <SubmitButton loading={loading} className="w-full">حفظ الخدمة</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
