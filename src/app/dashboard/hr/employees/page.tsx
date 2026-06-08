'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = async () => {
    try {
      const response = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
        Query.orderAsc('name'),
      ]);
      setEmployees(response.documents);
      setFilteredEmployees(response.documents);
    } catch (err: any) {
      toast.error('فشل تحميل الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(employees);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            emp.name?.toLowerCase().includes(term) ||
            emp.employeeNumber?.toLowerCase().includes(term) ||
            emp.jobTitle?.toLowerCase().includes(term) ||
            emp.department?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, employees]);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, deleteTarget.id);
      setEmployees((prev) => prev.filter((emp) => emp.$id !== deleteTarget.id));
      toast.success('تم حذف الموظف بنجاح');
    } catch (err: any) {
      toast.error('خطأ في الحذف: ' + err.message);
    } finally {
      setDeleting(false);
      setModalOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">الموظفون</h1>
          <Link
            href="/dashboard/hr/employees/new"
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={18} /> إضافة موظف جديد
          </Link>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث باسم، رقم، مسمى، أو قسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <p>جارٍ تحميل البيانات...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-right p-3">رقم الموظف</th>
                  <th className="text-right p-3">الاسم</th>
                  <th className="text-right p-3">المسمى الوظيفي</th>
                  <th className="text-right p-3">القسم</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-gray-500">
                      لا يوجد موظفون مطابقون
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.$id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono">{emp.employeeNumber}</td>
                      <td className="p-3 font-bold">{emp.name}</td>
                      <td className="p-3">{emp.jobTitle}</td>
                      <td className="p-3">{emp.department || '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-sm text-white ${
                            emp.status === 'يعمل'
                              ? 'bg-green-500'
                              : emp.status === 'إجازة'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-3 flex gap-2">
                        <Link
                          href={`/dashboard/hr/employees/${emp.$id}`}
                          className="text-green-600 hover:underline flex items-center gap-1"
                        >
                          <Eye size={16} /> عرض
                        </Link>
                        <Link
                          href={`/dashboard/hr/employees/${emp.$id}/edit`}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Edit size={16} /> تعديل
                        </Link>
                        <button
                          onClick={() => openDeleteModal(emp.$id, emp.name)}
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
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف الموظف "${deleteTarget?.name}"؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}