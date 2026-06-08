'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, Check, X as XIcon, Trash2 } from 'lucide-react';
import { DATABASE_ID, LEAVE_REQUESTS_COLLECTION_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // للحذف
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [leavesRes, empRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, LEAVE_REQUESTS_COLLECTION_ID, [Query.orderDesc('$createdAt'), Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      empRes.documents.forEach((emp: any) => (map[emp.$id] = emp.name));
      setEmployeesMap(map);
      setLeaves(leavesRes.documents);
      setFiltered(leavesRes.documents);
    } catch (err: any) {
      toast.error('فشل تحميل طلبات الإجازة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
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
    setFiltered(result);
  }, [searchTerm, selectedEmployee, leaves, employeesMap]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await databases.updateDocument(DATABASE_ID, LEAVE_REQUESTS_COLLECTION_ID, id, { status: newStatus });
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
      await databases.deleteDocument(DATABASE_ID, LEAVE_REQUESTS_COLLECTION_ID, deleteTarget.id);
      setLeaves((prev) => prev.filter((l) => l.$id !== deleteTarget.id));
      toast.success('تم حذف الطلب بنجاح');
    } catch (err: any) {
      toast.error('خطأ في الحذف: ' + err.message);
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
    .filter((l) => l.status === 'مقبول')
    .reduce((sum, l) => sum + getDays(l.startDate, l.endDate), 0);

  const employeeOptions = Object.entries(employeesMap);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">إدارة الإجازات</h1>
          <Link href="/dashboard/hr/leaves/new" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700">
            <Plus size={18} /> طلب إجازة جديد
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ابحث باسم الموظف أو نوع الإجازة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 pr-10 rounded" />
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
        </div>

        {selectedEmployee && (
          <div className="bg-white p-4 rounded-lg shadow mb-4 flex items-center gap-4">
            <span className="font-bold text-lg">إجمالي أيام الإجازات المقبولة:</span>
            <span className="text-2xl font-bold text-green-600">{totalApprovedDays} يوم</span>
          </div>
        )}

        {loading ? <p>جارٍ تحميل البيانات...</p> : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-right p-3">الموظف</th>
                  <th className="text-right p-3">النوع</th>
                  <th className="text-right p-3">من</th>
                  <th className="text-right p-3">إلى</th>
                  <th className="text-right p-3">عدد الأيام</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-4 text-gray-500">لا توجد طلبات إجازة</td></tr>
                ) : (
                  filtered.map(leave => (
                    <tr key={leave.$id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{employeesMap[leave.employeeId] || leave.employeeId}</td>
                      <td className="p-3">{typeLabel(leave.type)}</td>
                      <td className="p-3">{leave.startDate}</td>
                      <td className="p-3">{leave.endDate}</td>
                      <td className="p-3 font-bold">{getDays(leave.startDate, leave.endDate)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm text-white ${
                          leave.status === 'مقبول' ? 'bg-green-500' : leave.status === 'مرفوض' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="p-3 flex gap-2">
                        {leave.status === 'معلق' && (
                          <>
                            <button onClick={() => updateStatus(leave.$id, 'مقبول')} className="text-green-600 hover:underline flex items-center gap-1"><Check size={16} /> قبول</button>
                            <button onClick={() => updateStatus(leave.$id, 'مرفوض')} className="text-red-600 hover:underline flex items-center gap-1"><XIcon size={16} /> رفض</button>
                          </>
                        )}
                        <button
                          onClick={() => openDeleteModal(leave.$id, employeesMap[leave.employeeId] || '')}
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