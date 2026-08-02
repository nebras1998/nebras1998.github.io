'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Query } from '@/lib/services';
import { getInvoice, updateInvoice } from '@/lib/services/invoices';
import { getClient } from '@/lib/services/clients';
import { listPayments, createPayment, deletePayment } from '@/lib/services/payments';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import type { Invoice, Payment, InvoiceItem } from '@/types';
import Badge from '@/components/Badge';
import Card from '@/components/Card';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [clientName, setClientName] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('نقداً');
  const [payNotes, setPayNotes] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const inv = await getInvoice(invoiceId);
        setInvoice(inv);
        if (inv.clientId) {
          const client = await getClient(inv.clientId);
          setClientName(client.name);
        }
        const pays = await listPayments([
          Query.equal('invoiceId', invoiceId),
          Query.orderAsc('paymentDate'),
        ]);
        setPayments(pays.documents as unknown as Payment[]);
      } catch {
        toast.error('فشل تحميل الفاتورة');
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice ? invoice.total - totalPaid : 0;

  const updateInvoiceAmounts = async (paid: number, rem: number) => {
    await updateInvoice(invoiceId, {
      paidAmount: paid,
      remainingAmount: rem,
      status: rem <= 0 ? 'مدفوعة' : 'صادرة',
    });
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setAddingPayment(true);
    try {
      await createPayment('unique()', {
        invoiceId,
        amount: parseFloat(payAmount),
        paymentDate: payDate,
        method: payMethod as 'نقدي' | 'شيك' | 'تحويل بنكي' | 'بطاقة',
        notes: payNotes,
      });
      const newPaid = totalPaid + parseFloat(payAmount);
      const newRemaining = invoice!.total - newPaid;
      await updateInvoiceAmounts(newPaid, newRemaining);
      toast.success('تم تسجيل الدفعة');
      setPayAmount('');
      setPayNotes('');
      (async () => {
        try {
          const inv = await getInvoice(invoiceId);
          setInvoice(inv);
          if (inv.clientId) {
            const client = await getClient(inv.clientId);
            setClientName(client.name);
          }
          const pays = await listPayments([
            Query.equal('invoiceId', invoiceId),
            Query.orderAsc('paymentDate'),
          ]);
          setPayments(pays.documents as unknown as Payment[]);
        } catch {
          toast.error('فشل تحميل الفاتورة');
        }
      })();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'خطأ غير معروف');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const paymentToDelete = payments.find(p => p.$id === paymentId);
      if (!paymentToDelete) return;
      await deletePayment(paymentId);
      const newPaid = totalPaid - paymentToDelete.amount;
      const newRemaining = invoice!.total - newPaid;
      await updateInvoiceAmounts(newPaid, newRemaining);
      toast.success('تم حذف الدفعة');
      setDeleteModal(false);
      setDeleteTarget(null);
      (async () => {
        try {
          const inv = await getInvoice(invoiceId);
          setInvoice(inv);
          if (inv.clientId) {
            const client = await getClient(inv.clientId);
            setClientName(client.name);
          }
          const pays = await listPayments([
            Query.equal('invoiceId', invoiceId),
            Query.orderAsc('paymentDate'),
          ]);
          setPayments(pays.documents as unknown as Payment[]);
        } catch {
          toast.error('فشل تحميل الفاتورة');
        }
      })();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'خطأ غير معروف');
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!invoice) return <AuthGuard><DashboardLayout><p className="text-center p-10 text-danger">الفاتورة غير موجودة</p></DashboardLayout></AuthGuard>;

  const items: InvoiceItem[] = invoice.items
    ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items)
    : [];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">فاتورة {invoice.invoiceNumber}</h1>
                <p className="text-concrete-500">العميل: {clientName}</p>
              </div>
              <Badge status={invoice.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
              <div><span className="text-concrete-500">التاريخ:</span> {invoice.issueDate}</div>
              <div><span className="text-concrete-500">الاستحقاق:</span> {invoice.dueDate || '-'}</div>
              <div><span className="text-concrete-500">الإجمالي:</span> <strong>{invoice.total?.toFixed(2)} ₪</strong></div>
              <div><span className="text-concrete-500">المدفوع:</span> <strong className="text-petrol">{totalPaid.toFixed(2)} ₪</strong></div>
            </div>

            <table className="w-full border-t">
              <thead><tr className="border-b odd:bg-concrete-50"><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الخدمة</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الكمية</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">السعر</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجمالي</th></tr></thead>
              <tbody>
                {items.map((item: InvoiceItem, idx: number) => (
                  <tr key={idx} className="border-b"><td className="p-3">{item.description}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.unitPrice} ₪</td><td className="p-3 font-bold">{item.total} ₪</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 text-left text-lg font-bold">الإجمالي: {invoice.total?.toFixed(2)} ₪</div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">المدفوعات ({payments.length})</h2>
            {payments.length === 0 ? <p className="text-concrete-500">لا توجد دفعات بعد</p> : (
              <ul className="divide-y mb-4">
                {payments.map(p => (
                  <li key={p.$id} className="py-2 flex justify-between items-center">
                    <div><span className="font-bold">{p.amount.toFixed(2)} ₪</span> - {p.method} - {p.paymentDate}</div>
                    <button onClick={() => { setDeleteTarget(p.$id); setDeleteModal(true); }} className="text-danger"><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
            {invoice.status !== 'مدفوعة' && (
              <form onSubmit={handleAddPayment} className="border-t pt-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm">المبلغ</label>
                  <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} required className="border p-2 rounded w-28" />
                </div>
                <div>
                  <label className="block text-sm">التاريخ</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} required className="border p-2 rounded" />
                </div>
                <div>
                  <label className="block text-sm">الطريقة</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="border p-2 rounded">
                    <option>نقداً</option><option>شيك</option><option>تحويل بنكي</option>
                  </select>
                </div>
                <button type="submit" disabled={addingPayment} className="bg-petrol text-white px-4 py-2 rounded hover:bg-petrol-dark disabled:opacity-50 flex items-center gap-1"><Plus size={16} /> تسجيل دفعة</button>
              </form>
            )}
            {remaining > 0 && <p className="mt-2 text-sm text-concrete-500">المتبقي: <strong className="text-danger">{remaining.toFixed(2)} ₪</strong></p>}
          </Card>
        </div>

        <ConfirmModal isOpen={deleteModal} onClose={() => setDeleteModal(false)} onConfirm={() => deleteTarget && handleDeletePayment(deleteTarget)} title="حذف دفعة" message="هل أنت متأكد من حذف هذه الدفعة؟" confirmText="حذف" cancelText="إلغاء" />
      </DashboardLayout>
    </AuthGuard>
  );
}
