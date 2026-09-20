'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSampleType } from '@/lib/services/sample-types';
import { apiFetch } from '@/lib/api-client';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
import Breadcrumb from '@/components/Breadcrumb';
import { toast } from 'sonner';

export default function EditSampleTypePage() {
  const router = useRouter();
  const params = useParams();
  const typeId = params.id as string;

  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const doc = await getSampleType(typeId);
        setForm({
          name: doc.name || '',
          code: doc.code || '',
          description: doc.description || '',
        });
      } catch {
        toast.error('فشل تحميل بيانات نوع العينة');
      } finally {
        setLoading(false);
      }
    })();
  }, [typeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/sample-types/' + typeId, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
        }),
      });
      toast.success('تم تحديث نوع العينة');
      router.push(`/dashboard/catalog/sample-types/${typeId}`);
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
          <Breadcrumb items={[{ href: '/dashboard/catalog', label: 'كتالوج الفحوصات' }, { label: 'تعديل نوع العينة' }]} />
        </div>
        <FormCard title="تعديل نوع العينة" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} required />
            <TextField label="الرمز (code)" name="code" value={form.code} onChange={handleChange} dir="ltr" inputClassName="font-mono" />
            <TextAreaField label="الوصف" name="description" value={form.description} onChange={handleChange} rows={3} />
            <SubmitButton loading={saving} className="w-full">حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
