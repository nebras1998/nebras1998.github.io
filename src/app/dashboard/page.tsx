'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { DashboardStats } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
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
  ShieldAlert,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import EmptyData from '@/components/EmptyData';
import TechCard from '@/components/TechCard';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';
import { formatDateAr } from '@/lib/helpers';
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

const COLORS = ['#1a5276', '#e67e22', '#27ae60', '#c0392b', '#8e44ad'];

function SectionLabel({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {icon}
      <h2 className="text-sm font-bold text-text-secondary tracking-wide uppercase">{children}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function SectionHeader({ title, icon, href }: { title: React.ReactNode; icon?: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 tracking-tight">{icon}{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 shrink-0 transition-colors group">
          عرض الكل <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl p-5 shadow-sm border border-border animate-shimmer">
      <div className="h-3.5 bg-surface-muted rounded-lg w-20 mb-4"></div>
      <div className="h-7 bg-surface-muted rounded-lg w-24"></div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: '/dashboard/samples/new', label: 'إضافة عينة جديدة', icon: Plus, color: 'from-primary to-primary-dark' },
  { href: '/dashboard/bookings/new', label: 'حجز جديد', icon: CalendarPlus, color: 'from-accent to-accent-dark' },
  { href: '/dashboard/finance/invoices/new', label: 'فاتورة جديدة', icon: Receipt, color: 'from-success to-success-solid' },
  { href: '/dashboard/clients/new', label: 'إضافة عميل', icon: UserPlus, color: 'from-[#8e44ad] to-[#7d3c98]' },
];

const DEFAULTS = {
  clients: 0,
  activeProjects: 0,
  todaySamples: 0,
  pendingTests: 0,
  unpaidInvoices: 0,
  totalRevenue: 0,
  readyVehicles: 0,
  vehiclesInUse: 0,
  todayBookings: 0,
  nonCompliantTests: 0,
  dueComplianceSamples: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);
  const loading = !stats && !error;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard-stats');
        if (!res.ok) throw new Error('فشل تحميل إحصائيات لوحة التحكم');
        const data: DashboardStats = await res.json();
        if (active) setStats(data);
      } catch (err) {
        console.error('خطأ في تحميل إحصائيات لوحة التحكم:', err);
        if (active) setError(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const basicStats = stats ?? DEFAULTS;
  const samplesByType = stats?.samplesByType ?? [];
  const monthlyRevenue = stats?.monthlyRevenue ?? [];
  const weeklyTests = stats?.weeklyTests ?? [];
  const techStats = stats?.techStats ?? [];
  const upcomingTests = stats?.upcomingTests ?? [];
  const recentSamples = stats?.recentSamples ?? [];
  const recentBookings = stats?.recentBookings ?? [];
  const availableVehiclesList = stats?.availableVehicles ?? [];
  const busyVehiclesList = stats?.busyVehicles ?? [];

  const basicLoading = loading;
  const techLoading = loading;
  const upcomingLoading = loading;
  const samplesLoading = loading;
  const bookingsLoading = loading;
  const vehiclesLoading = loading;
  const chartsLoading = loading;

  const revenueTrend = useMemo(() => {
    const series = stats?.monthlyRevenue;
    if (!series || series.length < 2) return undefined;
    const now = new Date();
    const thisMonth = String(now.getMonth() + 1).padStart(2, '0');
    const prevIdx = series.findIndex((m) => m.month === thisMonth) - 1;
    if (prevIdx < 0) return undefined;
    const cur = series[prevIdx + 1]?.revenue ?? 0;
    const prev = series[prevIdx]?.revenue ?? 0;
    if (prev <= 0) return undefined;
    return { value: Math.round(((cur - prev) / prev) * 100), label: 'الشهر الحالي' };
  }, [stats]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8 animate-fade-in">
          {/* Compact Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">لوحة التحكم</h1>
              <p className="text-sm text-text-secondary mt-1">مرحباً بك، إليك ملخص اليوم</p>
            </div>
            <div className="text-sm text-text-secondary bg-surface border border-border rounded-xl px-4 py-2 whitespace-nowrap">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 bg-gradient-to-l ${color} text-white px-5 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98]`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>

          {/* Stat Cards */}
          {basicLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard title="عينات اليوم" value={basicStats.todaySamples} icon={<Hammer size={22} />} tone="warning" />
              <StatCard title="فحوصات معلقة" value={basicStats.pendingTests} icon={<AlertCircle size={22} />} tone="danger" />
              <StatCard title="إجمالي الإيرادات" value={`${basicStats.totalRevenue.toFixed(0)} ₪`} icon={<Banknote size={22} />} tone="success" trend={revenueTrend} valueClass="whitespace-nowrap" />
              <StatCard title="مشاريع نشطة" value={basicStats.activeProjects} icon={<FolderKanban size={22} />} tone="success" />
              <StatCard title="حجوزات اليوم" value={basicStats.todayBookings} icon={<Calendar size={18} />} tone="petrol" />
            </div>
          )}

          {/* Level 1: Attention */}
          <section>
            <SectionLabel icon={<AlertCircle size={16} className="text-warning" />}>يحتاج إلى انتباهك اليوم</SectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Unpaid Invoices */}
              <Card className="relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 w-1 h-full bg-warning-solid rounded-l-full" />
                <div className="flex items-center justify-between gap-3 pr-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning-bg text-warning"><FileText size={22} /></div>
                    <div>
                      <p className="text-sm text-text-secondary">فواتير غير مدفوعة</p>
                      {basicLoading ? (
                        <div className="h-7 w-16 bg-surface-muted rounded-lg animate-shimmer mt-1"></div>
                      ) : (
                        <p className="text-2xl font-bold text-text-primary">{basicStats.unpaidInvoices}</p>
                      )}
                    </div>
                  </div>
                  <Link href="/dashboard/finance/invoices" className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 shrink-0 transition-colors group">
                    عرض الكل <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </Card>

              {/* Vehicles Out */}
              <Card className="relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 w-1 h-full bg-accent rounded-l-full" />
                <div className="flex items-center justify-between gap-3 pr-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent-light text-accent"><Navigation size={22} /></div>
                    <div>
                      <p className="text-sm text-text-secondary">مركبات بالخارج</p>
                      {basicLoading ? (
                        <div className="h-7 w-16 bg-surface-muted rounded-lg animate-shimmer mt-1"></div>
                      ) : (
                        <p className="text-2xl font-bold text-text-primary">{basicStats.vehiclesInUse}</p>
                      )}
                    </div>
                  </div>
                  <Link href="/dashboard/vehicles" className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 shrink-0 transition-colors group">
                    عرض الكل <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                {!basicLoading && !vehiclesLoading && busyVehiclesList.length > 0 && (
                  <div className="mt-3 space-y-1.5 text-sm pr-2">
                    {busyVehiclesList.map((trip) => (
                      <p key={trip.$id} className="font-mono text-text-primary text-xs">
                        {trip.vehiclePlate}
                        <span className="text-text-muted"> — {trip.driverName}</span>
                      </p>
                    ))}
                  </div>
                )}
              </Card>

              {/* Compliance Alerts */}
              <Card className="relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 w-1 h-full bg-danger-solid rounded-l-full" />
                <div className="flex items-center justify-between gap-3 pr-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-danger-bg text-danger"><ShieldAlert size={22} /></div>
                    <div>
                      <p className="text-sm text-text-secondary">تنبيهات الالتزام</p>
                      {basicLoading ? (
                        <div className="h-7 w-16 bg-surface-muted rounded-lg animate-shimmer mt-1"></div>
                      ) : (
                        <p className="text-2xl font-bold text-text-primary">
                          {basicStats.nonCompliantTests + basicStats.dueComplianceSamples}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link href="/dashboard/tests" className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 shrink-0 transition-colors group">
                    عرض الكل <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                {!basicLoading &&
                  (basicStats.nonCompliantTests + basicStats.dueComplianceSamples === 0 ? (
                    <EmptyData title="لا توجد تنبيهات التزام حالياً" className="py-4" />
                  ) : (
                    <div className="mt-3 space-y-2 text-sm pr-2">
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-text-secondary">فحوصات غير مطابقة للمواصفة</span>
                        <span className="font-bold text-danger">{basicStats.nonCompliantTests}</span>
                      </p>
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-text-secondary">عينات تستحق فحص 7/28 يوم (خلال 14 يوماً)</span>
                        <span className="font-bold text-warning">{basicStats.dueComplianceSamples}</span>
                      </p>
                    </div>
                  ))}
              </Card>
            </div>

            {/* Upcoming Tests */}
            {upcomingLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={20} className="text-warning" />
                  <h2 className="text-lg font-bold text-text-primary">فحوصات مقبلة (خلال يومين)</h2>
                </div>
                <TableSkeleton rows={2} cols={3} />
              </Card>
            ) : upcomingTests.length > 0 && (
              <Card className="!border-warning/30 !shadow-[0_0_0_1px_rgba(212,172,13,0.1)]">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary tracking-tight"><Clock size={20} className="text-warning" /> فحوصات مقبلة (خلال يومين)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {upcomingTests.map((sample) => (
                    <div key={sample.$id} className="bg-warning-bg p-4 rounded-xl border border-warning/20">
                      <p className="font-mono font-bold text-text-primary">{sample.sampleNumber}</p>
                      <p className="text-sm text-text-secondary mt-1">{sample.type}</p>
                      <div className="text-xs mt-2 space-y-1">
                        {sample.test7DaysDate && sample.test7DaysDate >= new Date().toISOString().split('T')[0] && <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> 7 أيام: {formatDateAr(sample.test7DaysDate)}</p>}
                        {sample.test28DaysDate && sample.test28DaysDate >= new Date().toISOString().split('T')[0] && <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> 28 يوم: {formatDateAr(sample.test28DaysDate)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </section>

          {/* Level 2: Operational */}
          <section>
            <SectionLabel icon={<ClipboardCheck size={16} className="text-primary" />}>نظرة عامة تشغيلية</SectionLabel>

            {/* Technicians */}
            {techLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck size={20} className="text-primary" />
                  <h2 className="text-lg font-bold text-text-primary">أداء الفنيين اليوم</h2>
                </div>
                <TableSkeleton rows={3} cols={3} />
              </Card>
            ) : techStats.length > 0 && (
              <Card>
                <SectionHeader title="أداء الفنيين اليوم" icon={<UserCheck size={20} className="text-primary" />} href="/dashboard/hr/employees" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {techStats.map((tech) => (
                    <TechCard key={tech.id} tech={tech} />
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Samples */}
            <Card>
              <SectionHeader title="آخر العينات المضافة" icon={<FlaskConical size={20} className="text-accent" />} href="/dashboard/samples" />
              {samplesLoading ? (
                <TableSkeleton rows={3} cols={5} />
              ) : recentSamples.length === 0 ? <EmptyData /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {recentSamples.map((sample) => (
                    <div key={sample.$id} className="bg-surface-dim rounded-xl p-4 border border-border hover:shadow-md hover:border-primary/20 transition-all duration-200">
                      <p className="font-mono text-sm text-text-primary">{sample.sampleNumber}</p>
                      <p className="text-xs text-text-secondary mt-1">{sample.type}</p>
                      <div className="flex justify-between items-center mt-3">
                        <Badge status={sample.status} size="sm" />
                        <span className="text-xs text-text-muted">{sample.samplingDate || '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Bookings */}
            {bookingsLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-primary" />
                  <h2 className="text-lg font-bold text-text-primary">آخر الحجوزات</h2>
                </div>
                <TableSkeleton rows={3} cols={5} />
              </Card>
            ) : recentBookings.length > 0 && (
              <Card>
                <SectionHeader title="آخر الحجوزات" icon={<Calendar size={20} className="text-primary" />} href="/dashboard/bookings" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.$id} className="bg-primary-50 rounded-xl p-4 border border-primary/10 hover:shadow-md hover:border-primary/20 transition-all duration-200">
                      <p className="font-mono text-sm text-text-primary">{booking.bookingNumber}</p>
                      <p className="text-sm font-bold mt-1 text-text-primary">{booking.clientName}</p>
                      <p className="text-xs text-text-secondary">{booking.sampleType}</p>
                      <div className="flex justify-between items-center mt-3">
                        <Badge status={booking.status} size="sm" />
                        <span className="text-xs text-text-muted">{booking.preferredDate ? formatDateAr(booking.preferredDate) : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Vehicle Status */}
            <Card>
              <SectionHeader title="حالة المركبات" icon={<Car size={20} className="text-primary" />} href="/dashboard/vehicles" />
              {vehiclesLoading ? (
                <TableSkeleton rows={3} cols={2} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-success mb-3 flex items-center gap-2"><Car size={18} /> متوفرة ({availableVehiclesList.length})</h3>
                    {availableVehiclesList.length === 0 ? <EmptyData title="لا توجد مركبات متوفرة" className="py-6" /> : (
                      <div className="space-y-2">
                        {availableVehiclesList.map((v) => (
                          <div key={v.$id} className="flex justify-between items-center bg-success-bg p-3 rounded-xl border border-success/10">
                            <span className="font-mono font-semibold text-text-primary">{v.plateNumber}</span>
                            <span className="text-sm text-text-secondary">{v.brand} {v.model}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-accent mb-3 flex items-center gap-2"><Navigation size={18} /> بالخارج ({busyVehiclesList.length})</h3>
                    {busyVehiclesList.length === 0 ? <EmptyData title="لا توجد رحلات نشطة" className="py-6" /> : (
                      <div className="space-y-2">
                        {busyVehiclesList.map((trip) => (
                          <div key={trip.$id} className="bg-accent-light p-3 rounded-xl border border-accent/10">
                            <div className="flex justify-between">
                              <span className="font-mono font-bold text-text-primary">{trip.vehiclePlate}</span>
                              <span className="text-xs text-text-muted">{trip.departureTime}</span>
                            </div>
                            <div className="text-sm mt-1">
                              <span className="text-text-secondary">{trip.driverName}</span>
                              {trip.destination && <span className="text-text-muted"> — {trip.destination}</span>}
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

          {/* Level 3: Analytics */}
          <section>
            <SectionLabel icon={<TrendingUp size={16} className="text-primary" />}>التحليلات</SectionLabel>

            {chartsLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <div className="h-5 bg-surface-muted rounded-lg w-40 mb-6 animate-shimmer"></div>
                    <div className="h-64 bg-surface-muted rounded-xl animate-shimmer"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="العينات حسب النوع" icon={<FlaskConical size={20} className="text-primary" />}>
                  {samplesByType.length === 0 ? <EmptyData /> : (
                    <>
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={samplesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" paddingAngle={3} stroke="none">
                              {samplesByType.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold text-text-primary">
                            {samplesByType.reduce((sum, s) => sum + s.value, 0)}
                          </span>
                          <span className="text-xs text-text-muted">عينة</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-4">
                        {samplesByType.map((item, idx) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-text-secondary">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </ChartCard>

                <ChartCard title="الإيرادات الشهرية" icon={<TrendingUp size={20} className="text-primary" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyRevenue} margin={{ top: 4 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1a5276" />
                          <stop offset="100%" stopColor="#154360" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(26, 82, 118, 0.06)' }} />
                      <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} name="الإيرادات (₪)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="الفحوصات اليومية (آخر 7 أيام)" icon={<ClipboardCheck size={20} className="text-primary" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={weeklyTests} margin={{ top: 4 }}>
                      <defs>
                        <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1a5276" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1a5276" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#6c757d' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ stroke: '#1a5276', strokeDasharray: '3 3' }} />
                      <Area type="monotone" dataKey="count" stroke="#1a5276" strokeWidth={2} fill="url(#colorTests)" name="عدد الفحوصات" />
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
