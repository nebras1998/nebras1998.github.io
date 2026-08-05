'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getService, updateService } from '@/lib/services/services-catalog';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
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

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ name: '', category: '', description: '', unit: '', price: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const doc = await getService(id);
        setForm({
          name: doc.name,
          category: doc.category || '',
          description: doc.description || '',
          unit: doc.unit || '',
          price: String(doc.price),
        });
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'خطأ غير معروف'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateService(id, {
        ...form,
        price: parseFloat(form.price) || 0,
      });
      toast.success('تم تحديث الخدمة');
      router.push('/dashboard/finance/services');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'خطأ غير معروف'); setSaving(false); }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={2} /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="تعديل الخدمة" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} required />
            <SelectField label="الفئة" name="category" value={form.category} onChange={handleChange}>
              <option value="">اختر الفئة</option>
              {COMMON_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </SelectField>
            <TextAreaField label="الوصف" name="description" value={form.description} onChange={handleChange} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="الوحدة" name="unit" value={form.unit} onChange={handleChange} />
              <TextField label="السعر (₪)" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required />
            </div>
            <SubmitButton loading={saving} className="w-full">حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
