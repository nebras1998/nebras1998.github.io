'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
import Breadcrumb from '@/components/Breadcrumb';
import { getVehicleTrip, updateVehicleTrip } from '@/lib/services/vehicle-trips';
import { toast } from 'sonner';

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;   // لاحظ اسم المتغير
  const vehicleId = params.id as string;    // من المسار [id]
  const [form, setForm] = useState({
    departureTime: '',
    returnTime: '',
    destination: '',
    purpose: '',
    startMileage: '',
    endMileage: '',
    status: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const trip = await getVehicleTrip(tripId);
        setForm({
          departureTime: trip.departureTime,
          returnTime: trip.returnTime || '',
          destination: trip.destination || '',
          purpose: trip.purpose || '',
          startMileage: trip.startMileage || '',
          endMileage: trip.endMileage || '',
          status: trip.status,
          notes: trip.notes || '',
        });
      } catch (err) {
        toast.error('فشل تحميل الرحلة');
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        returnTime: form.returnTime || null,
        endMileage: parseInt(form.endMileage) || null,
        destination: form.destination,
        purpose: form.purpose,
        notes: form.notes,
        status: form.returnTime ? 'مكتملة' : 'قيد الرحلة',
      };
      await updateVehicleTrip(tripId, updateData);
      toast.success('تم تحديث الرحلة');
      router.push(`/dashboard/vehicles/${vehicleId}`); // العودة إلى تفاصيل المركبة
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
          <Breadcrumb items={[{ href: '/dashboard/vehicles', label: 'المركبات' }, { label: 'تعديل الرحلة' }]} />
        </div>
        <FormCard title="تعديل الرحلة" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField label="تاريخ ووقت الانطلاق" type="datetime-local" name="departureTime" value={form.departureTime} disabled inputClassName="bg-concrete-100" />
            <TextField label="تاريخ ووقت العودة" type="datetime-local" name="returnTime" value={form.returnTime} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="الوجهة" name="destination" value={form.destination} onChange={handleChange} />
              <TextField label="الغرض" name="purpose" value={form.purpose} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="عداد الانطلاق" type="number" name="startMileage" value={form.startMileage} disabled inputClassName="bg-concrete-100" />
              <TextField label="عداد العودة" type="number" name="endMileage" value={form.endMileage} onChange={handleChange} />
            </div>
            <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            <SubmitButton loading={saving}>حفظ التعديلات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}