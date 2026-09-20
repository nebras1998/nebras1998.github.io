'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import type { Employee } from '@/types';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';
import { apiFetch } from '@/lib/api-client';

export default function NewTripPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    vehicleId: vehicleId,
    driverId: '',
    companionId: '',
    departureTime: new Date().toISOString().slice(0, 16),
    destination: '',
    purpose: '',
    startMileage: '',
    status: 'قيد الرحلة',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empRes = await listEmployees([Query.equal('status', 'يعمل'), Query.limit(200)]);
        setEmployees(empRes.documents);
      } catch { toast.error('فشل تحميل البيانات'); }
    };
    fetchData();
  }, [vehicleId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driverId) { toast.error('اختر السائق'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/vehicle-trips', { method: 'POST', body: JSON.stringify({ documentId: 'unique()', ...form, startMileage: parseInt(form.startMileage) || 0 }) });
      toast.success('تم بدء الرحلة');
      router.push(`/dashboard/vehicles/${vehicleId}`);
    } catch (err: unknown) { toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err))); setLoading(false); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <FormCard title="بدء رحلة جديدة للمركبة {vehiclePlate}" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="تاريخ ووقت الانطلاق" name="departureTime" value={form.departureTime} onChange={handleChange} required type="datetime-local" />
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="السائق" name="driverId" value={form.driverId} onChange={handleChange} required><option value="">اختر السائق</option>{employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}</SelectField>
            <SelectField label="المرافق" name="companionId" value={form.companionId} onChange={handleChange}><option value="">بدون مرافق</option>{employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}</SelectField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="الوجهة" name="destination" value={form.destination} onChange={handleChange} />
            <TextField label="الغرض" name="purpose" value={form.purpose} onChange={handleChange} />
          </div>
          <TextField label="قراءة العداد (الانطلاق)" name="startMileage" value={form.startMileage} onChange={handleChange} type="number" />
          <SubmitButton loading={loading} loadingText="جارٍ البدء...">بدء الرحلة</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}