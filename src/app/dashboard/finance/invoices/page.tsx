'use client';

import { useEffect, useState } from 'react';
import { Query } from '@/lib/services';
import { listInvoices, deleteInvoice } from '@/lib/services/invoices';
import { listClients } from '@/lib/services/clients';
import { computeRemainingAmount } from '@/lib/invoice-math';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import Pagination from '@/components/Pagination';
import { Plus, Trash2, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import type { Invoice, Client } from '@/types';
import Badge from '@/components/Badge';

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const queries: string[] = [Query.orderDesc('$createdAt'), Query.limit(PAGE_SIZE), Query.offset((currentPage - 1) * PAGE_SIZE)];
        if (searchTerm.trim()) queries.push(Query.search('invoiceNumber', searchTerm));

        const [invRes, cliRes] = await Promise.all([
          listInvoices(queries),
          listClients([Query.limit(200)]),
        ]);
        const map: Record<string, string> = {};
        cliRes.documents.forEach((c) => (map[c.$id] = c.name));
        setClientsMap(map);
        setInvoices(invRes.documents);
        setTotalDocuments(invRes.total);
        setTotalPages(Math.ceil(invRes.total / PAGE_SIZE));
      } catch (err: unknown) {
        console.error('فشل تحميل الفواتير:', err);
        toast.error('فشل تحميل الفواتير');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, searchTerm]);

  const openDeleteModal = (id: string, number: string) => { setDeleteTarget({ id, number }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvoice(deleteTarget.id);
      setInvoices(prev => prev.filter(i => i.$id !== deleteTarget.id));
      toast.success('تم حذف الفاتورة');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message ?? 'خطأ في الحذف');
    }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">الفواتير</h1>
          <Link href="/dashboard/finance/invoices/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2">
            <Plus size={18} /> فاتورة جديدة
          </Link>
        </div>

        <div className="mb-5 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو العميل..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={9} />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الفاتورة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العميل</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">تاريخ الإصدار</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">تاريخ الاستحقاق</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجمالي</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المدفوع</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المتبقي</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <EmptyData title="لا توجد فواتير" className="py-8" />
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => {
                      const paid = inv.paidAmount ?? 0;
                      const remaining = inv.remainingAmount ?? computeRemainingAmount(inv.total, paid);
                      return (
                        <tr key={inv.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                          <td className="p-3 font-mono">{inv.invoiceNumber}</td>
                          <td className="p-3">{clientsMap[inv.clientId] || inv.clientId}</td>
                          <td className="p-3">{inv.issueDate}</td>
                          <td className="p-3">{inv.dueDate || '-'}</td>
                          <td className="p-3 font-bold">{inv.total?.toFixed(2)} ₪</td>
                          <td className="p-3 text-primary font-bold">{paid.toFixed(2)} ₪</td>
                          <td className={`p-3 font-bold ${remaining > 0 ? 'text-danger' : 'text-primary'}`}>
                            {remaining > 0 ? remaining.toFixed(2) : '0.00'} ₪
                          </td>
                          <td className="p-3"><Badge status={inv.status} /></td>
                          <td className="p-3 flex gap-2">
                            <Link
                              href={`/dashboard/finance/invoices/${inv.$id}`}
                              className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
                            >
                              <Eye size={16} /> عرض
                            </Link>
                            <button
                              onClick={() => openDeleteModal(inv.$id, inv.invoiceNumber)}
                              className="text-danger hover:text-danger-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-danger-bg flex items-center gap-1"
                            >
                              <Trash2 size={16} /> حذف
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>

            <div className="flex items-center justify-between mt-2 text-sm text-text-muted">
              <span>عرض {invoices.length} من أصل {totalDocuments} فاتورة</span>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}

        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف الفاتورة "${deleteTarget?.number}"؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
