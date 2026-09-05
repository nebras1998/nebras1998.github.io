import { Client, Databases, Query } from 'appwrite';
import { createHash } from 'node:crypto';
import {
  DATABASE_ID,
  INVOICES_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  TESTS_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  VEHICLES_COLLECTION_ID,
  VEHICLE_TRIPS_COLLECTION_ID,
  BOOKINGS_COLLECTION_ID,
} from '@/lib/constants';
import type {
  DashboardStats,
  DashboardVehicleStatus,
  DashboardBusyVehicle,
  DashboardUpcomingSample,
  DashboardRecentBooking,
  TechStatsItem,
} from '@/types';

const PAGE_SIZE = 100;

export const CACHE_TTL_MS = 5 * 60 * 1000;

type InvoiceAggregate = { paidAmount?: number; issueDate?: string; status?: string };
type SampleAggregate = {
  $id: string;
  $createdAt: string;
  sampleNumber: string;
  type: string;
  status?: string;
  samplingDate?: string;
  preparationDate?: string;
  deliveryDate?: string;
  samplerId?: string;
  preparerId?: string;
  transporterId?: string;
  test7DaysDate?: string;
  test28DaysDate?: string;
};
type TestAggregate = {
  $id: string;
  $createdAt: string;
  assignedTo?: string;
  sampleId?: string;
  status?: string;
  complianceStatus?: string;
};
type EmployeeAggregate = { $id: string; name: string; role?: string; status?: string };
type VehicleAggregate = {
  $id: string;
  plateNumber: string;
  brand: string;
  model: string;
  status?: string;
};
type TripAggregate = {
  $id: string;
  vehicleId: string;
  driverId: string;
  destination?: string;
  departureTime: string;
  status?: string;
};
type BookingAggregate = {
  $id: string;
  $createdAt: string;
  bookingNumber: string;
  clientName: string;
  sampleType?: string;
  preferredDate?: string;
  status?: string;
};

// قرار التصميم بخصوص التخزين المؤقت:
// التخزين المؤقت داخل الذاكرة هو "أفضل جهد" لكل مثيل خادم. في حالة النشر على منصات
// serverless متعددة المثيلات قد يكون لكل مثيل ذاكرة تخزين مؤقت خاصة به، لكن هذا لا يؤثر
// على صحة البيانات لأن الحساب يُنفَّذ بالكامل عبر تقسيم الصفحات (pagination) فيكون الأثر
// الوحيد محتملًا هو الأداء وليس فقدان البيانات. الخريطة مفصولة حسب هوية المستخدم (بصمة
// من جلسة Appwrite) حتى لا تتسرب بيانات مستخدم إلى مستخدم آخر.
const cacheMap = new Map<string, { data: DashboardStats; expiresAt: number }>();

function createDatabases(sessionCookie: string): Databases {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setCookie(sessionCookie);

  return new Databases(client);
}

async function fetchAllDocuments<T>(
  databases: Databases,
  collectionId: string,
  select: string[]
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const res = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
      Query.select(select),
    ]);
    all.push(...(res.documents as unknown as T[]));
    offset += PAGE_SIZE;
    if (offset >= res.total) break;
  }
  return all;
}

