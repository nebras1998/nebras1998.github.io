'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;   // لاحظ اسم المتغير
  const vehicleId = params.id as string;    // من المسار [id]
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const trip = await databases.getDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, tripId);
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
      const updateData: any = {
        returnTime: form.returnTime || null,
        endMileage: parseInt(form.endMileage) || null,
        destination: form.destination,
        purpose: form.purpose,
        notes: form.notes,
        status: form.returnTime ? 'مكتملة' : 'قيد الرحلة',
      };
      await databases.updateDocument(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, tripId, updateData);
      toast.success('تم تحديث الرحلة');
      router.push(`/dashboard/vehicles/${vehicleId}`); // العودة إلى تفاصيل المركبة
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">تعديل الرحلة</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">تاريخ ووقت الانطلاق</label>
              <input type="datetime-local" name="departureTime" value={form.departureTime} disabled className="w-full border p-2 rounded bg-gray-100" />
            </div>
            <div>
              <label className="block mb-1">تاريخ ووقت العودة</label>
              <input type="datetime-local" name="returnTime" value={form.returnTime} onChange={handleChange} className="w-full border p-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block mb-1">الوجهة</label><input name="destination" value={form.destination} onChange={handleChange} className="w-full border p-2 rounded" /></div>
              <div><label className="block mb-1">الغرض</label><input name="purpose" value={form.purpose} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block mb-1">عداد الانطلاق</label><input type="number" name="startMileage" value={form.startMileage} disabled className="w-full border p-2 rounded bg-gray-100" /></div>
              <div><label className="block mb-1">عداد العودة</label><input type="number" name="endMileage" value={form.endMileage} onChange={handleChange} className="w-full border p-2 rounded" /></div>
            </div>
            <div><label className="block mb-1">ملاحظات</label><textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" /></div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}