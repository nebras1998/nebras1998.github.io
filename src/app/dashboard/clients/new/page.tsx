'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';

export default function NewClientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    type: 'مكتب هندسي',
    email: '',
    phone: '',
    address: '',
    taxId: '',
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
      await apiFetch('/api/clients', { method: 'POST', body: JSON.stringify({ documentId: 'unique()', ...formData }) });
      toast.success('تم إضافة العميل بنجاح');
      router.push('/dashboard/clients');
    } catch (err: unknown) {
      toast.error('خطأ في إضافة العميل: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="إضافة عميل جديد">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="الاسم"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="اسم العميل"
            />
            <SelectField label="النوع" name="type" value={formData.type} onChange={handleChange} required>
              <option value="مكتب هندسي">مكتب هندسي</option>
              <option value="مقاول">مقاول</option>
              <option value="بلدية">بلدية</option>
              <option value="جهة حكومية">جهة حكومية</option>
              <option value="فرد">فرد</option>
            </SelectField>
            <TextField
              label="الهاتف"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="رقم الهاتف"
            />
            <TextField
              label="البريد الإلكتروني"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              placeholder="اختياري"
            />
            <TextField
              label="العنوان"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="اختياري"
            />
            <TextField
              label="الرقم الضريبي"
              name="taxId"
              value={formData.taxId}
              onChange={handleChange}
              placeholder="اختياري"
            />
            <TextAreaField
              label="ملاحظات"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="اختياري"
            />
            <SubmitButton loading={loading}>حفظ العميل</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
