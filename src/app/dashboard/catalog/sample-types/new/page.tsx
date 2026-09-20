'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import Breadcrumb from '@/components/Breadcrumb';
import { toast } from 'sonner';

export default function NewSampleTypePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const doc = await apiFetch<{ $id: string }>('/api/sample-types', {
        method: 'POST',
        body: JSON.stringify({
          documentId: 'unique()',
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
        }),
      });
      toast.success('تم إضافة نوع العينة');
      router.push(`/dashboard/catalog/sample-types/${doc.$id}`);
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto mb-4">
          <Breadcrumb items={[{ href: '/dashboard/catalog', label: 'كتالوج الفحوصات' }, { label: 'إضافة نوع عينة' }]} />
        </div>
        <FormCard title="إضافة نوع عينة جديد" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="الاسم" name="name" value={form.name} onChange={handleChange} required placeholder="مثال: خرسانة" />
            <TextField label="الرمز (code)" name="code" value={form.code} onChange={handleChange} dir="ltr" inputClassName="font-mono" placeholder="مثال: CONC" />
            <TextAreaField label="الوصف" name="description" value={form.description} onChange={handleChange} rows={3} />
            <SubmitButton loading={saving} className="w-full">إضافة النوع</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
