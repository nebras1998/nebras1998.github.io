'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Project } from '@/types';
import type { Employee } from '@/types';
import { getSample, updateSample } from '@/lib/services/samples';
import { listProjects } from '@/lib/services/projects';
import { listEmployees } from '@/lib/services/employees';
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

const TYPE_CODES: Record<string, string> = {
  'خرسانة': 'CON', 'تربة': 'SOI', 'أسفلت': 'ASP', 'ركام': 'AGG', 'مياه': 'WAT', 'فولاذ': 'STL', 'أخرى': 'OTH',
};

export default function EditSamplePage() {
  const router = useRouter();
  const params = useParams();
  const sampleId = params.id as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    sampleNumber: '', type: 'خرسانة', projectId: '', clientId: '', status: 'تم الاستلام',
    samplingDate: '', preparationDate: '', deliveryDate: '',
    samplerId: '', preparerId: '', transporterId: '',
    test7DaysDate: '', test28DaysDate: '', notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [sample, projectsRes, techRes] = await Promise.all([
          getSample(sampleId),
          listProjects([Query.limit(200)]),
          listEmployees([Query.equal('role', 'فني'), Query.equal('status', 'يعمل'), Query.limit(100)]),
        ]);
        setFormData({
          sampleNumber: sample.sampleNumber, type: sample.type, projectId: sample.projectId || '', clientId: sample.clientId || '',
          status: sample.status, samplingDate: sample.samplingDate || '', preparationDate: sample.preparationDate || '',
          deliveryDate: sample.deliveryDate || '', samplerId: sample.samplerId || '', preparerId: sample.preparerId || '',
          transporterId: sample.transporterId || '', test7DaysDate: sample.test7DaysDate || '', test28DaysDate: sample.test28DaysDate || '',
          notes: sample.notes || '',
        });
        setProjects(projectsRes.documents);
        setTechnicians(techRes.documents);
      } catch (err: unknown) { toast.error('خطأ في جلب البيانات: ' + (err instanceof Error ? err.message : String(err))); } finally { setLoading(false); }
    })();
  }, [sampleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'projectId') { const project = projects.find((p: Project) => p.$id === value); newData.clientId = project?.clientId || ''; }
      if ((name === 'type' || name === 'samplingDate') && newData.type === 'خرسانة' && newData.samplingDate) {
        const d = new Date(newData.samplingDate);
        const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
        const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
        newData.test7DaysDate = d7.toISOString().split('T')[0];
        newData.test28DaysDate = d28.toISOString().split('T')[0];
      } else if ((name === 'type' || name === 'samplingDate') && newData.type !== 'خرسانة') {
        newData.test7DaysDate = '';
        newData.test28DaysDate = '';
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true);
    try {
      await updateSample(sampleId, formData);
      toast.success('تم تحديث العينة بنجاح'); router.push('/dashboard/samples');
    }
    catch (err: unknown) { toast.error('خطأ في التحديث: ' + (err instanceof Error ? err.message : String(err))); setSaving(false); }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={3} /></DashboardLayout></AuthGuard>;

  const selectedProject = projects.find((p: Project) => p.$id === formData.projectId);

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-3xl mx-auto mb-4">
        <Breadcrumb items={[{ href: '/dashboard/samples', label: 'العينات' }, { label: 'تعديل بيانات العينة' }]} />
      </div>
      <FormCard title="تعديل بيانات العينة" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="نوع العينة" name="type" value={formData.type} onChange={handleChange} required>{Object.keys(TYPE_CODES).map((t) => (<option key={t} value={t}>{t}</option>))}</SelectField>
            <TextField label="رقم العينة" value={formData.sampleNumber} readOnly inputClassName="bg-surface-muted font-mono" />
          </div>
          <SelectField label="المشروع" name="projectId" value={formData.projectId} onChange={handleChange} required><option value="">اختر المشروع</option>{projects.map((p) => (<option key={p.$id} value={p.$id}>{p.name}</option>))}</SelectField>
          <TextField label="العميل" value={selectedProject ? (selectedProject.clientId || 'غير معروف') : ''} readOnly inputClassName="bg-surface-muted text-text-muted" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField type="date" label="تاريخ أخذ العينة" name="samplingDate" value={formData.samplingDate} onChange={handleChange} />
            <TextField type="date" label="تاريخ تحضير العينة" name="preparationDate" value={formData.preparationDate} onChange={handleChange} />
            <TextField type="date" label="تاريخ إحضار العينة للمختبر" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} />
          </div>
          {formData.type === 'خرسانة' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary-50 p-4 rounded-lg">
              <TextField type="date" label="تاريخ فحص 7 أيام (تلقائي)" name="test7DaysDate" value={formData.test7DaysDate} onChange={handleChange} />
              <TextField type="date" label="تاريخ فحص 28 يوم (تلقائي)" name="test28DaysDate" value={formData.test28DaysDate} onChange={handleChange} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="فني أخذ العينة" name="samplerId" value={formData.samplerId} onChange={handleChange}><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</SelectField>
            <SelectField label="فني تحضير العينة" name="preparerId" value={formData.preparerId} onChange={handleChange}><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</SelectField>
            <SelectField label="فني إحضار العينة" name="transporterId" value={formData.transporterId} onChange={handleChange}><option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}</SelectField>
          </div>
          <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required><option value="تم الاستلام">تم الاستلام</option><option value="تحت الفحص">تحت الفحص</option><option value="منجز">منجز</option><option value="مرفوض">مرفوض</option></SelectField>
          <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
          <SubmitButton loading={saving} className="w-full">حفظ التعديلات</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}
