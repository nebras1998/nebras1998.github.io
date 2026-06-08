'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { DATABASE_ID, ATTENDANCE_COLLECTION_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // للتأكيد والحذف
  const [confirmModal, setConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, ATTENDANCE_COLLECTION_ID, [Query.orderDesc('date'), Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      empRes.documents.forEach((emp: any) => (map[emp.$id] = emp.name));
      setEmployeesMap(map);
      setRecords(attRes.documents);
      setFiltered(attRes.documents);
    } catch (err: any) {
      toast.error('فشل تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // الفلاتر
  useEffect(() => {
    let result = records;
    if (selectedEmployee) result = result.filter(r => r.employeeId === selectedEmployee);
    if (filterDate) result = result.filter(r => r.date === filterDate);
    else if (filterMonth) result = result.filter(r => r.date?.startsWith(filterMonth));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => employeesMap[r.employeeId]?.toLowerCase().includes(term) || r.date?.includes(term));
    }
    setFiltered(result);
  }, [searchTerm, filterDate, filterMonth, selectedEmployee, records, employeesMap]);

  const calculateHours = (checkIn: string, checkOut: string) => {
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
      await databases.updateDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, id, { approved: !current });
      fetchData(); // إعادة التحميل
      toast.success(current ? 'تم إلغاء الاعتماد' : 'تم اعتماد السجل');
    } catch (err: any) {
      toast.error('فشل تغيير حالة الاعتماد: ' + err.message);
    }
  };

  const openDeleteModal = (id: string) => {
    setDeleteTarget(id);
    setConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await databases.deleteDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, deleteTarget);
      setRecords(prev => prev.filter(r => r.$id !== deleteTarget));
      toast.success('تم حذف السجل');
    } catch (err: any) {
      toast.error('فشل الحذف: ' + err.message);
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
          <Link href="/dashboard/hr/attendance/check-in" className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-1">
            <Plus size={18} /> تسجيل حضور جماعي
          </Link>
        </div>

        {/* الفلاتر */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ابحث باسم الموظف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 pr-10 rounded" />
          </div>
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="border p-2 rounded">
            <option value="">كل الموظفين</option>
            {employeeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={e => { setFilterDate(e.target.value); setFilterMonth(''); }} className="border p-2 rounded" />
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setFilterDate(''); }} className="border p-2 rounded" />
        </div>

        {loading ? <p>جارٍ التحميل...</p> : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-right p-3">الموظف</th>
                    <th className="text-right p-3">التاريخ</th>
                    <th className="text-right p-3">وقت الحضور</th>
                    <th className="text-right p-3">وقت الانصراف</th>
                    <th className="text-right p-3">ساعات العمل</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">معتمد</th>
                    <th className="text-right p-3">ملاحظات</th>
                    <th className="text-right p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center p-4 text-gray-500">لا توجد سجلات</td></tr>
                  ) : (
                    filtered.map(rec => {
                      const hours = calculateHours(rec.checkIn, rec.checkOut);
                      return (
                        <tr key={rec.$id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{employeesMap[rec.employeeId] || rec.employeeId}</td>
                          <td className="p-3">{rec.date}</td>
                          <td className="p-3">{rec.checkIn || '-'}</td>
                          <td className="p-3">{rec.checkOut || '-'}</td>
                          <td className="p-3 font-mono">{hours || '-'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-sm text-white ${
                              rec.status === 'حاضر' ? 'bg-green-500' : rec.status === 'متأخر' ? 'bg-yellow-500' : rec.status === 'إجازة' ? 'bg-blue-500' : 'bg-red-500'
                            }`}>{rec.status}</span>
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => toggleApproval(rec.$id, rec.approved)} title={rec.approved ? 'إلغاء الاعتماد' : 'اعتماد'}>
                              {rec.approved ? (
                                <CheckCircle size={20} className="text-green-600" />
                              ) : (
                                <XCircle size={20} className="text-gray-400 hover:text-green-600" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 text-sm">{rec.notes || '-'}</td>
                          <td className="p-3 flex gap-2">
                            <Link href={`/dashboard/hr/attendance/${rec.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1">
                              <Edit size={16} /> تعديل
                            </Link>
                            <button onClick={() => openDeleteModal(rec.$id)} className="text-red-600 hover:underline flex items-center gap-1">
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
            {filtered.length > 0 && (
              <div className="text-left text-lg font-bold bg-white p-4 rounded-lg shadow">
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