'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Plus,
  CalendarPlus,
  Receipt,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import EmptyData from '@/components/EmptyData';
import TechCard from '@/components/TechCard';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';
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

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {icon}
      <h2 className="text-sm font-bold text-concrete-500 tracking-wide">{children}</h2>
      <div className="flex-1 h-px bg-concrete-200" />
    </div>
  );
}

function SectionHeader({ title, icon, href }: { title: React.ReactNode; icon?: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-lg font-bold flex items-center gap-2">{icon}{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-petrol hover:underline flex items-center gap-1 shrink-0">
          عرض الكل <ArrowLeft size={14} />
        </Link>
      )}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-concrete-0 rounded-xl p-4 shadow-sm border border-concrete-200 animate-pulse">
      <div className="h-4 bg-concrete-200 rounded w-20 mb-3"></div>
      <div className="h-6 bg-concrete-100 rounded w-24"></div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: '/dashboard/samples/new', label: 'إضافة عينة جديدة', icon: Plus },
  { href: '/dashboard/bookings/new', label: 'حجز جديد', icon: CalendarPlus },
  { href: '/dashboard/finance/invoices/new', label: 'فاتورة جديدة', icon: Receipt },
  { href: '/dashboard/clients/new', label: 'إضافة عميل', icon: UserPlus },
];

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
  const [basicDone, setBasicDone] = useState(false);

  const [samplesByType, setSamplesByType] = useState<{ name: string; value: number }[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number }[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<{ day: string; count: number }[]>([]);
  const [recentSamples, setRecentSamples] = useState<Sample[]>([]);
  const [techStats, setTechStats] = useState<TechStatsItem[]>([]);
  const [availableVehiclesList, setAvailableVehiclesList] = useState<Vehicle[]>([]);
  const [busyVehiclesList, setBusyVehiclesList] = useState<BusyVehicle[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<Sample[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  // حالات تحميل منفصلة لكل قسم ليظهر القسم فور جاهزية بياناته
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [techLoading, setTechLoading] = useState(true);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

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
        setBasicDone(true);
      }
    };
    fetchBasic();
  }, []);

  // --- الفحوصات المقبلة (خلال يومين) ---
  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const d2 = new Date(); d2.setDate(d2.getDate() + 2);
        const twoDaysLater = d2.toISOString().split('T')[0];
        const upcomingRes = await listSamples([
          Query.or([
            Query.and([Query.greaterThanEqual('test7DaysDate', today), Query.lessThanEqual('test7DaysDate', twoDaysLater)]),
            Query.and([Query.greaterThanEqual('test28DaysDate', today), Query.lessThanEqual('test28DaysDate', twoDaysLater)]),
          ]),
          Query.limit(10),
        ]);
        setUpcomingTests(upcomingRes.documents);
      } catch (err) {
        console.error('خطأ في تحميل الفحوصات المقبلة:', err);
      } finally {
        setUpcomingLoading(false);
      }
    };
    fetchUpcoming();
  }, []);

  // --- آخر العينات ---
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const res = await listSamples([Query.orderDesc('$createdAt'), Query.limit(5)]);
        setRecentSamples(res.documents);
      } catch (err) {
        console.error('خطأ في تحميل آخر العينات:', err);
      } finally {
        setSamplesLoading(false);
      }
    };
    fetchSamples();
  }, []);

  // --- آخر الحجوزات ---
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await listBookings([Query.orderDesc('$createdAt'), Query.limit(5)]);
        setRecentBookings(res.documents);
      } catch (err) {
        console.error('خطأ في تحميل آخر الحجوزات:', err);
      } finally {
        setBookingsLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // --- إحصائيات الفنيين + الفحوصات الأسبوعية ---
  useEffect(() => {
    const fetchTech = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [
          allSamplesRes,
          allTestsRes,
          employeesRes,
        ] = await Promise.all([
          listSamples([Query.limit(500), Query.select(['type', 'samplerId', 'preparerId', 'transporterId', 'samplingDate', 'preparationDate', 'deliveryDate'])]),
          listTests([Query.limit(1000), Query.select(['assignedTo', 'status', 'sampleId', '$createdAt'])]),
          listEmployees([Query.equal('role', 'فني'), Query.equal('status', 'يعمل'), Query.limit(200)]),
        ]);

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
      } catch (err) {
        console.error('خطأ في تحميل إحصائيات الفنيين:', err);
      } finally {
        setTechLoading(false);
      }
    };
    fetchTech();
  }, []);

  // --- حالة المركبات ---
  useEffect(() => {
    if (!basicDone) return;
    const fetchVehicles = async () => {
      try {
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
        console.error('خطأ في تحميل حالة المركبات:', err);
      } finally {
        setVehiclesLoading(false);
      }
    };
    fetchVehicles();
  }, [basicDone, activeTripsData, vehiclesData]);

  const chartsLoading = basicLoading || techLoading;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-concrete-800">لوحة التحكم</h1>
              <p className="text-concrete-500">مرحباً بك، إليك ملخص اليوم</p>
            </div>
            <div className="text-sm text-concrete-500">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* شريط الإجراءات السريعة */}
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 bg-petrol text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-petrol-dark transition-colors"
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>

          {/* البطاقات الإحصائية */}
          {basicLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard title="فحوصات معلقة" value={basicStats.pendingTests} icon={<AlertCircle size={24} />} bgColor="bg-danger-bg" iconColor="text-danger" />
                <StatCard title="فواتير غير مدفوعة" value={basicStats.unpaidInvoices} icon={<FileText size={24} />} bgColor="bg-warning-bg" iconColor="text-warning" />
                <StatCard title="إجمالي الإيرادات" value={`${basicStats.totalRevenue.toFixed(0)} ₪`} icon={<Banknote size={24} />} bgColor="bg-success-bg" iconColor="text-success" valueClass="whitespace-nowrap" />
                <StatCard title="عينات اليوم" value={basicStats.todaySamples} icon={<Hammer size={24} />} bgColor="bg-warning-bg" iconColor="text-warning" />
                <StatCard title="مشاريع نشطة" value={basicStats.activeProjects} icon={<FolderKanban size={24} />} bgColor="bg-success-bg" iconColor="text-petrol" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard size="sm" title="مركبات جاهزة" value={basicStats.readyVehicles} icon={<Car size={18} />} bgColor="bg-petrol-soft" iconColor="text-petrol" />
                <StatCard size="sm" title="مركبات بالخارج" value={basicStats.vehiclesInUse} icon={<Navigation size={18} />} bgColor="bg-warning-bg" iconColor="text-warning" />
                <StatCard size="sm" title="حجوزات اليوم" value={basicStats.todayBookings} icon={<Calendar size={18} />} bgColor="bg-petrol-soft" iconColor="text-petrol" />
                <StatCard size="sm" title="العملاء" value={basicStats.clients} icon={<Users size={18} />} bgColor="bg-petrol-soft" iconColor="text-petrol" />
              </div>
            </>
          )}

          {/* المستوى الأول: يحتاج إلى انتباهك اليوم */}
          <section>
            <SectionLabel icon={<AlertCircle size={16} className="text-warning" />}>يحتاج إلى انتباهك اليوم</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* فواتير غير مدفوعة */}
              <div className="bg-warning-bg border border-warning rounded-xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-white shadow-sm text-warning"><FileText size={22} /></div>
                    <div>
                      <p className="text-sm text-concrete-500">فواتير غير مدفوعة</p>
                      {basicLoading ? (
                        <div className="h-7 w-16 bg-concrete-200 rounded animate-pulse mt-1"></div>
                      ) : (
                        <p className="text-2xl font-bold text-concrete-800">{basicStats.unpaidInvoices}</p>
                      )}
                    </div>
                  </div>
                  <Link href="/dashboard/finance/invoices" className="text-sm text-petrol hover:underline flex items-center gap-1 shrink-0">
                    عرض الكل <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>

              {/* مركبات بالخارج */}
              <div className="bg-warning-bg border border-warning rounded-xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-white shadow-sm text-warning"><Navigation size={22} /></div>
                    <div>
                      <p className="text-sm text-concrete-500">مركبات بالخارج</p>
                      {basicLoading ? (
                        <div className="h-7 w-16 bg-concrete-200 rounded animate-pulse mt-1"></div>
                      ) : (
                        <p className="text-2xl font-bold text-concrete-800">{basicStats.vehiclesInUse}</p>
                      )}
                    </div>
                  </div>
                  <Link href="/dashboard/vehicles" className="text-sm text-petrol hover:underline flex items-center gap-1 shrink-0">
                    عرض الكل <ArrowLeft size={14} />
                  </Link>
                </div>
                {!basicLoading && !vehiclesLoading && busyVehiclesList.length > 0 && (
                  <div className="mt-3 space-y-1 text-sm">
                    {busyVehiclesList.map((trip) => (
                      <p key={trip.$id} className="font-mono text-concrete-700">
                        {trip.vehiclePlate}
                        <span className="text-concrete-500"> - {trip.driverName}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* فحوصات مقبلة */}
            {upcomingLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={20} className="text-warning" />
                  <h2 className="text-lg font-bold text-warning">فحوصات مقبلة (خلال يومين)</h2>
                </div>
                <TableSkeleton rows={2} cols={3} />
              </Card>
            ) : upcomingTests.length > 0 && (
              <Card className="!border-warning">
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
              </Card>
            )}
          </section>

          {/* المستوى الثاني: نظرة عامة تشغيلية */}
          <section>
            <SectionLabel icon={<ClipboardCheck size={16} className="text-petrol" />}>نظرة عامة تشغيلية</SectionLabel>

            {/* قسم الفنيين */}
            {techLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck size={20} className="text-petrol" />
                  <h2 className="text-lg font-bold">أداء الفنيين اليوم</h2>
                </div>
                <TableSkeleton rows={3} cols={3} />
              </Card>
            ) : techStats.length > 0 && (
              <Card>
                <SectionHeader title="أداء الفنيين اليوم" icon={<UserCheck size={20} className="text-petrol" />} href="/dashboard/hr/employees" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {techStats.map((tech) => (
                    <TechCard key={tech.id} tech={tech} />
                  ))}
                </div>
              </Card>
            )}

            {/* آخر العينات */}
            <Card>
              <SectionHeader title="آخر العينات المضافة" icon={<FlaskConical size={20} className="text-warning" />} href="/dashboard/samples" />
              {samplesLoading ? (
                <TableSkeleton rows={3} cols={5} />
              ) : recentSamples.length === 0 ? <EmptyData /> : (
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

            {/* آخر الحجوزات */}
            {bookingsLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-petrol" />
                  <h2 className="text-lg font-bold">آخر الحجوزات</h2>
                </div>
                <TableSkeleton rows={3} cols={5} />
              </Card>
            ) : recentBookings.length > 0 && (
              <Card>
                <SectionHeader title="آخر الحجوزات" icon={<Calendar size={20} className="text-petrol" />} href="/dashboard/bookings" />
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

            {/* حالة المركبات */}
            <Card>
              <SectionHeader title="حالة المركبات" icon={<Car size={20} className="text-petrol" />} href="/dashboard/vehicles" />
              {vehiclesLoading ? (
                <TableSkeleton rows={3} cols={2} />
              ) : (
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
              )}
            </Card>
          </section>

          {/* المستوى الثالث: التحليلات */}
          <section>
            <SectionLabel icon={<TrendingUp size={16} className="text-petrol" />}>التحليلات</SectionLabel>

            {chartsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <div className="h-6 bg-concrete-200 rounded w-40 mb-6"></div>
                    <div className="h-64 bg-concrete-100 rounded animate-pulse"></div>
                  </Card>
                ))}
              </div>
            ) : (
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
            )}
          </section>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
