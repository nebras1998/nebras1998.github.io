'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import Pagination from '@/components/Pagination';
import { Plus, Search, Check, X as XIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import Badge from '@/components/Badge';
import TableSkeleton from '@/components/TableSkeleton';
import type { LeaveRequest, Employee } from '@/types';
import { listLeaveRequests, updateLeaveRequest, deleteLeaveRequest } from '@/lib/services/leaves';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';

const PAGE_SIZE = 20;

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const fetchData = async () => {
    try {
      const [leavesRes, empRes] = await Promise.all([
        listLeaveRequests([Query.orderDesc('$createdAt'), Query.limit(500)]),
        listEmployees([Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      (empRes.documents as unknown as Employee[]).forEach((emp) => (map[emp.$id] = emp.name));
      setEmployeesMap(map);
      setLeaves(leavesRes.documents as unknown as LeaveRequest[]);
    } catch (err: unknown) {
      console.error('فشل تحميل طلبات الإجازة:', err);
      toast.error('فشل تحميل طلبات الإجازة');
    } finally {
      setLoading(false);
    }
  };

  // للحذف
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = leaves;
    if (selectedEmployee) {
      result = result.filter((l) => l.employeeId === selectedEmployee);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          employeesMap[l.employeeId]?.toLowerCase().includes(term) ||
          l.type?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [searchTerm, selectedEmployee, leaves, employeesMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    (async () => {
      try {
        const [leavesRes, empRes] = await Promise.all([
          listLeaveRequests([Query.orderDesc('$createdAt'), Query.limit(500)]),
          listEmployees([Query.limit(200)]),
        ]);
        const map: Record<string, string> = {};
        (empRes.documents as unknown as Employee[]).forEach((emp) => (map[emp.$id] = emp.name));
        setEmployeesMap(map);
        setLeaves(leavesRes.documents as unknown as LeaveRequest[]);
      } catch (err: unknown) {
        console.error('فشل تحميل طلبات الإجازة:', err);
        toast.error('فشل تحميل طلبات الإجازة');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateLeaveRequest(id, { status: newStatus });
      toast.success(`تم ${newStatus === 'مقبول' ? 'قبول' : 'رفض'} الطلب`);
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
      await deleteLeaveRequest(deleteTarget.id);
      setLeaves((prev) => prev.filter((l) => l.$id !== deleteTarget.id));
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

  const getDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const typeLabel = (t: string) => {
    const labels: Record<string, string> = { 'سنوي': 'سنوية', 'مرضي': 'مرضية', 'طارئ': 'طارئة', 'بدون راتب': 'بدون راتب' };
    return labels[t] || t;
  };

  const totalApprovedDays = filtered
    .filter((l) => l.status === 'موافق')
    .reduce((sum, l) => sum + getDays(l.startDate, l.endDate), 0);

  const employeeOptions = Object.entries(employeesMap);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">إدارة الإجازات</h1>
          <Link href="/dashboard/hr/leaves/new" className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark">
            <Plus size={18} /> طلب إجازة جديد
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
            <input type="text" placeholder="ابحث باسم الموظف أو نوع الإجازة..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border p-2 pr-10 rounded" />
          </div>
          <select
            value={selectedEmployee}
            onChange={(e) => { setSelectedEmployee(e.target.value); setCurrentPage(1); }}
            className="border border-concrete-200 p-2 rounded-xl bg-concrete-0"
          >
            <option value="">كل الموظفين</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="bg-white p-4 rounded-lg shadow mb-4 flex items-center gap-4">
            <span className="font-bold text-lg">إجمالي أيام الإجازات المقبولة:</span>
            <span className="text-2xl font-bold text-petrol">{totalApprovedDays} يوم</span>
          </div>
        )}

        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-concrete-50 border-b">
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الموظف</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">النوع</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">من</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">إلى</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">عدد الأيام</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7}><EmptyData title="لا توجد طلبات إجازة" className="py-8" /></td></tr>
                  ) : (
                    paginated.map(leave => (
                      <tr key={leave.$id} className="border-b hover:bg-concrete-50">
                        <td className="p-3">{employeesMap[leave.employeeId] || leave.employeeId}</td>
                        <td className="p-3">{typeLabel(leave.type)}</td>
                        <td className="p-3">{leave.startDate}</td>
                        <td className="p-3">{leave.endDate}</td>
                        <td className="p-3 font-bold">{getDays(leave.startDate, leave.endDate)}</td>
                        <td className="p-3">
                          <Badge status={leave.status} />
                        </td>
                        <td className="p-3 flex gap-2">
                          {leave.status === 'معلق' && (
                            <>
                              <button onClick={() => updateStatus(leave.$id, 'موافق')} className="text-petrol hover:underline flex items-center gap-1"><Check size={16} /> قبول</button>
                              <button onClick={() => updateStatus(leave.$id, 'مرفوض')} className="text-danger hover:underline flex items-center gap-1"><XIcon size={16} /> رفض</button>
                            </>
                          )}
                          <button
                            onClick={() => openDeleteModal(leave.$id, employeesMap[leave.employeeId] || '')}
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
            </Card>
            <div className="flex items-center justify-between mt-2 text-sm text-concrete-500">
              <span>إجمالي النتائج: {filtered.length} طلب</span>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}

        <ConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف طلب الإجازة${deleteTarget?.name ? ` للموظف "${deleteTarget.name}"` : ''}؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}