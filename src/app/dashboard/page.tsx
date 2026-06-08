'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  CLIENTS_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  TESTS_COLLECTION_ID,
  INVOICES_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  VEHICLES_COLLECTION_ID,
  VEHICLE_TRIPS_COLLECTION_ID,
} from '@/lib/constants';
import {
  Users,
  FolderKanban,
  FlaskConical,
  ClipboardCheck,
  FileText,
  Banknote,
  TrendingUp,
  AlertCircle,
  UserCheck,
  Hammer,
  Truck,
  FlaskRound,
  Car,
  Navigation,
  Clock,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    clients: 0,
    activeProjects: 0,
    todaySamples: 0,
    pendingTests: 0,
    unpaidInvoices: 0,
    totalRevenue: 0,
    readyVehicles: 0,
    vehiclesInUse: 0,
  });
  const [samplesByType, setSamplesByType] = useState<{ name: string; value: number }[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<{ day: string; count: number }[]>([]);
  const [recentSamples, setRecentSamples] = useState<any[]>([]);
  const [techStats, setTechStats] = useState<any[]>([]);
  const [availableVehiclesList, setAvailableVehiclesList] = useState<any[]>([]);
  const [busyVehiclesList, setBusyVehiclesList] = useState<any[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const d2 = new Date(); d2.setDate(d2.getDate() + 2);
        const twoDaysLater = d2.toISOString().split('T')[0];

        const [
          clientsRes,
          activeProjectsRes,
          todaySamplesRes,
          pendingTestsRes,
          allSamplesRes,
          recentSamplesRes,
          unpaidInvoicesRes,
          allInvoicesRes,
          allTestsRes,
          employeesRes,
          vehiclesRes,
          activeTripsRes,
          upcomingRes,
        ] = await Promise.all([
          databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(1)]),
          databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [Query.equal('status', 'نشط'), Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.equal('samplingDate', today), Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [Query.equal('status', 'قيد الانتظار'), Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.limit(500)]),
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.orderDesc('$createdAt'), Query.limit(5)]),
          databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [Query.equal('status', 'صادرة'), Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [Query.limit(500)]),
          databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [Query.limit(1000)]),
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.equal('role', 'فني'), Query.equal('status', 'يعمل'), Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION_ID, [Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, VEHICLE_TRIPS_COLLECTION_ID, [Query.equal('status', 'قيد الرحلة'), Query.limit(20)]),
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [
            Query.or([
              Query.and([Query.greaterThanEqual('test7DaysDate', today), Query.lessThanEqual('test7DaysDate', twoDaysLater)]),
              Query.and([Query.greaterThanEqual('test28DaysDate', today), Query.lessThanEqual('test28DaysDate', twoDaysLater)]),
            ]),
            Query.limit(10),
          ]),
        ]);

        const revenue = allInvoicesRes.documents.reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0);
        const activeTrips = activeTripsRes.documents;
        const inUse = activeTrips.length;
        const readyVehicles = vehiclesRes.documents.filter((v: any) => v.status === 'جاهزة').length;

        setStats({
          clients: clientsRes.total,
          activeProjects: activeProjectsRes.total,
          todaySamples: todaySamplesRes.total,
          pendingTests: pendingTestsRes.total,
          unpaidInvoices: unpaidInvoicesRes.total,
          totalRevenue: revenue,
          readyVehicles,
          vehiclesInUse: inUse,
        });

        // تجميع الإيرادات حسب الشهر
        const monthly: Record<string, number> = {};
        allInvoicesRes.documents.forEach((inv: any) => {
          if (inv.issueDate) {
            const [y, m] = inv.issueDate.split('-');
            const key = `${y}-${m}`;
            monthly[key] = (monthly[key] || 0) + (inv.paidAmount || 0);
          }
        });
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const currentYear = new Date().getFullYear().toString();
        const monthlyData = months.map(m => ({ month: m, revenue: monthly[`${currentYear}-${m}`] || 0 }));
        setMonthlyRevenue(monthlyData);

        // الفحوصات الأسبوعية
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d.toISOString().split('T')[0]);
        }
        const weeklyData = days.map(day => {
          const count = allTestsRes.documents.filter((t: any) => t.$createdAt?.startsWith(day)).length;
          return { day: day.slice(5), count };
        });
        setWeeklyTests(weeklyData);

        // توزيع العينات حسب النوع
        const typeCount: Record<string, number> = {};
        allSamplesRes.documents.forEach((s: any) => {
          typeCount[s.type] = (typeCount[s.type] || 0) + 1;
        });
        const chartData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));
        setSamplesByType(chartData);
        setRecentSamples(recentSamplesRes.documents);

        // إحصائيات الفنيين
        const techs = employeesRes.documents;
        const techStatsData = techs.map((tech: any) => {
          const techTests = allTestsRes.documents.filter((t: any) => t.assignedTo === tech.$id);
          const completed = techTests.filter((t: any) => t.status === 'مكتمل').length;
          const pending = techTests.filter((t: any) => t.status === 'قيد الانتظار' || t.status === 'تحت الفحص').length;
          const sampleIds = [...new Set(techTests.map((t: any) => t.sampleId).filter(Boolean))];
          const todaySampled = allSamplesRes.documents.filter((s: any) => s.samplerId === tech.$id && s.samplingDate === today).length;
          const todayPrepared = allSamplesRes.documents.filter((s: any) => s.preparerId === tech.$id && s.preparationDate === today).length;
          const todayDelivered = allSamplesRes.documents.filter((s: any) => s.transporterId === tech.$id && s.deliveryDate === today).length;
          return {
            id: tech.$id,
            name: tech.name,
            totalTests: techTests.length,
            completed,
            pending,
            samplesCount: sampleIds.length,
            progress: techTests.length > 0 ? Math.round((completed / techTests.length) * 100) : 0,
            todaySampled,
            todayPrepared,
            todayDelivered,
          };
        });
        setTechStats(techStatsData);

        // تجهيز بيانات المركبات
        const activeVehicleIds = activeTrips.map((t: any) => t.vehicleId);
        const availableVehicles = vehiclesRes.documents.filter(
          (v: any) => v.status === 'جاهزة' && !activeVehicleIds.includes(v.$id)
        );

        const driversMap: Record<string, string> = {};
        const vehiclesMap: Record<string, string> = {};

        if (activeTrips.length > 0) {
          const driverIds = [...new Set(activeTrips.map((t: any) => t.driverId))];
          const vehicleIdsForTrips = [...new Set(activeTrips.map((t: any) => t.vehicleId))];

          if (driverIds.length > 0) {
            const driversRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
              Query.equal('$id', driverIds),
              Query.limit(50),
            ]);
            driversRes.documents.forEach((emp: any) => (driversMap[emp.$id] = emp.name));
          }
          if (vehicleIdsForTrips.length > 0) {
            const vehiclesForTripsRes = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION_ID, [
              Query.equal('$id', vehicleIdsForTrips),
              Query.limit(50),
            ]);
            vehiclesForTripsRes.documents.forEach((v: any) => (vehiclesMap[v.$id] = v.plateNumber));
          }
        }

        const busyVehicles = activeTrips.map((trip: any) => ({
          ...trip,
          driverName: driversMap[trip.driverId] || trip.driverId,
          vehiclePlate: vehiclesMap[trip.vehicleId] || trip.vehicleId,
        }));

        setAvailableVehiclesList(availableVehicles);
        setBusyVehiclesList(busyVehicles);
        setUpcomingTests(upcomingRes.documents);
      } catch (err) {
        console.error('خطأ في تحميل الإحصائيات:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AuthGuard>
      <DashboardLayout>
        {loading ? (
          <div className="text-center p-10 text-gray-500">جارٍ تحميل لوحة التحكم...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم</h1>
                <p className="text-gray-500">مرحباً بك، إليك ملخص اليوم</p>
              </div>
              <div className="text-sm text-gray-400">
                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* البطاقات الإحصائية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              <StatCard title="العملاء" value={stats.clients} icon={<Users size={24} />} color="from-blue-500 to-blue-600" bgColor="bg-blue-50" iconColor="text-blue-600" />
              <StatCard title="مشاريع نشطة" value={stats.activeProjects} icon={<FolderKanban size={24} />} color="from-green-500 to-green-600" bgColor="bg-green-50" iconColor="text-green-600" />
              <StatCard title="عينات اليوم" value={stats.todaySamples} icon={<Hammer size={24} />} color="from-orange-500 to-orange-600" bgColor="bg-orange-50" iconColor="text-orange-600" />
              <StatCard title="فحوصات معلقة" value={stats.pendingTests} icon={<AlertCircle size={24} />} color="from-red-500 to-red-600" bgColor="bg-red-50" iconColor="text-red-600" />
              <StatCard title="فواتير غير مدفوعة" value={stats.unpaidInvoices} icon={<FileText size={24} />} color="from-yellow-500 to-yellow-600" bgColor="bg-yellow-50" iconColor="text-yellow-600" />
              <StatCard title="إجمالي الإيرادات" value={`${stats.totalRevenue.toFixed(0)} ₪`} icon={<Banknote size={24} />} color="from-emerald-500 to-emerald-600" bgColor="bg-emerald-50" iconColor="text-emerald-600" />
              <StatCard title="مركبات جاهزة" value={stats.readyVehicles} icon={<Car size={24} />} color="from-indigo-500 to-indigo-600" bgColor="bg-indigo-50" iconColor="text-indigo-600" />
              <StatCard title="مركبات بالخارج" value={stats.vehiclesInUse} icon={<Navigation size={24} />} color="from-amber-500 to-amber-600" bgColor="bg-amber-50" iconColor="text-amber-600" />
            </div>

            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FlaskConical size={20} className="text-blue-500" />
                  توزيع العينات حسب النوع
                </h2>
                {samplesByType.length === 0 ? (
                  <p className="text-gray-400 text-center py-10">لا توجد بيانات</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={samplesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" paddingAngle={3}>
                        {samplesByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="flex flex-wrap gap-3 mt-4">
                  {samplesByType.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-1 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-500" />
                  الإيرادات الشهرية
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="الإيرادات (₪)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-purple-500" />
                  الفحوصات اليومية (آخر 7 أيام)
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={weeklyTests}>
                    <defs>
                      <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#colorTests)" name="عدد الفحوصات" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* فحوصات مقبلة */}
            {upcomingTests.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-700">
                  <Clock size={20} /> فحوصات مقبلة (خلال يومين)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {upcomingTests.map((sample: any) => (
                    <div key={sample.$id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="font-mono font-bold">{sample.sampleNumber}</p>
                      <p className="text-sm text-gray-600">{sample.type}</p>
                      <div className="text-xs mt-1 space-y-1">
                        {sample.test7DaysDate && sample.test7DaysDate >= new Date().toISOString().split('T')[0] && (
                          <p>🔬 7 أيام: {sample.test7DaysDate}</p>
                        )}
                        {sample.test28DaysDate && sample.test28DaysDate >= new Date().toISOString().split('T')[0] && (
                          <p>🔬 28 يوم: {sample.test28DaysDate}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* حالة المركبات */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Car size={20} className="text-indigo-500" />
                حالة المركبات
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                    <Car size={18} /> متوفرة ({availableVehiclesList.length})
                  </h3>
                  {availableVehiclesList.length === 0 ? (
                    <p className="text-gray-400">لا توجد مركبات متوفرة</p>
                  ) : (
                    <div className="space-y-2">
                      {availableVehiclesList.map((v) => (
                        <div key={v.$id} className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                          <span className="font-mono">{v.plateNumber}</span>
                          <span className="text-sm text-gray-500">{v.brand} {v.model}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                    <Navigation size={18} /> بالخارج ({busyVehiclesList.length})
                  </h3>
                  {busyVehiclesList.length === 0 ? (
                    <p className="text-gray-400">لا توجد رحلات نشطة</p>
                  ) : (
                    <div className="space-y-2">
                      {busyVehiclesList.map((trip) => (
                        <div key={trip.$id} className="bg-amber-50 p-3 rounded-lg">
                          <div className="flex justify-between">
                            <span className="font-mono font-bold">{trip.vehiclePlate}</span>
                            <span className="text-xs text-gray-500">{trip.departureTime}</span>
                          </div>
                          <div className="text-sm mt-1">
                            <span>{trip.driverName}</span>
                            {trip.destination && <span className="text-gray-500"> - {trip.destination}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* قسم الفنيين */}
            {techStats.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <UserCheck size={20} className="text-indigo-500" />
                  أداء الفنيين اليوم
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {techStats.map((tech) => (
                    <div key={tech.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800">{tech.name}</h3>
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {tech.totalTests}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">مكتمل:</span><span className="font-medium text-green-600">{tech.completed}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">معلق:</span><span className="font-medium text-orange-600">{tech.pending}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">عينات:</span><span className="font-medium text-blue-600">{tech.samplesCount}</span></div>
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs text-gray-500 mb-1">إنجازات اليوم:</p>
                          <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><Hammer size={12} /> أخذ:</span><span>{tech.todaySampled}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><FlaskRound size={12} /> تحضير:</span><span>{tech.todayPrepared}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><Truck size={12} /> إحضار:</span><span>{tech.todayDelivered}</span></div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>نسبة الإنجاز</span><span>{tech.progress}%</span></div>
                          <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${tech.progress}%` }}></div></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* آخر العينات */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FlaskConical size={20} className="text-orange-500" />
                آخر العينات المضافة
              </h2>
              {recentSamples.length === 0 ? (
                <p className="text-gray-400 text-center py-10">لا توجد عينات بعد</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {recentSamples.map((sample) => (
                    <div key={sample.$id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                      <p className="font-mono text-sm text-gray-800">{sample.sampleNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">{sample.type}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-xs bg-white px-2 py-1 rounded-full border">{sample.status}</span>
                        <span className="text-xs text-gray-400">{sample.samplingDate || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}

function StatCard({ title, value, icon, color, bgColor, iconColor }: { title: string; value: number | string; icon: React.ReactNode; color: string; bgColor: string; iconColor: string }) {
  return (
    <div className={`${bgColor} rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-sm">{title}</span>
        <div className={`p-2 rounded-full bg-white shadow-sm ${iconColor}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}