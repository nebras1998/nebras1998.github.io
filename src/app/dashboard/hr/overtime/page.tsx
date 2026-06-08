'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, Check, X as XIcon, Trash2 } from 'lucide-react';
import { DATABASE_ID, OVERTIME_COLLECTION_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import TableSkeleton from '@/components/TableSkeleton';
import ConfirmModal from '@/components/ConfirmModal';

export default function OvertimePage() {
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // الفلاتر
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // للحذف
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [overRes, empRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, OVERTIME_COLLECTION_ID, [Query.orderDesc('date'), Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      empRes.documents.forEach((emp: any) => (map[emp.$id] = emp.name));
      setEmployeesMap(map);
      setOvertimes(overRes.documents);
      setFiltered(overRes.documents);
    } catch (err: any) {
      toast.error('فشل تحميل بيانات العمل الإضافي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // تطبيق جميع الفلاتر معًا
  useEffect(() => {
    let result = [...overtimes];

    if (selectedEmployee) {
      result = result.filter((o) => o.employeeId === selectedEmployee);
    }
    if (filterStatus) {
      result = result.filter((o) => o.status === filterStatus);
    }
    if (filterDate) {
      result = result.filter((o) => o.date === filterDate);
    } else if (filterMonth) {
      result = result.filter((o) => o.date?.startsWith(filterMonth));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          employeesMap[o.employeeId]?.toLowerCase().includes(term) ||
          o.reason?.toLowerCase().includes(term) ||
          o.date?.includes(term)
      );
    }
    setFiltered(result);
  }, [searchTerm, selectedEmployee, filterStatus, filterDate, filterMonth, overtimes, employeesMap]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await databases.updateDocument(DATABASE_ID, OVERTIME_COLLECTION_ID, id, { status: newStatus });
      toast.success(`تم ${newStatus === 'مقبول' ? 'قبول' : 'رفض'} الطلب`);
      fetchData();
    } catch (err: any) {
      toast.error('فشل تحديث الحالة: ' + err.message);
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
      await databases.deleteDocument(DATABASE_ID, OVERTIME_COLLECTION_ID, deleteTarget.id);
      setOvertimes((prev) => prev.filter((o) => o.$id !== deleteTarget.id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (err: any) {
      toast.error('خطأ في الحذف: ' + err.message);
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
          <Link href="/dashboard/hr/overtime/new" className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-purple-700">
            <Plus size={18} /> طلب عمل إضافي
          </Link>
        </div>

        {/* صف الفلاتر */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو السبب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border p-2 pr-10 rounded"
            />
          </div>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">كل الموظفين</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
            onChange={(e) => { setFilterDate(e.target.value); setFilterMonth(''); }}
            className="border p-2 rounded"
          />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setFilterDate(''); }}
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
                  <tr className="bg-gray-50 border-b">
                    <th className="text-right p-3">الموظف</th>
                    <th className="text-right p-3">التاريخ</th>
                    <th className="text-right p-3">الوقت</th>
                    <th className="text-right p-3">الساعات</th>
                    <th className="text-right p-3">السبب</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-4 text-gray-500">لا توجد طلبات</td></tr>
                  ) : (
                    filtered.map((ot) => (
                      <tr key={ot.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{employeesMap[ot.employeeId] || ot.employeeId}</td>
                        <td className="p-3">{ot.date}</td>
                        <td className="p-3">{ot.startTime && ot.endTime ? `${ot.startTime} - ${ot.endTime}` : '-'}</td>
                        <td className="p-3 font-bold">{ot.hours}</td>
                        <td className="p-3">{ot.reason || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-sm text-white ${
                            ot.status === 'مقبول' ? 'bg-green-500' : ot.status === 'مرفوض' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}>
                            {ot.status}
                          </span>
                        </td>
                        <td className="p-3 flex gap-2">
                          {ot.status === 'معلق' && (
                            <>
                              <button onClick={() => updateStatus(ot.$id, 'مقبول')} className="text-green-600 hover:underline flex items-center gap-1"><Check size={16} /> قبول</button>
                              <button onClick={() => updateStatus(ot.$id, 'مرفوض')} className="text-red-600 hover:underline flex items-center gap-1"><XIcon size={16} /> رفض</button>
                            </>
                          )}
                          <button
                            onClick={() => openDeleteModal(ot.$id, employeesMap[ot.employeeId] || '')}
                            className="text-red-600 hover:underline flex items-center gap-1"
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
            {filtered.length > 0 && (
              <div className="text-left text-lg font-bold bg-white p-4 rounded-lg shadow">
                إجمالي الساعات: {totalHours.toFixed(2)} ساعة
              </div>
            )}
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