'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import Badge from '@/components/Badge';
import type { AttendanceRecord, Employee } from '@/types';
import { listAttendance, updateAttendance, deleteAttendance } from '@/lib/services/attendance';
import { listEmployees } from '@/lib/services/employees';
import { Query } from '@/lib/services';

const PAGE_SIZE = 25;

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [confirmModal, setConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        listAttendance([
          Query.orderDesc('date'),
          Query.limit(500),
        ]),
        listEmployees([Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      (empRes.documents as unknown as Employee[]).forEach((emp) => (map[emp.$id] = emp.name));
      setEmployeesMap(map);
      setRecords(attRes.documents as unknown as AttendanceRecord[]);
    } catch (err: unknown) {
      console.error('فشل تحميل بيانات الحضور:', err);
      toast.error('فشل تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = records;
    if (selectedEmployee) result = result.filter(r => r.employeeId === selectedEmployee);
    if (filterDate) result = result.filter(r => r.date === filterDate);
    else if (filterMonth) result = result.filter(r => r.date?.startsWith(filterMonth));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r =>
        employeesMap[r.employeeId]?.toLowerCase().includes(term) ||
        r.date?.includes(term)
      );
    }
    return result;
  }, [searchTerm, filterDate, filterMonth, selectedEmployee, records, employeesMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    (async () => {
      try {
        const [attRes, empRes] = await Promise.all([
          listAttendance([
            Query.orderDesc('date'),
            Query.limit(500),
          ]),
          listEmployees([Query.limit(200)]),
        ]);
        const map: Record<string, string> = {};
        (empRes.documents as unknown as Employee[]).forEach((emp) => (map[emp.$id] = emp.name));
        setEmployeesMap(map);
        setRecords(attRes.documents as unknown as AttendanceRecord[]);
      } catch (err: unknown) {
        console.error('فشل تحميل بيانات الحضور:', err);
        toast.error('فشل تحميل بيانات الحضور');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const calculateHours = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    const [h1, m1] = checkIn.split(':').map(Number);
    const [h2, m2] = checkOut.split(':').map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff <= 0) return null;
    return (diff / 60).toFixed(2);
  };

  const totalHours = filtered.reduce((sum, r) => {
    const h = calculateHours(r.checkIn, r.checkOut);
    return sum + (h ? parseFloat(h) : 0);
  }, 0);

  const toggleApproval = async (id: string, current: boolean) => {
    try {
      await updateAttendance(id, { approved: !current });
      fetchData();
      toast.success(current ? 'تم إلغاء الاعتماد' : 'تم اعتماد السجل');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('فشل تغيير حالة الاعتماد: ' + (e.message ?? ''));
    }
  };

  const openDeleteModal = (id: string) => {
    setDeleteTarget(id);
    setConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAttendance(deleteTarget);
      setRecords(prev => prev.filter(r => r.$id !== deleteTarget));
      toast.success('تم حذف السجل');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('فشل الحذف: ' + (e.message ?? ''));
    } finally {
      setConfirmModal(false);
      setDeleteTarget(null);
    }
  };

  const employeeOptions = Object.entries(employeesMap);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">الحضور والانصراف</h1>
          <Link href="/dashboard/hr/attendance/check-in" className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1">
            <Plus size={18} /> تسجيل حضور جماعي
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
            <input type="text" placeholder="ابحث باسم الموظف..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border p-2 pr-10 rounded" />
          </div>
          <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setCurrentPage(1); }} className="border p-2 rounded">
            <option value="">كل الموظفين</option>
            {employeeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth(''); setCurrentPage(1); }} className="border p-2 rounded" />
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate(''); setCurrentPage(1); }} className="border p-2 rounded" />
        </div>

        {loading ? <p>جارٍ التحميل...</p> : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-concrete-50 border-b">
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الموظف</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">التاريخ</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">وقت الحضور</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">وقت الانصراف</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">ساعات العمل</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">معتمد</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">ملاحظات</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={9} className="text-center p-4 text-concrete-500">لا توجد سجلات</td></tr>
                  ) : (
                    paginated.map(rec => {
                      const hours = calculateHours(rec.checkIn, rec.checkOut);
                      return (
                        <tr key={rec.$id} className="border-b hover:bg-concrete-50">
                          <td className="p-3">{employeesMap[rec.employeeId] || rec.employeeId}</td>
                          <td className="p-3">{rec.date}</td>
                          <td className="p-3">{rec.checkIn || '-'}</td>
                          <td className="p-3">{rec.checkOut || '-'}</td>
                          <td className="p-3 font-mono">{hours || '-'}</td>
                          <td className="p-3">
                            <Badge status={rec.status} />
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => toggleApproval(rec.$id, rec.approved ?? false)} title={rec.approved ? 'إلغاء الاعتماد' : 'اعتماد'}>
                              {rec.approved ? (
                                <CheckCircle size={20} className="text-petrol" />
                              ) : (
                                <XCircle size={20} className="text-concrete-500 hover:text-petrol" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 text-sm">{rec.notes || '-'}</td>
                          <td className="p-3 flex gap-2">
                            <Link href={`/dashboard/hr/attendance/${rec.$id}/edit`} className="text-petrol hover:underline flex items-center gap-1">
                              <Edit size={16} /> تعديل
                            </Link>
                            <button onClick={() => openDeleteModal(rec.$id)} className="text-danger hover:underline flex items-center gap-1">
                              <Trash2 size={16} /> حذف
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-sm text-concrete-500">
              <span>إجمالي النتائج: {filtered.length} سجل</span>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

            {filtered.length > 0 && (
              <div className="text-left text-lg font-bold bg-white p-4 rounded-lg shadow mt-4">
                إجمالي ساعات العمل: {totalHours.toFixed(2)} ساعة
              </div>
            )}
          </>
        )}

        <ConfirmModal
          isOpen={confirmModal}
          onClose={() => setConfirmModal(false)}
          onConfirm={handleDelete}
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف سجل الحضور هذا؟"
          confirmText="حذف"
          cancelText="إلغاء"
        />
      </DashboardLayout>
    </AuthGuard>
  );
}