'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { listBookings, updateBooking, deleteBooking, createBooking, listSampleTypes, listClients, createClient, listProjects, createProject } from '@/lib/services';
import type { Booking } from '@/types';
import type { SampleType } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import { toast } from 'sonner';
import {
  Check,
  X,
  Search,
  RefreshCcw,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Table,
  Printer,
  Download,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import { ID } from 'appwrite';
import { generateUniqueProjectNumber, formatDateAr } from '@/lib/helpers';
import ConfirmModal from '@/components/ConfirmModal';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import moment from 'moment';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// ==================== مكون التقويم المخصص ====================
const CustomCalendar = ({
  bookings,
  onSelectDay,
}: {
  bookings: Booking[];
  onSelectDay: (dateStr: string) => void;
}) => {
  const [viewDate, setViewDate] = useState(moment());
  const startOfMonth = viewDate.clone().startOf('month');
  const endOfMonth = viewDate.clone().endOf('month');
  const startDay = startOfMonth.day();

  const daysInMonth = endOfMonth.date();

  const goToPreviousMonth = () => setViewDate(viewDate.clone().subtract(1, 'month'));
  const goToNextMonth = () => setViewDate(viewDate.clone().add(1, 'month'));
  const goToToday = () => setViewDate(moment());

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(viewDate.clone().month(newMonth));
  };

  const bookingsByDate: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    if (b.preferredDate) {
      if (!bookingsByDate[b.preferredDate]) bookingsByDate[b.preferredDate] = [];
      bookingsByDate[b.preferredDate].push(b);
    }
  });

  const weeks: React.ReactNode[] = [];
  let days: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 border bg-surface-dim" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = startOfMonth.clone().date(day);
    const dateStr = dateObj.format('YYYY-MM-DD');
    const dayBookings = bookingsByDate[dateStr] || [];
    const isToday = dateObj.isSame(moment(), 'day');
    const isWeekend = dateObj.day() === 5 || dateObj.day() === 6;

    days.push(
      <div
        key={day}
        className={`h-20 border p-1 cursor-pointer transition-colors hover:bg-primary-50 relative ${
          isToday ? 'bg-primary-50' : isWeekend ? 'bg-surface-muted' : 'bg-white'
        }`}
        onClick={() => onSelectDay(dateStr)}
      >
        <div className="flex justify-between items-start">
          <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
            {day}
          </span>
          {dayBookings.length > 0 && (
            <span className="text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
              {dayBookings.length}
            </span>
          )}
        </div>
        <div className="mt-1 space-y-0.5 overflow-hidden">
          {dayBookings.slice(0, 2).map(b => (
            <div
              key={b.$id}
              className={`text-xs px-1 rounded truncate ${
                b.status === 'مقبول' ? 'bg-success-bg text-success' : b.status === 'مرفوض' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'
              }`}
              title={`${b.clientName} - ${b.sampleType}`}
            >
              {b.clientName}
            </div>
          ))}
          {dayBookings.length > 2 && (
            <div className="text-xs text-text-muted">+{dayBookings.length - 2} المزيد</div>
          )}
        </div>
      </div>
    );

    if (days.length === 7) {
      weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7">{days}</div>);
      days = [];
    }
  }
  if (days.length > 0) {
    const filler: React.ReactNode[] = [];
    for (let i = days.length; i < 7; i++) {
      filler.push(<div key={`empty-end-${i}`} className="h-20 border bg-surface-dim" />);
    }
    weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7">{[...days, ...filler]}</div>);
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-border border">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToToday} className="px-3 py-1 text-sm rounded-lg hover:bg-border border">
            اليوم
          </button>
          <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-border border">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewDate.month()}
            onChange={handleMonthChange}
            className="px-3 py-1 border rounded-lg text-sm font-bold bg-white"
          >
            {ARABIC_MONTHS.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <span className="text-lg font-bold">{viewDate.format('YYYY')}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-surface-muted border-b">
        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
          <div key={d} className="p-2 text-center font-bold text-sm">{d}</div>
        ))}
      </div>
      {weeks}
    </div>
  );
};

