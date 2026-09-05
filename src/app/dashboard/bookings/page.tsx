'use client';

import React, { useEffect, useState } from 'react';
import { listBookings, updateBooking, deleteBooking, createBooking, listSampleTypes, listClients, createClient, listProjects, createProject } from '@/lib/services';
import type { Booking } from '@/types';
import type { SampleType } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Calendar as CalendarIcon,
  Table,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { ID } from 'appwrite';
import { generateUniqueProjectNumber, formatDateAr } from '@/lib/helpers';
import ConfirmModal from '@/components/ConfirmModal';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';
import BookingsCalendar from '@/components/bookings/BookingsCalendar';
import BookingsStats from '@/components/bookings/BookingsStats';
import BookingsTable from '@/components/bookings/BookingsTable';
import BookingsExport from '@/components/bookings/BookingsExport';
import QuickAddBooking from '@/components/bookings/QuickAddBooking';
import type { QuickAddFormValues } from '@/components/bookings/QuickAddBooking';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  const [stats, setStats] = useState({ pending: 0, accepted: 0, rejected: 0, today: 0 });

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [quickAddModal, setQuickAddModal] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const [nearbyBookings, setNearbyBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [bookingsRes, typesRes] = await Promise.all([
          listBookings([
            Query.orderDesc('$createdAt'),
            Query.limit(200),
          ]),
          listSampleTypes([Query.limit(100)]),
        ]);
        const docs = bookingsRes.documents;
        setBookings(docs);
        setSampleTypes(typesRes.documents);

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        setStats({
          pending: docs.filter(b => b.status === 'معلق').length,
          accepted: docs.filter(b => b.status === 'مقبول').length,
          rejected: docs.filter(b => b.status === 'مرفوض').length,
          today: docs.filter(b => b.preferredDate === today).length,
        });

        setNearbyBookings(
          docs.filter(
            b => (b.preferredDate === today || b.preferredDate === tomorrowStr) && b.status !== 'مرفوض'
          )
        );
      } catch {
        toast.error('فشل تحميل الحجوزات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      await updateBooking(id, { status: newStatus });
      toast.success(`تم تغيير الحالة إلى ${newStatus}`);
      setBookings(prev => prev.map(b => b.$id === id ? { ...b, status: newStatus as Booking['status'] } : b));
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const getOrCreateClient = async (name: string, phone: string): Promise<string> => {
    const existing = await listClients([
      Query.or([Query.equal('name', name), Query.equal('phone', phone)]),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) return existing.documents[0].$id;
    const client = await createClient(ID.unique(), {
      name,
      phone,
      type: 'فرد',
    });
    return client.$id;
  };

  const getOrCreateProject = async (projectName: string, clientId: string): Promise<string> => {
    if (!projectName) return '';
    const existing = await listProjects([
      Query.equal('name', projectName),
      Query.equal('clientId', clientId),
      Query.limit(1),
    ]);
    if (existing.documents.length > 0) return existing.documents[0].$id;

    let project = null;
    let nextNumberStr = await generateUniqueProjectNumber();
    let attempts = 0;
    while (!project && attempts < 10) {
      try {
        project = await createProject(nextNumberStr, {
          name: projectName,
          clientId,
          projectNumber: nextNumberStr,
          status: 'نشط',
        });
      } catch (err: unknown) {
        if ((err as Record<string, unknown>).code === 409) {
          attempts++;
          const currentYear = new Date().getFullYear();
          const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
          nextNumberStr = `PRJ-${currentYear}-${String(lastNum + 1).padStart(3, '0')}`;
        } else {
          throw err;
        }
      }
    }
    if (!project) {
      throw new Error('تعذر توليد رقم مشروع فريد بعد عدة محاولات.');
    }
    return project.$id;
  };

  const acceptBooking = async (booking: Booking) => {
    try {
      const clientId = await getOrCreateClient(booking.clientName, booking.clientPhone ?? '');
      let projectId = '';
      if (booking.projectName) {
        projectId = await getOrCreateProject(booking.projectName, clientId);
      }
      await updateBooking(booking.$id, { status: 'مقبول' });
      toast.success(
        <div>
          تم قبول الحجز وإنشاء العميل والمشروع بنجاح.{' '}
          <Link href={`/dashboard/clients/${clientId}`} className="underline font-bold">
            عرض العميل
          </Link>
          {projectId && (
            <>
              {' | '}
              <Link href={`/dashboard/projects/${projectId}`} className="underline font-bold">
                عرض المشروع
              </Link>
            </>
          )}
        </div>,
        { duration: 8000 }
      );
      setBookings(prev => prev.map(b => b.$id === booking.$id ? { ...b, status: 'مقبول' as const } : b));
    } catch (err: unknown) {
      toast.error('فشل قبول الحجز: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const openDeleteModal = (id: string, number: string) => {
    setDeleteTarget({ id, number });
    setDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBooking(deleteTarget.id);
      toast.success('تم حذف الحجز بنجاح');
      setBookings(prev => prev.filter(b => b.$id !== deleteTarget.id));
    } catch (err: unknown) {
      toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleting(false);
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleQuickAdd = async (form: QuickAddFormValues, date: string) => {
    setQuickAddLoading(true);
    try {
      const year = new Date().getFullYear();
      const prefix = `BOOK-${year}-`;
      let next = 1;
      try {
        const res = await listBookings([
          Query.startsWith('bookingNumber', prefix),
          Query.orderDesc('bookingNumber'),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) {
          const last = res.documents[0].bookingNumber.split('-').pop();
          if (last) next = parseInt(last, 10) + 1;
        }
      } catch {}

      let bookingCreated = null;
      let nextBookingNum = `${prefix}${String(next).padStart(4, '0')}`;
      let attempts = 0;
      while (!bookingCreated && attempts < 10) {
        try {
          bookingCreated = await createBooking(nextBookingNum, {
            ...form,
            bookingNumber: nextBookingNum,
            preferredDate: date,
            status: 'معلق',
            source: 'مباشر',
          });
        } catch (err: unknown) {
          if ((err as Record<string, unknown>).code === 409) {
            attempts++;
            const lastNum = parseInt(nextBookingNum.split('-').pop() || '0', 10);
            nextBookingNum = `BOOK-${year}-${String(lastNum + 1).padStart(4, '0')}`;
          } else {
            throw err;
          }
        }
      }
      if (!bookingCreated) {
        throw new Error('تعذر إنشاء الحجز برقم فريد بعد عدة محاولات.');
      }

      toast.success('تم إضافة الحجز بنجاح');
      setQuickAddModal(false);
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setQuickAddLoading(false);
    }
  };

  const filtered = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        b.clientName?.toLowerCase().includes(term) ||
        b.bookingNumber?.toLowerCase().includes(term) ||
        b.sampleType?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {nearbyBookings.length > 0 && (
            <div className="bg-warning-bg border border-warning rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-warning mt-0.5" />
              <div>
                <p className="font-bold text-warning">تذكير: حجوزات قريبة</p>
                <ul className="text-sm text-warning mt-1 list-disc list-inside">
                  {nearbyBookings.map(b => (
                    <li key={b.$id}>
                      {b.clientName} - {b.sampleType} ({formatDateAr(b.preferredDate)})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">الحجوزات</h1>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
                className="bg-border text-text-primary px-4 py-2 rounded-xl hover:bg-border flex items-center gap-2"
              >
                {viewMode === 'table' ? <CalendarIcon size={18} /> : <Table size={18} />}
                {viewMode === 'table' ? 'عرض التقويم' : 'عرض الجدول'}
              </button>
              {viewMode === 'table' && (
                <BookingsExport bookings={filtered} />
              )}
              <Link href="/dashboard/bookings/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
                <Plus size={18} /> حجز جديد
              </Link>
            </div>
          </div>

          <BookingsStats stats={stats} />

          {viewMode === 'table' && (
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 pr-10 rounded-xl" />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-border p-2 rounded-xl bg-surface">
                <option value="">كل الحالات</option>
                <option value="معلق">معلق</option>
                <option value="مقبول">مقبول</option>
                <option value="مرفوض">مرفوض</option>
              </select>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : viewMode === 'calendar' ? (
            <Card className="print:hidden">
              <BookingsCalendar
                bookings={bookings}
                onSelectDay={(dateStr) => {
                  setQuickAddDate(dateStr);
                  setQuickAddModal(true);
                }}
              />
            </Card>
          ) : (
            <Card>
              <BookingsTable
                bookings={filtered}
                onAccept={acceptBooking}
                onChangeStatus={changeStatus}
                onDelete={openDeleteModal}
              />
            </Card>
          )}
        </div>

        <ConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف الحجز "${deleteTarget?.number}"؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />

        {quickAddModal && (
          <QuickAddBooking
            date={quickAddDate}
            sampleTypes={sampleTypes}
            submitting={quickAddLoading}
            onClose={() => setQuickAddModal(false)}
            onSubmit={handleQuickAdd}
          />
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}