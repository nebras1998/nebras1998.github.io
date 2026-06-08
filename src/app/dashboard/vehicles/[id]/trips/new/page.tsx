'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, EMPLOYEES_COLLECTION_ID, VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';

export default function NewTripPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const [employees, setEmployees] = useState<any[]>([]);
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
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.equal('status', 'يعمل'), Query.limit(200)]),
          databases.getDocument(DATABASE_ID, VEHICLES_COLLECTION_ID, vehicleId),
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
      await databases.createDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, 'unique()', {
        ...form,
        startMileage: parseInt(form.startMileage) || 0,
      });
      toast.success('تم بدء الرحلة');
      router.push(`/dashboard/vehicles/${vehicleId}`);
    } catch (err: any) { toast.error('خطأ: ' + err.message); setLoading(false); }
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
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">{loading ? 'جارٍ البدء...' : 'بدء الرحلة'}</button>
        </form>
      </div>
    </DashboardLayout></AuthGuard>
  );
}