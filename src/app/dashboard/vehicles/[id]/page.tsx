'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import type { Vehicle, VehicleTrip } from '@/lib/services';
import type { Employee } from '@/types';
import { getVehicle } from '@/lib/services/vehicles';
import { listVehicleTrips } from '@/lib/services/vehicle-trips';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';
import Link from 'next/link';
import { Edit, Plus } from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vehicleDoc = await getVehicle(vehicleId);
        setVehicle(vehicleDoc);

        const tripsRes = await listVehicleTrips([
          Query.equal('vehicleId', vehicleId),
          Query.orderDesc('departureTime'),
          Query.limit(50),
        ]);
        setTrips(tripsRes.documents);

        // جلب أسماء الموظفين (السائقين والمرافقين)
        const employeeIds = new Set<string>();
        tripsRes.documents.forEach((t: VehicleTrip) => {
          if (t.driverId) employeeIds.add(t.driverId);
          if (t.companionId) employeeIds.add(t.companionId);
        });
        if (employeeIds.size > 0) {
          const empRes = await listEmployees([
            Query.equal('$id', Array.from(employeeIds)),
            Query.limit(100),
          ]);
          const map: Record<string, string> = {};
          empRes.documents.forEach((emp: Employee) => (map[emp.$id] = emp.name));
          setEmployeesMap(map);
        }
      } catch {
        toast.error('فشل تحميل بيانات المركبة');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vehicleId]);

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!vehicle) return <AuthGuard><DashboardLayout><p className="text-center p-10 text-danger">المركبة غير موجودة</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* بطاقة بيانات المركبة */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{vehicle.plateNumber}</h1>
                <p className="text-concrete-500">{vehicle.brand} {vehicle.model}</p>
              </div>
              <Link href={`/dashboard/vehicles/${vehicle.$id}/edit`} className="text-petrol hover:underline flex items-center gap-1">
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-concrete-500">النوع:</span> {vehicle.type || '-'}</div>
              <div><span className="text-concrete-500">اللون:</span> {vehicle.color || '-'}</div>
              <div><span className="text-concrete-500">السنة:</span> {vehicle.year || '-'}</div>
              <div><span className="text-concrete-500">الحالة:</span> <Badge status={vehicle.status} /></div>
            </div>
          </Card>

          {/* سجل الرحلات */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">سجل الرحلات</h2>
              <Link
                href={`/dashboard/vehicles/${vehicle.$id}/trips/new`}
                className="bg-petrol text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
              >
                <Plus size={16} /> رحلة جديدة
              </Link>
            </div>
            {trips.length === 0 ? (
              <p className="text-concrete-500">لا توجد رحلات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-concrete-50 border-b">
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">التاريخ والوقت</th>
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">السائق</th>
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المرافق</th>
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الوجهة</th>
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الغرض</th>
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">العداد</th>
                      <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th>
                      <th className="p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip.$id} className="border-b">
                        <td className="p-3">{trip.departureTime}</td>
                        <td className="p-3">{employeesMap[trip.driverId] || trip.driverId}</td>
                        <td className="p-3">{trip.companionId ? (employeesMap[trip.companionId] || trip.companionId) : '-'}</td>
                        <td className="p-3">{trip.destination || '-'}</td>
                        <td className="p-3">{trip.purpose || '-'}</td>
                        <td className="p-3">
                          {trip.startMileage ? `${trip.startMileage}${trip.endMileage ? ` → ${trip.endMileage}` : ''}` : '-'}
                        </td>
                        <td className="p-3"><Badge status={trip.status} size="sm" /></td>
                        <td className="p-3">
                          <Link
                            href={`/dashboard/vehicles/${vehicle.$id}/trips/${trip.$id}/edit`}
                            className="text-petrol hover:underline text-sm"
                          >
                            تعديل
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}