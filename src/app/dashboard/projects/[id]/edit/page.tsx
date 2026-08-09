'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Client } from '@/types';
import { getProject, listClients, updateProject } from '@/lib/services';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import Breadcrumb from '@/components/Breadcrumb';
import { toast } from 'sonner';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    projectNumber: '',
    name: '',
    location: '',
    clientId: '',
    contractor: '',
    consultant: '',
    startDate: '',
    status: 'نشط',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // جلب بيانات المشروع وقائمة العملاء
  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب بيانات المشروع
        const project = await getProject(projectId);
        setFormData({
          projectNumber: project.projectNumber,
          name: project.name,
          location: project.location || '',
          clientId: project.clientId,
          contractor: project.contractor || '',
          consultant: project.consultant || '',
          startDate: project.startDate || '',
          status: project.status,
          notes: project.notes || '',
        });

        // جلب قائمة العملاء للاختيار
        const clientsRes = await listClients([Query.limit(100)]);
        setClients(clientsRes.documents);
      } catch (err: unknown) {
        toast.error('خطأ في جلب البيانات: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProject(projectId, formData);
      toast.success('تم تحديث المشروع بنجاح');
      router.push('/dashboard/projects');
    } catch (err: unknown) {
      toast.error('خطأ في تحديث المشروع: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <TableSkeleton rows={5} cols={3} />
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mb-4">
          <Breadcrumb items={[{ href: '/dashboard/projects', label: 'المشاريع' }, { label: 'تعديل بيانات المشروع' }]} />
        </div>
        <FormCard title="تعديل بيانات المشروع" maxWidth="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="رقم المشروع" name="projectNumber" value={formData.projectNumber} onChange={handleChange} required />
            <TextField label="اسم المشروع" name="name" value={formData.name} onChange={handleChange} required />
            <SelectField label="العميل" name="clientId" value={formData.clientId} onChange={handleChange} required>
              <option value="">اختر العميل</option>
              {clients.map((client) => (
                <option key={client.$id} value={client.$id}>{client.name}</option>
              ))}
            </SelectField>
            <TextField label="الموقع" name="location" value={formData.location} onChange={handleChange} />
            <TextField label="المقاول" name="contractor" value={formData.contractor} onChange={handleChange} />
            <TextField label="الاستشاري" name="consultant" value={formData.consultant} onChange={handleChange} />
            <TextField label="تاريخ البداية" name="startDate" type="date" value={formData.startDate} onChange={handleChange} />
            <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required>
              <option value="نشط">نشط</option>
              <option value="مكتمل">مكتمل</option>
              <option value="متوقف">متوقف</option>
            </SelectField>
            <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
            <SubmitButton loading={saving}>حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}