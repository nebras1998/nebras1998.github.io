'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Vehicle } from '@/lib/services';
import { listVehicles } from '@/lib/services/vehicles';
import { createVehicleTrip } from '@/lib/services/vehicle-trips';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import { createNotification } from '@/lib/notifications';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import SubmitButton from '@/components/SubmitButton';

export default function NewTripPage() {
  const router = useRouter();
  const { employee } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    vehicleId: '',
    driverId: employee?.$id || '',
    companionId: '',
    departureTime: new Date().toISOString().slice(0, 16),
    destination: '',
    purpose: '',
    startMileage: '',
    status: 'قيد الرحلة',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await listVehicles();
        setVehicles(res.documents);
      } catch {
        toast.error('فشل تحميل المركبات');
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleId) { toast.error('اختر المركبة'); return; }
    setLoading(true);
    try {
      await createVehicleTrip('unique()', {
        ...form,
        startMileage: parseInt(form.startMileage) || 0,
        returnTime: '',
      });

      if (employee) {
        const vehicle = vehicles.find(v => v.$id === form.vehicleId);
        await createNotification({
          type: 'رحلة_بدء',
          message: `بدأ ${employee.name} رحلة بالمركبة ${vehicle?.plateNumber || ''} إلى ${form.destination || 'بدون وجهة'}`,
          employeeId: employee.$id,
          employeeName: employee.name,
        });
      }

      toast.success('تم بدء الرحلة بنجاح');
      router.push('/technician/vehicles');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-concrete-50 pb-16" dir="rtl">
      <header className="bg-petrol text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={20} />
        </button>
        <h1 className="text-lg font-bold">بدء رحلة جديدة</h1>
      </header>

      <main className="p-4">
        <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="المركبة" name="vehicleId" value={form.vehicleId} onChange={handleChange} required>
            <option value="">اختر المركبة</option>
            {vehicles.map((v) => (
              <option key={v.$id} value={v.$id}>{v.plateNumber} ({v.brand} {v.model})</option>
            ))}
          </SelectField>

          <TextField label="السائق (أنت)" type="text" value={employee?.name || ''} disabled inputClassName="bg-concrete-100" />

          <TextField label="تاريخ ووقت الانطلاق" type="datetime-local" name="departureTime" value={form.departureTime} onChange={handleChange} required />

          <div className="grid grid-cols-2 gap-4">
            <TextField label="الوجهة" name="destination" value={form.destination} onChange={handleChange} placeholder="موقع المشروع" />
            <TextField label="الغرض" name="purpose" value={form.purpose} onChange={handleChange} placeholder="أخذ عينات، فحص..." />
          </div>

          <TextField label="قراءة العداد (الانطلاق)" type="number" name="startMileage" value={form.startMileage} onChange={handleChange} placeholder="كم" />

          <SubmitButton loading={loading} loadingText="جارٍ البدء..." className="w-full text-lg">
            بدء الرحلة
          </SubmitButton>
        </form>
        </Card>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}