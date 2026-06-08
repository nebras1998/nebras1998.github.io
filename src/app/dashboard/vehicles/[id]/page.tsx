'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  VEHICLES_COLLECTION_ID,
  VEHICLE_TRIPS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import Link from 'next/link';
import { Edit, Plus } from 'lucide-react';

export default function VehicleDetailPage() {
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vehicleDoc = await databases.getDocument(DATABASE_ID, VEHICLES_COLLECTION_ID, vehicleId);
        setVehicle(vehicleDoc);

        const tripsRes = await databases.listDocuments(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, [
          Query.equal('vehicleId', vehicleId),
          Query.orderDesc('departureTime'),
          Query.limit(50),
        ]);
        setTrips(tripsRes.documents);

        // جلب أسماء الموظفين (السائقين والمرافقين)
        const employeeIds = new Set<string>();
        tripsRes.documents.forEach((t: any) => {
          if (t.driverId) employeeIds.add(t.driverId);
          if (t.companionId) employeeIds.add(t.companionId);
        });
        if (employeeIds.size > 0) {
          const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
            Query.equal('$id', Array.from(employeeIds)),
            Query.limit(100),
          ]);
          const map: Record<string, string> = {};
          empRes.documents.forEach((emp: any) => (map[emp.$id] = emp.name));
          setEmployeesMap(map);
        }
      } catch (err: any) {
        toast.error('فشل تحميل بيانات المركبة');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vehicleId]);

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!vehicle) return <AuthGuard><DashboardLayout><p className="text-center p-10 text-red-500">المركبة غير موجودة</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* بطاقة بيانات المركبة */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{vehicle.plateNumber}</h1>
                <p className="text-gray-500">{vehicle.brand} {vehicle.model}</p>
              </div>
              <Link href={`/dashboard/vehicles/${vehicle.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1">
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">النوع:</span> {vehicle.type || '-'}</div>
              <div><span className="text-gray-500">اللون:</span> {vehicle.color || '-'}</div>
              <div><span className="text-gray-500">السنة:</span> {vehicle.year || '-'}</div>
              <div><span className="text-gray-500">الحالة:</span> {vehicle.status}</div>
            </div>
          </div>

          {/* سجل الرحلات */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">سجل الرحلات</h2>
              <Link
                href={`/dashboard/vehicles/${vehicle.$id}/trips/new`}
                className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1 text-sm"
              >
                <Plus size={16} /> رحلة جديدة
              </Link>
            </div>
            {trips.length === 0 ? (
              <p className="text-gray-400">لا توجد رحلات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 text-right">التاريخ والوقت</th>
                      <th className="p-2 text-right">السائق</th>
                      <th className="p-2 text-right">المرافق</th>
                      <th className="p-2 text-right">الوجهة</th>
                      <th className="p-2 text-right">الغرض</th>
                      <th className="p-2 text-right">العداد</th>
                      <th className="p-2 text-right">الحالة</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip.$id} className="border-b">
                        <td className="p-2">{trip.departureTime}</td>
                        <td className="p-2">{employeesMap[trip.driverId] || trip.driverId}</td>
                        <td className="p-2">{employeesMap[trip.companionId] || trip.companionId || '-'}</td>
                        <td className="p-2">{trip.destination || '-'}</td>
                        <td className="p-2">{trip.purpose || '-'}</td>
                        <td className="p-2">
                          {trip.startMileage ? `${trip.startMileage}${trip.endMileage ? ` → ${trip.endMileage}` : ''}` : '-'}
                        </td>
                        <td className="p-2">{trip.status}</td>
                        <td className="p-2">
                          <Link
                            href={`/dashboard/vehicles/${vehicle.$id}/trips/${trip.$id}/edit`}
                            className="text-blue-600 hover:underline text-sm"
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
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}