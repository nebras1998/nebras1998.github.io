'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getClient, updateClient } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
import { toast } from 'sonner';

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [formData, setFormData] = useState({
    name: '',
    type: 'مكتب هندسي',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // جلب بيانات العميل عند التحميل
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const client = await getClient(clientId);
        setFormData({
          name: client.name,
          type: client.type || 'مكتب هندسي',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          taxId: client.taxId || '',
          notes: client.notes || '',
        });
      } catch (err: unknown) {
        toast.error('خطأ في جلب بيانات العميل: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [clientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateClient(clientId, formData);
      toast.success('تم تحديث بيانات العميل بنجاح');
      router.push('/dashboard/clients');
    } catch (err: unknown) {
      toast.error('خطأ في تحديث العميل: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={2} /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="تعديل بيانات العميل">
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
            <SubmitButton loading={saving}>حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
