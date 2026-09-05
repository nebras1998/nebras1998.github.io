'use client';

import { useEffect, useState, useMemo } from 'react';
import { Query } from '@/lib/services';
import { listExpenses, deleteExpense } from '@/lib/services/expenses';
import { listVehicles } from '@/lib/services/vehicles';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import Pagination from '@/components/Pagination';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import type { Expense } from '@/types';

const PAGE_SIZE = 20;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = expenses;
    if (filterType) result = result.filter(e => e.type === filterType);
    if (filterMonth) result = result.filter(e => e.date?.startsWith(filterMonth));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.description?.toLowerCase().includes(term) ||
        e.vendor?.toLowerCase().includes(term) ||
        e.expenseNumber?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [searchTerm, filterType, filterMonth, expenses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    (async () => {
      try {
        const [expRes, vehRes] = await Promise.all([
          listExpenses([
            Query.orderDesc('date'),
            Query.limit(500),
          ]),
          listVehicles([Query.limit(50)]),
        ]);
        const vMap: Record<string, string> = {};
        vehRes.documents.forEach((v) => (vMap[v.$id] = v.plateNumber));
        setVehiclesMap(vMap);
        setExpenses(expRes.documents as unknown as Expense[]);
      } catch (err: unknown) {
        console.error('فشل تحميل المصروفات:', err);
        toast.error('فشل تحميل المصروفات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  const openDeleteModal = (id: string) => { setDeleteTarget(id); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget);
      setExpenses(prev => prev.filter(e => e.$id !== deleteTarget));
      toast.success('تم حذف المصروف');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('خطأ: ' + (e.message ?? 'حدث خطأ'));
    }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">المصروفات</h1>
          <Link href="/dashboard/finance/expenses/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
            <Plus size={18} /> إضافة مصروف
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200" />
          </div>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded-xl bg-surface">
            <option value="">كل الأنواع</option>
            <option value="سولار">سولار</option>
            <option value="صيانة">صيانة</option>
            <option value="شراء مواد">شراء مواد</option>
            <option value="رواتب">رواتب</option>
            <option value="إيجار">إيجار</option>
            <option value="أخرى">أخرى</option>
          </select>
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded-xl bg-surface" />
        </div>

        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم المصروف</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النوع</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المبلغ</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">التاريخ</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المركبة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">البائع</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7}><EmptyData title="لا توجد مصروفات" className="py-8" /></td></tr>
                  ) : (
                    paginated.map(exp => (
                      <tr key={exp.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                        <td className="p-3 font-mono">{exp.expenseNumber}</td>
                        <td className="p-3">{exp.type}</td>
                        <td className="p-3 font-bold">{exp.amount?.toFixed(2)} ₪</td>
                        <td className="p-3">{exp.date}</td>
                        <td className="p-3">{vehiclesMap[exp.vehicleId ?? ''] || '-'}</td>
                        <td className="p-3">{exp.vendor || '-'}</td>
                        <td className="p-3 flex gap-2">
                          <Link href={`/dashboard/finance/expenses/${exp.$id}/edit`} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1">
                            <Edit size={16} /> تعديل
                          </Link>
                          <button onClick={() => openDeleteModal(exp.$id)} className="text-danger hover:text-danger-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-danger-bg flex items-center gap-1">
                            <Trash2 size={16} /> حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>

            <div className="flex items-center justify-between mt-2 text-sm text-text-muted">
              <span>إجمالي النتائج: {filtered.length} مصروف</span>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

            {filtered.length > 0 && (
              <Card className="text-left text-lg font-bold mt-4">
                إجمالي المصروفات: {totalAmount.toFixed(2)} ₪
              </Card>
            )}
          </>
        )}
        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذا المصروف؟"
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
