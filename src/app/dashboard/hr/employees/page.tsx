'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Employee } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { listEmployees, deleteEmployee } from '@/lib/services/employees';
import { Query } from '@/lib/services';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import Badge from '@/components/Badge';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(
      (emp: Employee) =>
        emp.name?.toLowerCase().includes(term) ||
        emp.employeeNumber?.toLowerCase().includes(term) ||
        emp.jobTitle?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term)
    );
  }, [searchTerm, employees]);

  useEffect(() => {
    (async () => {
      try {
        const response = await listEmployees([
          Query.orderAsc('name'),
        ]);
        setEmployees(response.documents);
      } catch {
        toast.error('فشل تحميل الموظفين');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmployee(deleteTarget.id);
      setEmployees((prev) => prev.filter((emp) => emp.$id !== deleteTarget.id));
      toast.success('تم حذف الموظف بنجاح');
    } catch (err: unknown) {
      toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err)));
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
            className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark"
          >
            <Plus size={18} /> إضافة موظف جديد
          </Link>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
          <input
            type="text"
            placeholder="ابحث باسم، رقم، مسمى، أو قسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-concrete-200 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-petrol"
          />
        </div>

        {loading ? (
          <p>جارٍ تحميل البيانات...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-concrete-50 border-b">
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">رقم الموظف</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الاسم</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المسمى الوظيفي</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">القسم</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-concrete-500">
                      لا يوجد موظفون مطابقون
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.$id} className="border-b hover:bg-concrete-50">
                      <td className="p-3 font-mono">{emp.employeeNumber}</td>
                      <td className="p-3 font-bold">{emp.name}</td>
                      <td className="p-3">{emp.jobTitle}</td>
                      <td className="p-3">{emp.department || '-'}</td>
                      <td className="p-3">
                        <Badge status={emp.status} />
                      </td>
                      <td className="p-3 flex gap-2">
                        <Link
                          href={`/dashboard/hr/employees/${emp.$id}`}
                          className="text-petrol hover:underline flex items-center gap-1"
                        >
                          <Eye size={16} /> عرض
                        </Link>
                        <Link
                          href={`/dashboard/hr/employees/${emp.$id}/edit`}
                          className="text-petrol hover:underline flex items-center gap-1"
                        >
                          <Edit size={16} /> تعديل
                        </Link>
                        <button
                          onClick={() => openDeleteModal(emp.$id, emp.name)}
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