// ==================== صفحة الحجوزات الرئيسية ====================
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
  const [quickAddForm, setQuickAddForm] = useState({
    clientName: '',
    clientPhone: '',
    sampleType: '',
    projectName: '',
    notes: '',
  });
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
      } catch (err: unknown) {
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

  // ✅ دالة الحفظ السريع المفقودة تمت إضافتها هنا
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
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
            ...quickAddForm,
            bookingNumber: nextBookingNum,
            preferredDate: quickAddDate,
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

  const exportCSV = () => {
    const headers = ['رقم الحجز', 'العميل', 'الهاتف', 'نوع العينة', 'التاريخ', 'الحالة', 'المصدر'];
    const rows = filtered.map(b => [
      b.bookingNumber,
      b.clientName,
      b.clientPhone || '',
      b.sampleType,
      b.preferredDate || '',
      b.status,
      b.source || '',
    ]);
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `الحجوزات_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    window.print();
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
                <>
                  <button onClick={exportCSV} className="bg-success-bg text-success px-4 py-2 rounded-xl hover:bg-success-bg flex items-center gap-2">
                    <Download size={18} /> تصدير CSV
                  </button>
                  <button onClick={printTable} className="bg-surface-muted text-text-primary px-4 py-2 rounded-xl hover:bg-border flex items-center gap-2">
                    <Printer size={18} /> طباعة
                  </button>
                </>
              )}
              <Link href="/dashboard/bookings/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
                <Plus size={18} /> حجز جديد
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="معلقة" value={stats.pending} centered bgColor="bg-warning-bg" valueClass="text-warning" />
            <StatCard title="مقبولة" value={stats.accepted} centered bgColor="bg-success-bg" valueClass="text-success" />
            <StatCard title="مرفوضة" value={stats.rejected} centered bgColor="bg-danger-bg" valueClass="text-danger" />
            <StatCard title="اليوم" value={stats.today} centered bgColor="bg-primary-50" valueClass="text-primary" />
          </div>

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
              <CustomCalendar
                bookings={bookings}
                onSelectDay={(dateStr) => {
                  setQuickAddDate(dateStr);
                  setQuickAddForm({ clientName: '', clientPhone: '', sampleType: '', projectName: '', notes: '' });
                  setQuickAddModal(true);
                }}
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto print:shadow-none print:rounded-none">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الحجز</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العميل</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">نوع العينة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">التاريخ المفضل</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-surface-dim print:hidden">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6}><EmptyData title="لا توجد حجوزات" className="py-8" /></td></tr>
                  ) : (
                    filtered.map(b => (
                      <tr key={b.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                        <td className="p-3 font-mono">{b.bookingNumber}</td>
                        <td className="p-3">{b.clientName}</td>
                        <td className="p-3">{b.sampleType}</td>
                        <td className="p-3">{formatDateAr(b.preferredDate)}</td>
                        <td className="p-3">
                          <Badge status={b.status} />
                        </td>
                        <td className="p-3 flex flex-wrap gap-1 print:hidden">
                          {b.status !== 'مقبول' && (
                            <button onClick={() => (b.status === 'معلق' ? acceptBooking(b) : changeStatus(b.$id, 'مقبول'))} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1 text-sm"><Check size={14} /> قبول</button>
                          )}
                          {b.status !== 'مرفوض' && (
                            <button onClick={() => changeStatus(b.$id, 'مرفوض')} className="text-danger hover:underline flex items-center gap-1 text-sm"><X size={14} /> رفض</button>
                          )}
                          {b.status !== 'معلق' && (
                            <button onClick={() => changeStatus(b.$id, 'معلق')} className="text-warning hover:underline flex items-center gap-1 text-sm"><RefreshCcw size={14} /> إعادة للمعلق</button>
                          )}
                          <button onClick={() => openDeleteModal(b.$id, b.bookingNumber)} className="text-danger hover:underline flex items-center gap-1 text-sm"><Trash2 size={14} /> حذف</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">حجز جديد - {formatDateAr(quickAddDate)}</h2>
              <form onSubmit={handleQuickAdd} className="space-y-3">
                <TextField
                  name="clientName"
                  label="اسم العميل"
                  value={quickAddForm.clientName}
                  onChange={e => setQuickAddForm({ ...quickAddForm, clientName: e.target.value })}
                  placeholder="اسم العميل"
                  required
                />
                <TextField
                  name="clientPhone"
                  label="الهاتف"
                  value={quickAddForm.clientPhone}
                  onChange={e => setQuickAddForm({ ...quickAddForm, clientPhone: e.target.value })}
                  placeholder="الهاتف"
                  required
                />
                <SelectField
                  name="sampleType"
                  label="نوع العينة"
                  value={quickAddForm.sampleType}
                  onChange={e => setQuickAddForm({ ...quickAddForm, sampleType: e.target.value })}
                  required
                >
                  <option value="">نوع العينة</option>
                  {sampleTypes.map(t => (
                    <option key={t.$id} value={t.name}>{t.name}</option>
                  ))}
                </SelectField>
                <TextField
                  name="projectName"
                  label="اسم المشروع"
                  value={quickAddForm.projectName}
                  onChange={e => setQuickAddForm({ ...quickAddForm, projectName: e.target.value })}
                  placeholder="اسم المشروع (اختياري)"
                />
                <TextAreaField
                  name="notes"
                  label="ملاحظات"
                  value={quickAddForm.notes}
                  onChange={e => setQuickAddForm({ ...quickAddForm, notes: e.target.value })}
                  placeholder="ملاحظات"
                  rows={2}
                />
                <div className="flex gap-2">
                  <SubmitButton loading={quickAddLoading} className="flex-1">حفظ</SubmitButton>
                  <button type="button" onClick={() => setQuickAddModal(false)} className="flex-1 bg-border text-text-primary py-2 rounded-lg font-bold">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}

