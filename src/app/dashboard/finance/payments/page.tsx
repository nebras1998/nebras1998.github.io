'use client';

import { useEffect, useState, useMemo } from 'react';
import { Query } from '@/lib/services';
import { listPayments, deletePayment } from '@/lib/services/payments';
import { listInvoices, updateInvoice } from '@/lib/services/invoices';
import { listClients } from '@/lib/services/clients';
import { computeRemainingAmount } from '@/lib/invoice-math';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import Pagination from '@/components/Pagination';
import { Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import type { Payment, Invoice } from '@/types';

const PAGE_SIZE = 20;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoicesMap, setInvoicesMap] = useState<Record<string, Invoice>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const paysRes = await listPayments([
        Query.orderDesc('paymentDate'),
        Query.limit(500),
      ]);
      const allPayments = paysRes.documents;

      const invoiceIds = [...new Set(allPayments.map((p) => p.invoiceId))];
      const invoicesData: Record<string, Invoice> = {};
      if (invoiceIds.length > 0) {
        const invRes = await listInvoices([
          Query.equal('$id', invoiceIds),
          Query.limit(500),
        ]);
        invRes.documents.forEach((inv) => {
          invoicesData[inv.$id] = inv;
        });
      }
      setInvoicesMap(invoicesData);

      const clientIds = [...new Set(Object.values(invoicesData).map((inv) => inv.clientId))];
      const clientsData: Record<string, string> = {};
      if (clientIds.length > 0) {
        const cliRes = await listClients([
          Query.equal('$id', clientIds),
          Query.limit(500),
        ]);
        cliRes.documents.forEach((c) => {
          clientsData[c.$id] = c.name;
        });
      }
      setClientsMap(clientsData);

      setPayments(allPayments);
    } catch (err: unknown) {
      console.error('فشل تحميل المدفوعات:', err);
      toast.error('فشل تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return payments;
    const term = searchTerm.toLowerCase();
    return payments.filter((p) => {
      const inv = invoicesMap[p.invoiceId];
      const clientName = clientsMap[inv?.clientId ?? ''] || '';
      return (
        inv?.invoiceNumber?.toLowerCase().includes(term) ||
        clientName.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, payments, invoicesMap, clientsMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    (async () => {
      try {
        const paysRes = await listPayments([
          Query.orderDesc('paymentDate'),
          Query.limit(500),
        ]);
        const allPayments = paysRes.documents;

        const invoiceIds = [...new Set(allPayments.map((p) => p.invoiceId))];
        const invoicesData: Record<string, Invoice> = {};
        if (invoiceIds.length > 0) {
          const invRes = await listInvoices([
            Query.equal('$id', invoiceIds),
            Query.limit(500),
          ]);
          invRes.documents.forEach((inv) => {
            invoicesData[inv.$id] = inv;
          });
        }
        setInvoicesMap(invoicesData);

        const clientIds = [...new Set(Object.values(invoicesData).map((inv) => inv.clientId))];
        const clientsData: Record<string, string> = {};
        if (clientIds.length > 0) {
          const cliRes = await listClients([
            Query.equal('$id', clientIds),
            Query.limit(500),
          ]);
          cliRes.documents.forEach((c) => {
            clientsData[c.$id] = c.name;
          });
        }
        setClientsMap(clientsData);

        setPayments(allPayments);
      } catch (err: unknown) {
        console.error('فشل تحميل المدفوعات:', err);
        toast.error('فشل تحميل المدفوعات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDeleteModal = (paymentId: string) => {
    setDeleteTarget(paymentId);
    setDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const payment = payments.find((p) => p.$id === deleteTarget);
      if (!payment) return;

      await deletePayment(deleteTarget);

      const inv = invoicesMap[payment.invoiceId];
      if (inv) {
        const newPaid = (inv.paidAmount ?? 0) - payment.amount;
        const newRemaining = computeRemainingAmount(inv.total, newPaid);
        await updateInvoice(payment.invoiceId, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? 'مدفوعة' : 'صادرة',
        });
      }

      toast.success('تم حذف الدفعة');
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('خطأ في الحذف: ' + (e.message ?? 'حدث خطأ'));
    } finally {
      setDeleting(false);
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">سجل المدفوعات</h1>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو العميل..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المبلغ</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">التاريخ</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الطريقة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الفاتورة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العميل</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyData title="لا توجد مدفوعات" className="py-8" />
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => {
                      const inv = invoicesMap[p.invoiceId];
                      const clientName = clientsMap[inv?.clientId ?? ''] || '-';
                      return (
                        <tr key={p.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                          <td className="p-3 font-bold">{p.amount.toFixed(2)} ₪</td>
                          <td className="p-3">{p.paymentDate}</td>
                          <td className="p-3">{p.method || '-'}</td>
                          <td className="p-3 font-mono">{inv?.invoiceNumber || p.invoiceId}</td>
                          <td className="p-3">{clientName}</td>
                          <td className="p-3">
                            <button
                              onClick={() => openDeleteModal(p.$id)}
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
              <span>إجمالي النتائج: {filtered.length} دفعة</span>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}

        <ConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذه الدفعة؟ سيتغير رصيد الفاتورة المرتبطة."
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
