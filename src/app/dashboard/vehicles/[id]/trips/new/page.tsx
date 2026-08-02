'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import type { Employee } from '@/types';
import { getVehicle } from '@/lib/services/vehicles';
import { createVehicleTrip } from '@/lib/services/vehicle-trips';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';

export default function NewTripPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState('');
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
        const [empRes, vehicleDoc] = await Promise.all([
          listEmployees([Query.equal('status', 'يعمل'), Query.limit(200)]),
          getVehicle(vehicleId),
        ]);
        setEmployees(empRes.documents);
        setVehiclePlate(vehicleDoc.plateNumber);
      } catch (err) { toast.error('فشل تحميل البيانات'); }
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
      await createVehicleTrip('unique()', {
        ...form,
        startMileage: parseInt(form.startMileage) || 0,
      });
      toast.success('تم بدء الرحلة');
      router.push(`/dashboard/vehicles/${vehicleId}`);
    } catch (err: unknown) { toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err))); setLoading(false); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">بدء رحلة جديدة للمركبة {vehiclePlate}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block mb-1">تاريخ ووقت الانطلاق *</label><input type="datetime-local" name="departureTime" value={form.departureTime} onChange={handleChange} required className="w-full border p-2 rounded" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">السائق *</label><select name="driverId" value={form.driverId} onChange={handleChange} required className="w-full border p-2 rounded"><option value="">اختر السائق</option>{employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}</select></div>
            <div><label className="block mb-1">المرافق</label><select name="companionId" value={form.companionId} onChange={handleChange} className="w-full border p-2 rounded"><option value="">بدون مرافق</option>{employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1">الوجهة</label><input name="destination" value={form.destination} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="block mb-1">الغرض</label><input name="purpose" value={form.purpose} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          </div>
          <div><label className="block mb-1">قراءة العداد (الانطلاق)</label><input type="number" name="startMileage" value={form.startMileage} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <button type="submit" disabled={loading} className="w-full bg-petrol text-white py-2 rounded hover:bg-petrol-dark disabled:opacity-50">{loading ? 'جارٍ البدء...' : 'بدء الرحلة'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}