'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, ArrowRight, Car } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';

export default function TechnicianVehiclesPage() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [pastTrips, setPastTrips] = useState<any[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    const fetchTrips = async () => {
      try {
        // جلب جميع رحلات الفني الحالي كسائق
        const driverTrips = await databases.listDocuments(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, [
          Query.equal('driverId', employee.$id),
          Query.orderDesc('departureTime'),
          Query.limit(50),
        ]);

        const allTrips = driverTrips.documents;
        
        // فصل الرحلات النشطة عن المكتملة
        const active = allTrips.filter((t: any) => t.status === 'قيد الرحلة');
        const completed = allTrips.filter((t: any) => t.status === 'مكتملة');
        
        setActiveTrips(active);
        setPastTrips(completed);

        // جلب أرقام لوحات المركبات
        const vehicleIds = [...new Set(allTrips.map((t: any) => t.vehicleId))];
        if (vehicleIds.length > 0) {
          const vRes = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION_ID, [
            Query.equal('$id', vehicleIds),
            Query.limit(50),
          ]);
          const vMap: Record<string, string> = {};
          vRes.documents.forEach((v: any) => (vMap[v.$id] = v.plateNumber));
          setVehiclesMap(vMap);
        }
      } catch (err: any) {
        toast.error('فشل تحميل الرحلات');
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [employee]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <p className="text-gray-500">جارٍ التحميل...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <header className="bg-green-600 text-white p-4 shadow">
        <h1 className="text-lg font-bold">المركبات والرحلات</h1>
      </header>

      <main className="p-4 space-y-6">
        {/* زر بدء رحلة جديدة */}
        <Link
          href="/technician/vehicles/new"
          className="bg-green-600 text-white p-5 rounded-2xl shadow flex items-center justify-center gap-3 font-bold text-lg hover:bg-green-700 active:scale-95 transition-transform"
        >
          <Plus size={24} /> بدء رحلة جديدة
        </Link>

        {/* الرحلات النشطة */}
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2 text-yellow-700">
            <Car size={22} /> رحلات قيد التنفيذ
          </h2>
          {activeTrips.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-400">
              لا توجد رحلات نشطة
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrips.map((trip) => (
                <Link
                  key={trip.$id}
                  href={`/technician/vehicles/${trip.$id}/edit`}
                  className="block bg-yellow-50 border border-yellow-200 p-5 rounded-2xl hover:shadow-md active:scale-[0.98] transition-transform"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{vehiclesMap[trip.vehicleId] || 'مركبة'}</p>
                      <p className="text-sm text-gray-600">{trip.destination || 'بدون وجهة'}</p>
                      <p className="text-xs text-gray-500">انطلاق: {trip.departureTime}</p>
                    </div>
                    <ArrowRight size={24} className="text-yellow-600" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* الرحلات السابقة */}
        <section>
          <h2 className="font-bold text-lg mb-3">آخر الرحلات المكتملة</h2>
          {pastTrips.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-400">
              لا توجد رحلات سابقة
            </div>
          ) : (
            <div className="space-y-2">
              {pastTrips.slice(0, 5).map((trip) => (
                <div key={trip.$id} className="bg-white p-4 rounded-2xl shadow-sm border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-base">{vehiclesMap[trip.vehicleId] || 'مركبة'}</span>
                    <span className="text-sm text-gray-500">{trip.destination || '-'}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {trip.departureTime} {trip.returnTime ? `→ ${trip.returnTime}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}