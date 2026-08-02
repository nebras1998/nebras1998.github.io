'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { Plus, Search, Check, X as XIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import TableSkeleton from '@/components/TableSkeleton';
import ConfirmModal from '@/components/ConfirmModal';
import Badge from '@/components/Badge';
import type { OvertimeRecord, Employee } from '@/types';
import { listOvertime, updateOvertime, deleteOvertime } from '@/lib/services/overtime';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';

const PAGE_SIZE = 25;

export default function OvertimePage() {
  const [overtimes, setOvertimes] = useState<OvertimeRecord[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [overRes, empRes] = await Promise.all([
        listOvertime([Query.orderDesc('date'), Query.limit(500)]),
        listEmployees([Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      (empRes.documents as unknown as Employee[]).forEach((emp) => (map[emp.$id] = emp.name));
      setEmployeesMap(map);
      setOvertimes(overRes.documents as unknown as OvertimeRecord[]);
    } catch (err: unknown) {
      console.error('فشل تحميل بيانات العمل الإضافي:', err);
      toast.error('فشل تحميل بيانات العمل الإضافي');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...overtimes];
    if (selectedEmployee) result = result.filter((o) => o.employeeId === selectedEmployee);
    if (filterStatus) result = result.filter((o) => o.approved === (filterStatus === 'موافق'));
    if (filterDate) result = result.filter((o) => o.date === filterDate);
    else if (filterMonth) result = result.filter((o) => o.date?.startsWith(filterMonth));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          employeesMap[o.employeeId]?.toLowerCase().includes(term) ||
          o.reason?.toLowerCase().includes(term) ||
          o.date?.includes(term)
      );
    }
    return result;
  }, [searchTerm, selectedEmployee, filterStatus, filterDate, filterMonth, overtimes, employeesMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    (async () => {
      try {
        const [overRes, empRes] = await Promise.all([
          listOvertime([Query.orderDesc('date'), Query.limit(500)]),
          listEmployees([Query.limit(200)]),
        ]);
        const map: Record<string, string> = {};
        (empRes.documents as unknown as Employee[]).forEach((emp) => (map[emp.$id] = emp.name));
        setEmployeesMap(map);
        setOvertimes(overRes.documents as unknown as OvertimeRecord[]);
      } catch (err: unknown) {
        console.error('فشل تحميل بيانات العمل الإضافي:', err);
        toast.error('فشل تحميل بيانات العمل الإضافي');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateStatus = async (id: string, approved: boolean) => {
    try {
      await updateOvertime(id, { approved });
      toast.success(approved ? 'تم اعتماد العمل الإضافي' : 'تم رفض طلب العمل الإضافي');
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('فشل تحديث الحالة: ' + (e.message ?? ''));
    }
  };

  // دوال الحذف
  const openDeleteModal = (id: string, employeeName: string) => {
    setDeleteTarget({ id, name: employeeName });
    setDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOvertime(deleteTarget.id);
      setOvertimes((prev) => prev.filter((o) => o.$id !== deleteTarget.id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('خطأ في الحذف: ' + (e.message ?? ''));
    } finally {
      setDeleting(false);
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // حساب إجمالي ساعات العمل الإضافي المعروضة
  const totalHours = filtered.reduce((sum, o) => sum + (o.hours || 0), 0);

  const employeeOptions = Object.entries(employeesMap);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">العمل الإضافي</h1>
          <Link href="/dashboard/hr/overtime/new" className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark">
            <Plus size={18} /> طلب عمل إضافي
          </Link>
        </div>

        {/* صف الفلاتر */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو السبب..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full border p-2 pr-10 rounded"
            />
          </div>
          <select
            value={selectedEmployee}
            onChange={(e) => { setSelectedEmployee(e.target.value); setCurrentPage(1); }}
            className="border p-2 rounded"
          >
            <option value="">كل الموظفين</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="border p-2 rounded"
          >
            <option value="">كل الحالات</option>
            <option value="معلق">معلق</option>
            <option value="مقبول">مقبول</option>
            <option value="مرفوض">مرفوض</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(''); setCurrentPage(1); }}
            className="border p-2 rounded"
          />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); setCurrentPage(1); }}
            className="border p-2 rounded"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-concrete-50 border-b">
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الموظف</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">التاريخ</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الوقت</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الساعات</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">السبب</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">معتمد</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-4 text-concrete-500">لا توجد طلبات</td></tr>
                  ) : (
                    paginated.map((ot) => (
                      <tr key={ot.$id} className="border-b hover:bg-concrete-50">
                        <td className="p-3">{employeesMap[ot.employeeId] || ot.employeeId}</td>
                        <td className="p-3">{ot.date}</td>
                        <td className="p-3">-</td>
                        <td className="p-3 font-bold">{ot.hours}</td>
                        <td className="p-3">{ot.reason || '-'}</td>
                        <td className="p-3">
                          <Badge status={ot.approved ? 'معتمد' : 'معلق'} />
                        </td>
                        <td className="p-3 flex gap-2">
                          {!ot.approved && (
                            <>
                              <button onClick={() => updateStatus(ot.$id, true)} className="text-petrol hover:underline flex items-center gap-1"><Check size={16} /> اعتماد</button>
                              <button onClick={() => updateStatus(ot.$id, false)} className="text-danger hover:underline flex items-center gap-1"><XIcon size={16} /> رفض</button>
                            </>
                          )}
                          <button
                            onClick={() => openDeleteModal(ot.$id, employeesMap[ot.employeeId] || '')}
                            className="text-danger hover:underline flex items-center gap-1"
                          >
                            <Trash2 size={16} /> حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-concrete-500">
              <span>إجمالي الساعات: {totalHours.toFixed(2)} ساعة</span>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}

        <ConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف طلب العمل الإضافي${deleteTarget?.name ? ` للموظف "${deleteTarget.name}"` : ''}؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}