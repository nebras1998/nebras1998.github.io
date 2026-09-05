'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Employee } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { listEmployees, deleteEmployee } from '@/lib/services/employees';
import { Query } from '@/lib/services';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import Badge from '@/components/Badge';
import TableSkeleton from '@/components/TableSkeleton';

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
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">الموظفون</h1>
          <Link
            href="/dashboard/hr/employees/new"
            className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2"
          >
            <Plus size={18} /> إضافة موظف جديد
          </Link>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="ابحث باسم، رقم، مسمى، أو قسم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-dim border-b border-border">
                  <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الموظف</th>
                  <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الاسم</th>
                  <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المسمى الوظيفي</th>
                  <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">القسم</th>
                  <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th>
                  <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyData title="لا يوجد موظفون مطابقون" className="py-8" />
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
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
                          className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
                        >
                          <Eye size={16} /> عرض
                        </Link>
                        <Link
                          href={`/dashboard/hr/employees/${emp.$id}/edit`}
                          className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
                        >
                          <Edit size={16} /> تعديل
                        </Link>
                        <button
                          onClick={() => openDeleteModal(emp.$id, emp.name)}
                          className="text-danger hover:text-danger-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-danger-bg flex items-center gap-1"
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