export async function computeDashboardStats(sessionCookie: string): Promise<DashboardStats> {
  const databases = createDatabases(sessionCookie);

  const [
    invoices,
    samples,
    tests,
    clients,
    projects,
    employees,
    vehicles,
    trips,
    bookings,
  ] = await Promise.all([
    fetchAllDocuments<InvoiceAggregate>(databases, INVOICES_COLLECTION_ID, [
      'paidAmount',
      'issueDate',
      'status',
    ]),
    fetchAllDocuments<SampleAggregate>(databases, SAMPLES_COLLECTION_ID, [
      '$id',
      '$createdAt',
      'sampleNumber',
      'type',
      'status',
      'samplingDate',
      'preparationDate',
      'deliveryDate',
      'samplerId',
      'preparerId',
      'transporterId',
      'test7DaysDate',
      'test28DaysDate',
    ]),
    fetchAllDocuments<TestAggregate>(databases, TESTS_COLLECTION_ID, [
      '$id',
      '$createdAt',
      'assignedTo',
      'sampleId',
      'status',
      'complianceStatus',
    ]),
    fetchAllDocuments<{ $id: string }>(databases, CLIENTS_COLLECTION_ID, ['$id']),
    fetchAllDocuments<{ status?: string }>(databases, PROJECTS_COLLECTION_ID, ['status']),
    fetchAllDocuments<EmployeeAggregate>(databases, EMPLOYEES_COLLECTION_ID, [
      '$id',
      'name',
      'role',
      'status',
    ]),
    fetchAllDocuments<VehicleAggregate>(databases, VEHICLES_COLLECTION_ID, [
      '$id',
      'plateNumber',
      'brand',
      'model',
      'status',
    ]),
    fetchAllDocuments<TripAggregate>(databases, VEHICLE_TRIPS_COLLECTION_ID, [
      '$id',
      'vehicleId',
      'driverId',
      'destination',
      'departureTime',
      'status',
    ]),
    fetchAllDocuments<BookingAggregate>(databases, BOOKINGS_COLLECTION_ID, [
      '$id',
      '$createdAt',
      'bookingNumber',
      'clientName',
      'sampleType',
      'preferredDate',
      'status',
    ]),
  ]);

  const today = new Date().toISOString().split('T')[0];

  // ── KPIs ──
  const clientsCount = clients.length;
  const activeProjects = projects.filter((p) => p.status === 'نشط').length;
  const todaySamples = samples.filter((s) => s.samplingDate === today).length;
  const pendingTests = tests.filter((t) => t.status === 'قيد الانتظار').length;
  const unpaidInvoices = invoices.filter((inv) => inv.status === 'صادرة').length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const todayBookings = bookings.filter((b) => b.preferredDate === today).length;

  const activeTrips = trips.filter((t) => t.status === 'قيد الرحلة');
  const inUseVehicleIds = new Set(activeTrips.map((t) => t.vehicleId));
  const readyVehicles = vehicles.filter((v) => v.status === 'جاهزة').length;
  const vehiclesInUse = activeTrips.length;

  // ── الشهرية و الإيرادات ──
  const monthly: Record<string, number> = {};
  invoices.forEach((inv) => {
    if (inv.issueDate) {
      const [y, m] = inv.issueDate.split('-');
      monthly[`${y}-${m}`] = (monthly[`${y}-${m}`] || 0) + (inv.paidAmount || 0);
    }
  });
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const currentYear = new Date().getFullYear().toString();
  const monthlyRevenue = months.map((m) => ({ month: m, revenue: monthly[`${currentYear}-${m}`] || 0 }));

  const typeCount: Record<string, number> = {};
  samples.forEach((s) => {
    typeCount[s.type] = (typeCount[s.type] || 0) + 1;
  });
  const samplesByType = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  // ── تنبيهات الالتزام ──
  const nonCompliantTests = tests.filter((t) => t.complianceStatus === 'غير مطابق').length;
  const dueLimit = new Date();
  dueLimit.setDate(dueLimit.getDate() + 14);
  const dueLimitISO = dueLimit.toISOString().split('T')[0];
  const dueComplianceSamples = samples.filter(
    (s) =>
      (s.test7DaysDate && s.test7DaysDate >= today && s.test7DaysDate <= dueLimitISO) ||
      (s.test28DaysDate && s.test28DaysDate >= today && s.test28DaysDate <= dueLimitISO)
  ).length;

  // ── الفحوصات اليومية (آخر 7 أيام) ──
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const weeklyTests = days.map((day) => ({
    day: day.slice(5),
    count: tests.filter((t) => t.$createdAt?.startsWith(day)).length,
  }));

  // ── أداء الفنيين ──
  const technicians = employees.filter((e) => e.role === 'فني' && e.status === 'يعمل');
  const techStats: TechStatsItem[] = technicians.map((tech) => {
    const techTests = tests.filter((t) => t.assignedTo === tech.$id);
    const completed = techTests.filter((t) => t.status === 'مكتمل').length;
    const pending = techTests.filter(
      (t) => t.status === 'قيد الانتظار' || t.status === 'تحت الفحص'
    ).length;
    const sampleIds = [...new Set(techTests.map((t) => t.sampleId).filter(Boolean))];
    const todaySampled = samples.filter(
      (s) => s.samplerId === tech.$id && s.samplingDate === today
    ).length;
    const todayPrepared = samples.filter(
      (s) => s.preparerId === tech.$id && s.preparationDate === today
    ).length;
    const todayDelivered = samples.filter(
      (s) => s.transporterId === tech.$id && s.deliveryDate === today
    ).length;
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

  // ── الفحوصات المقبلة (خلال يومين) ──
  const twoDaysLater = new Date();
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);
  const twoDaysLaterISO = twoDaysLater.toISOString().split('T')[0];
  const upcomingTests: DashboardUpcomingSample[] = samples
    .filter(
      (s) =>
        (s.test7DaysDate && s.test7DaysDate >= today && s.test7DaysDate <= twoDaysLaterISO) ||
        (s.test28DaysDate && s.test28DaysDate >= today && s.test28DaysDate <= twoDaysLaterISO)
    )
    .sort((a, b) => (a.test7DaysDate || a.test28DaysDate || '').localeCompare(b.test7DaysDate || b.test28DaysDate || ''))
    .slice(0, 10)
    .map((s) => ({
      $id: s.$id,
      sampleNumber: s.sampleNumber,
      type: s.type,
      test7DaysDate: s.test7DaysDate,
      test28DaysDate: s.test28DaysDate,
    }));

  // ── آخر العينات ──
  const recentSamples = [...samples]
    .sort((a, b) => b.$createdAt.localeCompare(a.$createdAt))
    .slice(0, 5)
    .map((s) => ({
      $id: s.$id,
      $createdAt: s.$createdAt,
      sampleNumber: s.sampleNumber,
      type: s.type,
      status: s.status || '',
      samplingDate: s.samplingDate,
    }));

  // ── آخر الحجوزات ──
  const recentBookings: DashboardRecentBooking[] = [...bookings]
    .sort((a, b) => b.$createdAt.localeCompare(a.$createdAt))
    .slice(0, 5)
    .map((b) => ({
      $id: b.$id,
      bookingNumber: b.bookingNumber,
      clientName: b.clientName,
      sampleType: b.sampleType,
      preferredDate: b.preferredDate,
      status: b.status,
    }));

  // ── المركبات ──
  const availableVehicles: DashboardVehicleStatus[] = vehicles
    .filter((v) => v.status === 'جاهزة' && !inUseVehicleIds.has(v.$id))
    .map((v) => ({ $id: v.$id, plateNumber: v.plateNumber, brand: v.brand, model: v.model }));

  const driversMap: Record<string, string> = {};
  employees.forEach((e) => (driversMap[e.$id] = e.name));
  const vehiclesMap: Record<string, string> = {};
  vehicles.forEach((v) => (vehiclesMap[v.$id] = v.plateNumber));

  const busyVehicles: DashboardBusyVehicle[] = activeTrips.map((trip) => ({
    $id: trip.$id,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    destination: trip.destination,
    departureTime: trip.departureTime,
    status: trip.status!,
    driverName: driversMap[trip.driverId] || trip.driverId,
    vehiclePlate: vehiclesMap[trip.vehicleId] || trip.vehicleId,
  }));

  return {
    clients: clientsCount,
    activeProjects,
    todaySamples,
    pendingTests,
    unpaidInvoices,
    totalRevenue,
    todayBookings,
    readyVehicles,
    vehiclesInUse,
    nonCompliantTests,
    dueComplianceSamples,
    samplesByType,
    monthlyRevenue,
    weeklyTests,
    techStats,
    upcomingTests,
    recentSamples,
    recentBookings,
    availableVehicles,
    busyVehicles,
    compliance: { nonCompliantTests, dueComplianceSamples },
    generatedAt: new Date().toISOString(),
  };
}

export async function getDashboardStats(sessionCookie: string): Promise<DashboardStats> {
  const key = createHash('sha256').update(sessionCookie).digest('hex');
  const cached = cacheMap.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const data = await computeDashboardStats(sessionCookie);
  cacheMap.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
