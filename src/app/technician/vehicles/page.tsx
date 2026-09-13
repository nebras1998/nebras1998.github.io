'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import type { VehicleTrip, Vehicle } from '@/lib/services';
import { listVehicleTrips } from '@/lib/services/vehicle-trips';
import { listVehicles } from '@/lib/services/vehicles';
import { Query } from '@/lib/services';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, ArrowRight, Car } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import Card from '@/components/Card';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';

export default function TechnicianVehiclesPage() {
  const { employee } = useAuthStore();
  const [activeTrips, setActiveTrips] = useState<VehicleTrip[]>([]);
  const [pastTrips, setPastTrips] = useState<VehicleTrip[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    const fetchTrips = async () => {
      try {
        // جلب جميع رحلات الفني الحالي كسائق
        const driverTrips = await listVehicleTrips([
          Query.equal('driverId', employee.$id),
          Query.orderDesc('departureTime'),
          Query.limit(50),
        ]);

        const allTrips = driverTrips.documents;
        
        // فصل الرحلات النشطة عن المكتملة
        const active = allTrips.filter((t: VehicleTrip) => t.status === 'قيد الرحلة');
        const completed = allTrips.filter((t: VehicleTrip) => t.status === 'مكتملة');
        
        setActiveTrips(active);
        setPastTrips(completed);

        // جلب أرقام لوحات المركبات
        const vehicleIds = [...new Set(allTrips.map((t: VehicleTrip) => t.vehicleId))];
        if (vehicleIds.length > 0) {
          const vRes = await listVehicles([
            Query.equal('$id', vehicleIds),
            Query.limit(50),
          ]);
          const vMap: Record<string, string> = {};
          vRes.documents.forEach((v: Vehicle) => (vMap[v.$id] = v.plateNumber));
          setVehiclesMap(vMap);
        }
      } catch {
        toast.error('فشل تحميل الرحلات');
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [employee]);

  if (loading) return (
    <div className="min-h-screen bg-surface-dim p-4" dir="rtl">
      <TableSkeleton rows={5} cols={3} />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 shadow">
        <h1 className="text-lg font-bold">المركبات والرحلات</h1>
      </header>

      <main className="p-4 space-y-6">
        {/* زر بدء رحلة جديدة */}
        <Link
          href="/technician/vehicles/new"
          className="bg-primary text-white p-5 rounded-2xl shadow flex items-center justify-center gap-3 font-bold text-lg hover:from-primary-dark hover:to-primary active:scale-95 transition-transform"
        >
          <Plus size={24} /> بدء رحلة جديدة
        </Link>

        {/* الرحلات النشطة */}
        <section>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2 text-warning">
            <Car size={22} /> رحلات قيد التنفيذ
          </h2>
          {activeTrips.length === 0 ? (
            <EmptyData title="لا توجد رحلات نشطة" />
          ) : (
            <div className="space-y-3">
              {activeTrips.map((trip) => (
                <Link
                  key={trip.$id}
                  href={`/technician/vehicles/${trip.$id}/edit`}
                  className="block bg-warning-bg border border-warning-bg p-5 rounded-2xl hover:shadow-md active:scale-[0.98] transition-transform"
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{vehiclesMap[trip.vehicleId] || 'مركبة'}</p>
                      <p className="text-sm text-text-muted">{trip.destination || 'بدون وجهة'}</p>
                      <p className="text-xs text-text-muted">انطلاق: {trip.departureTime}</p>
                    </div>
                    <ArrowRight size={24} className="text-warning" />
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
            <EmptyData title="لا توجد رحلات سابقة" />
          ) : (
            <div className="space-y-2">
              {pastTrips.slice(0, 5).map((trip) => (
                <Card key={trip.$id}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-base">{vehiclesMap[trip.vehicleId] || 'مركبة'}</span>
                    <span className="text-sm text-text-muted">{trip.destination || '-'}</span>
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {trip.departureTime} {trip.returnTime ? `→ ${trip.returnTime}` : ''}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}