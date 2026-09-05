'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getVehicle } from '@/lib/services/vehicles';
import { getVehicleTrip, updateVehicleTrip } from '@/lib/services/vehicle-trips';
import { toast } from 'sonner';
import { ArrowRight, Save } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import { useAuthStore } from '@/store/useAuthStore';
import { createNotification } from '@/lib/notifications';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const { employee } = useAuthStore();
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [form, setForm] = useState({
    departureTime: '',
    returnTime: new Date().toISOString().slice(0, 16),
    destination: '',
    purpose: '',
    startMileage: '',
    endMileage: '',
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
          returnTime: trip.returnTime || new Date().toISOString().slice(0, 16),
          destination: trip.destination || '',
          purpose: trip.purpose || '',
          startMileage: trip.startMileage || '',
          endMileage: trip.endMileage || '',
          notes: trip.notes || '',
        });
        if (trip.vehicleId) {
          const vehicle = await getVehicle(trip.vehicleId);
          setVehiclePlate(vehicle.plateNumber);
        }
      } catch {
        toast.error('فشل تحميل الرحلة');
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateVehicleTrip(tripId, {
        returnTime: form.returnTime,
        endMileage: parseInt(form.endMileage) || null,
        destination: form.destination,
        purpose: form.purpose,
        notes: form.notes,
        status: 'مكتملة',
      });

      // --- إنشاء تنبيه ---
      if (employee) {
        const distance = (parseInt(form.endMileage) || 0) - (parseInt(form.startMileage) || 0);
        await createNotification({
          type: 'رحلة_انهاء',
          message: `أنهى ${employee.name} رحلة المركبة ${vehiclePlate} وقطع ${distance > 0 ? distance : '?'} كم`,
          employeeId: employee.$id,
          employeeName: employee.name,
        });
      }
      // --- نهاية التنبيه ---

      toast.success('تم إنهاء الرحلة بنجاح');
      router.push('/technician/vehicles');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4"><TableSkeleton rows={5} cols={2} /></div>;

  return (
    <div className="min-h-screen bg-surface-dim pb-16" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold">إنهاء الرحلة - {vehiclePlate}</h1>
      </header>

      <main className="p-4">
        <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="تاريخ ووقت الانطلاق" type="datetime-local" value={form.departureTime} disabled inputClassName="bg-surface-muted" />

          <TextField label="تاريخ ووقت العودة" type="datetime-local" name="returnTime" value={form.returnTime} onChange={handleChange} required />

          <div className="grid grid-cols-2 gap-4">
            <TextField label="الوجهة" name="destination" value={form.destination} onChange={handleChange} />
            <TextField label="الغرض" name="purpose" value={form.purpose} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField label="عداد الانطلاق" type="number" value={form.startMileage} disabled inputClassName="bg-surface-muted" />
            <TextField label="عداد العودة" type="number" name="endMileage" value={form.endMileage} onChange={handleChange} required />
          </div>

          <TextAreaField label="ملاحظات" name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="أي ملاحظات إضافية..." />

          <SubmitButton loading={saving} className="w-full text-lg flex items-center justify-center gap-2">
            <Save size={20} />
            إنهاء الرحلة
          </SubmitButton>
        </form>
        </Card>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}