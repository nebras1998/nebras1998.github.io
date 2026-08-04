'use client';

import { useEffect, useState } from 'react';
import { listClients, listProjects, listSamples, listTests, listInvoices, listEmployees, listVehicles, listVehicleTrips, listBookings } from '@/lib/services';
import type { Sample, Booking, DashboardStats } from '@/types';
import type { Vehicle, VehicleTrip } from '@/lib/services';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
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
  Car,
  Navigation,
  Clock,
  Calendar,
  Loader2,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import EmptyData from '@/components/EmptyData';
import TechCard from '@/components/TechCard';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
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

const COLORS = ['#0F4C5C', '#E0A526', '#2E7D5B', '#B4472C', '#7C5FA6'];

interface TechStatsItem {
  id: string;
  name: string;
  totalTests: number;
  completed: number;
  pending: number;
  samplesCount: number;
  progress: number;
  todaySampled: number;
  todayPrepared: number;
  todayDelivered: number;
}

type BusyVehicle = VehicleTrip & { driverName: string; vehiclePlate: string; };

export default function DashboardPage() {
  const [basicStats, setBasicStats] = useState({
    clients: 0,
    activeProjects: 0,
    todaySamples: 0,
    pendingTests: 0,
    unpaidInvoices: 0,
    totalRevenue: 0,
    readyVehicles: 0,
    vehiclesInUse: 0,
    todayBookings: 0,
  });
  const [basicLoading, setBasicLoading] = useState(true);

  const [samplesByType, setSamplesByType] = useState<{ name: string; value: number }[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<{ day: string; count: number }[]>([]);
  const [recentSamples, setRecentSamples] = useState<Sample[]>([]);
  const [techStats, setTechStats] = useState<TechStatsItem[]>([]);
  const [availableVehiclesList, setAvailableVehiclesList] = useState<Vehicle[]>([]);
  const [busyVehiclesList, setBusyVehiclesList] = useState<BusyVehicle[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<Sample[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [advancedLoading, setAdvancedLoading] = useState(true);

  // بيانات وسيطة لتغذية الأقسام الأخرى
  const [activeTripsData, setActiveTripsData] = useState<VehicleTrip[]>([]);
  const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);

  // --- تحميل البيانات الأساسية ---
  useEffect(() => {
    const fetchBasic = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [
          clientsRes,
          activeProjectsRes,
          todaySamplesRes,
          pendingTestsRes,
          unpaidInvoicesRes,
          statsRes,
          vehiclesRes,
          activeTripsRes,
          todayBookingsRes,
        ] = await Promise.all([
          listClients([Query.limit(1)]),
          listProjects([Query.equal('status', 'نشط'), Query.limit(1)]),
          listSamples([Query.equal('samplingDate', today), Query.limit(1)]),
          listTests([Query.equal('status', 'قيد الانتظار'), Query.limit(1)]),
          listInvoices([Query.equal('status', 'صادرة'), Query.limit(1)]),
          fetch('/api/dashboard-stats'),
          listVehicles([Query.limit(100)]),
          listVehicleTrips([Query.equal('status', 'قيد الرحلة'), Query.limit(20)]),
          listBookings([Query.equal('preferredDate', today), Query.limit(1)]),
        ]);

        if (!statsRes.ok) throw new Error('فشل تحميل إحصائيات لوحة التحكم');
        const stats: DashboardStats = await statsRes.json();

        const inUse = activeTripsRes.documents.length;
        const readyVehicles = vehiclesRes.documents.filter((v) => v.status === 'جاهزة').length;

        setBasicStats({
          clients: clientsRes.total,
          activeProjects: activeProjectsRes.total,
          todaySamples: todaySamplesRes.total,
          pendingTests: pendingTestsRes.total,
          unpaidInvoices: unpaidInvoicesRes.total,
          totalRevenue: stats.totalRevenue,
          readyVehicles,
          vehiclesInUse: inUse,
          todayBookings: todayBookingsRes.total,
        });

        // توزيع العينات حسب النوع والإيرادات الشهرية تُحسب مرة واحدة على الخادم
        setSamplesByType(stats.samplesByType);
        setMonthlyRevenue(stats.monthlyRevenue);

        // تخزين البيانات الوسيطة
        setActiveTripsData(activeTripsRes.documents);
        setVehiclesData(vehiclesRes.documents);
      } catch (err) {
        console.error('خطأ في تحميل الإحصائيات الأساسية:', err);
      } finally {
        setBasicLoading(false);
      }
    };
    fetchBasic();
  }, []);

  // --- تحميل البيانات التكميلية ---
  useEffect(() => {
    const fetchAdvanced = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const d2 = new Date(); d2.setDate(d2.getDate() + 2);
        const twoDaysLater = d2.toISOString().split('T')[0];

        const [
          allSamplesRes,
          recentSamplesRes,
          allTestsRes,
          employeesRes,
          upcomingRes,
          recentBookingsRes,
        ] = await Promise.all([
          listSamples([Query.limit(500), Query.select(['type', 'samplerId', 'preparerId', 'transporterId', 'samplingDate', 'preparationDate', 'deliveryDate'])]),
          listSamples([Query.orderDesc('$createdAt'), Query.limit(5)]),
          listTests([Query.limit(1000), Query.select(['assignedTo', 'status', 'sampleId', '$createdAt'])]),
          listEmployees([Query.equal('role', 'فني'), Query.equal('status', 'يعمل'), Query.limit(200)]),
          listSamples([
            Query.or([
              Query.and([Query.greaterThanEqual('test7DaysDate', today), Query.lessThanEqual('test7DaysDate', twoDaysLater)]),
              Query.and([Query.greaterThanEqual('test28DaysDate', today), Query.lessThanEqual('test28DaysDate', twoDaysLater)]),
            ]),
            Query.limit(10),
          ]),
          listBookings([Query.orderDesc('$createdAt'), Query.limit(5)]),
        ]);

        // العينات الأخيرة
        setRecentSamples(recentSamplesRes.documents);

        // الفحوصات الأسبوعية
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d.toISOString().split('T')[0]);
        }
        setWeeklyTests(days.map(day => ({
          day: day.slice(5),
          count: allTestsRes.documents.filter((t) => t.$createdAt?.startsWith(day)).length,
        })));

        // إحصائيات الفنيين
        const techs = employeesRes.documents;
        const techStatsData = techs.map((tech) => {
          const techTests = allTestsRes.documents.filter((t) => t.assignedTo === tech.$id);
          const completed = techTests.filter((t) => t.status === 'مكتمل').length;
          const pending = techTests.filter((t) => t.status === 'قيد الانتظار' || t.status === 'تحت الفحص').length;
          const sampleIds = [...new Set(techTests.map((t) => t.sampleId).filter(Boolean))];
          const todaySampled = allSamplesRes.documents.filter((s) => s.samplerId === tech.$id && s.samplingDate === today).length;
          const todayPrepared = allSamplesRes.documents.filter((s) => s.preparerId === tech.$id && s.preparationDate === today).length;
          const todayDelivered = allSamplesRes.documents.filter((s) => s.transporterId === tech.$id && s.deliveryDate === today).length;
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

        setUpcomingTests(upcomingRes.documents);
        setRecentBookings(recentBookingsRes.documents);

        // تجهيز حالة المركبات
        const activeVehicleIds = activeTripsData.map((t) => t.vehicleId);
        const availableVehicles = vehiclesData.filter(
          (v) => v.status === 'جاهزة' && !activeVehicleIds.includes(v.$id)
        );
        setAvailableVehiclesList(availableVehicles);

        const driversMap: Record<string, string> = {};
        const vehiclesMap: Record<string, string> = {};
        if (activeTripsData.length > 0) {
          const driverIds = [...new Set(activeTripsData.map((t) => t.driverId))];
          const vehicleIdsForTrips = [...new Set(activeTripsData.map((t) => t.vehicleId))];
          if (driverIds.length > 0) {
            const driversRes = await listEmployees([
              Query.equal('$id', driverIds),
              Query.limit(50),
            ]);
            driversRes.documents.forEach((emp) => (driversMap[emp.$id] = emp.name));
          }
          if (vehicleIdsForTrips.length > 0) {
            const vehiclesForTripsRes = await listVehicles([
              Query.equal('$id', vehicleIdsForTrips),
              Query.limit(50),
            ]);
            vehiclesForTripsRes.documents.forEach((v) => (vehiclesMap[v.$id] = v.plateNumber));
          }
        }
        const busyVehicles = activeTripsData.map((trip) => ({
          ...trip,
          driverName: driversMap[trip.driverId] || trip.driverId,
          vehiclePlate: vehiclesMap[trip.vehicleId] || trip.vehicleId,
        }));
        setBusyVehiclesList(busyVehicles);
      } catch (err) {
        console.error('خطأ في تحميل البيانات التكميلية:', err);
      } finally {
        setAdvancedLoading(false);
      }
    };
    fetchAdvanced();
  }, [activeTripsData, vehiclesData]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-concrete-800">لوحة التحكم</h1>
              <p className="text-concrete-500">مرحباً بك، إليك ملخص اليوم</p>
            </div>
            <div className="text-sm text-concrete-500">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* البطاقات الإحصائية الأساسية */}
          {basicLoading ? (
            <div className="text-center py-10"><Loader2 size={32} className="animate-spin mx-auto text-petrol" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
              <StatCard title="العملاء" value={basicStats.clients} icon={<Users size={24} />} bgColor="bg-petrol-soft" iconColor="text-petrol" />
              <StatCard title="مشاريع نشطة" value={basicStats.activeProjects} icon={<FolderKanban size={24} />} bgColor="bg-success-bg" iconColor="text-petrol" />
              <StatCard title="عينات اليوم" value={basicStats.todaySamples} icon={<Hammer size={24} />} bgColor="bg-warning-bg" iconColor="text-warning" />
              <StatCard title="فحوصات معلقة" value={basicStats.pendingTests} icon={<AlertCircle size={24} />} bgColor="bg-danger-bg" iconColor="text-danger" />
              <StatCard title="فواتير غير مدفوعة" value={basicStats.unpaidInvoices} icon={<FileText size={24} />} bgColor="bg-warning-bg" iconColor="text-warning" />
              <StatCard title="إجمالي الإيرادات" value={`${basicStats.totalRevenue.toFixed(0)} ₪`} icon={<Banknote size={24} />} bgColor="bg-success-bg" iconColor="text-success" />
              <StatCard title="مركبات جاهزة" value={basicStats.readyVehicles} icon={<Car size={24} />} bgColor="bg-petrol-soft" iconColor="text-petrol" />
              <StatCard title="مركبات بالخارج" value={basicStats.vehiclesInUse} icon={<Navigation size={24} />} bgColor="bg-warning-bg" iconColor="text-warning" />
              <StatCard title="حجوزات اليوم" value={basicStats.todayBookings} icon={<Calendar size={24} />} bgColor="bg-petrol-soft" iconColor="text-petrol" />
            </div>
          )}

          {/* الأقسام التكميلية */}
          {advancedLoading ? (
            <div className="text-center py-10 text-concrete-500">جارٍ تحميل باقي الأقسام...</div>
          ) : (
            <>
              {/* الرسوم البيانية */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="توزيع العينات حسب النوع" icon={<FlaskConical size={20} className="text-petrol" />}>
                  {samplesByType.length === 0 ? <EmptyData /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={samplesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" paddingAngle={3}>
                          {samplesByType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex flex-wrap gap-3 mt-4">
                    {samplesByType.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-1 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-concrete-500">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                <ChartCard title="الإيرادات الشهرية" icon={<TrendingUp size={20} className="text-petrol" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#0F4C5C" radius={[4, 4, 0, 0]} name="الإيرادات (₪)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="الفحوصات اليومية (آخر 7 أيام)" icon={<ClipboardCheck size={20} className="text-petrol" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={weeklyTests}>
                      <defs>
                        <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F4C5C" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0F4C5C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#0F4C5C" fill="url(#colorTests)" name="عدد الفحوصات" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* فحوصات مقبلة */}
              {upcomingTests.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-warning">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-warning"><Clock size={20} /> فحوصات مقبلة (خلال يومين)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {upcomingTests.map((sample) => (
                      <div key={sample.$id} className="bg-warning-bg p-3 rounded-lg border border-warning">
                        <p className="font-mono font-bold">{sample.sampleNumber}</p>
                        <p className="text-sm text-concrete-500">{sample.type}</p>
                        <div className="text-xs mt-1 space-y-1">
                          {sample.test7DaysDate && sample.test7DaysDate >= new Date().toISOString().split('T')[0] && <p>🔬 7 أيام: {sample.test7DaysDate}</p>}
                          {sample.test28DaysDate && sample.test28DaysDate >= new Date().toISOString().split('T')[0] && <p>🔬 28 يوم: {sample.test28DaysDate}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* حالة المركبات */}
              <Card>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Car size={20} className="text-petrol" /> حالة المركبات</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-success mb-3 flex items-center gap-2"><Car size={18} /> متوفرة ({availableVehiclesList.length})</h3>
                    {availableVehiclesList.length === 0 ? <p className="text-concrete-500">لا توجد مركبات متوفرة</p> : (
                      <div className="space-y-2">
                        {availableVehiclesList.map((v) => (
                          <div key={v.$id} className="flex justify-between items-center bg-success-bg p-3 rounded-lg">
                            <span className="font-mono">{v.plateNumber}</span>
                            <span className="text-sm text-concrete-500">{v.brand} {v.model}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-warning mb-3 flex items-center gap-2"><Navigation size={18} /> بالخارج ({busyVehiclesList.length})</h3>
                    {busyVehiclesList.length === 0 ? <p className="text-concrete-500">لا توجد رحلات نشطة</p> : (
                      <div className="space-y-2">
                        {busyVehiclesList.map((trip) => (
                          <div key={trip.$id} className="bg-warning-bg p-3 rounded-lg">
                            <div className="flex justify-between">
                              <span className="font-mono font-bold">{trip.vehiclePlate}</span>
                              <span className="text-xs text-concrete-500">{trip.departureTime}</span>
                            </div>
                            <div className="text-sm mt-1">
                              <span>{trip.driverName}</span>
                              {trip.destination && <span className="text-concrete-500"> - {trip.destination}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* قسم الفنيين */}
              {techStats.length > 0 && (
                <Card>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><UserCheck size={20} className="text-petrol" /> أداء الفنيين اليوم</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {techStats.map((tech) => (
                      <TechCard key={tech.id} tech={tech} />
                    ))}
                  </div>
                </Card>
              )}

              {/* آخر الحجوزات */}
              {recentBookings.length > 0 && (
                <Card>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar size={20} className="text-petrol" /> آخر الحجوزات</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.$id} className="bg-petrol-soft rounded-lg p-4 border border-concrete-200 hover:shadow-md transition-shadow">
                        <p className="font-mono text-sm text-concrete-800">{booking.bookingNumber}</p>
                        <p className="text-sm font-bold mt-1">{booking.clientName}</p>
                        <p className="text-xs text-concrete-500">{booking.sampleType}</p>
                        <div className="flex justify-between items-center mt-3">
                          <Badge status={booking.status} size="sm" />
                          <span className="text-xs text-concrete-500">{booking.preferredDate || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* آخر العينات */}
              <Card>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FlaskConical size={20} className="text-warning" /> آخر العينات المضافة</h2>
                {recentSamples.length === 0 ? <EmptyData /> : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {recentSamples.map((sample) => (
                      <div key={sample.$id} className="bg-concrete-50 rounded-lg p-4 border border-concrete-200 hover:shadow-md transition-shadow">
                        <p className="font-mono text-sm text-concrete-800">{sample.sampleNumber}</p>
                        <p className="text-xs text-concrete-500 mt-1">{sample.type}</p>
                        <div className="flex justify-between items-center mt-3">
                          <Badge status={sample.status} size="sm" />
                          <span className="text-xs text-concrete-500">{sample.samplingDate || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

