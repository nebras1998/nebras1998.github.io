'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Trash2, Search } from 'lucide-react';
import {
  DATABASE_ID,
  PAYMENTS_COLLECTION_ID,
  INVOICES_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [invoicesMap, setInvoicesMap] = useState<Record<string, any>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      // جلب المدفوعات مرتبة تنازلياً
      const paysRes = await databases.listDocuments(DATABASE_ID, PAYMENTS_COLLECTION_ID, [
        Query.orderDesc('paymentDate'),
        Query.limit(500),
      ]);
      const allPayments = paysRes.documents;

      // جلب معرفات الفواتير المرتبطة
      const invoiceIds = [...new Set(allPayments.map((p: any) => p.invoiceId))];
      const invoicesData: Record<string, any> = {};
      if (invoiceIds.length > 0) {
        const invRes = await databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [
          Query.equal('$id', invoiceIds),
          Query.limit(500),
        ]);
        invRes.documents.forEach((inv: any) => {
          invoicesData[inv.$id] = inv;
        });
      }
      setInvoicesMap(invoicesData);

      // جلب أسماء العملاء المرتبطين بالفواتير
      const clientIds = [...new Set(Object.values(invoicesData).map((inv: any) => inv.clientId))];
      const clientsData: Record<string, string> = {};
      if (clientIds.length > 0) {
        const cliRes = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [
          Query.equal('$id', clientIds),
          Query.limit(500),
        ]);
        cliRes.documents.forEach((c: any) => {
          clientsData[c.$id] = c.name;
        });
      }
      setClientsMap(clientsData);

      setPayments(allPayments);
      setFiltered(allPayments);
    } catch (err: any) {
      toast.error('فشل تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // فلترة حسب رقم الفاتورة أو العميل
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(payments);
    } else {
      const term = searchTerm.toLowerCase();
      setFiltered(
        payments.filter((p) => {
          const inv = invoicesMap[p.invoiceId];
          const clientName = clientsMap[inv?.clientId] || '';
          return (
            inv?.invoiceNumber?.toLowerCase().includes(term) ||
            clientName.toLowerCase().includes(term)
          );
        })
      );
    }
  }, [searchTerm, payments, invoicesMap, clientsMap]);

  const openDeleteModal = (paymentId: string) => {
    setDeleteTarget(paymentId);
    setDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // نجلب الدفعة لحذفها ومعرفة قيمتها
      const payment = payments.find((p) => p.$id === deleteTarget);
      if (!payment) return;

      await databases.deleteDocument(DATABASE_ID, PAYMENTS_COLLECTION_ID, deleteTarget);

      // تحديث الفاتورة المرتبطة (تقليل المدفوع وزيادة المتبقي)
      const inv = invoicesMap[payment.invoiceId];
      if (inv) {
        const newPaid = (inv.paidAmount || 0) - payment.amount;
        const newRemaining = inv.total - newPaid;
        await databases.updateDocument(DATABASE_ID, INVOICES_COLLECTION_ID, payment.invoiceId, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? 'مدفوعة' : 'صادرة',
        });
      }

      toast.success('تم حذف الدفعة');
      // إعادة تحميل القائمة
      fetchData();
    } catch (err: any) {
      toast.error('خطأ في الحذف: ' + err.message);
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
          <h1 className="text-2xl font-bold">سجل المدفوعات</h1>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو العميل..."
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
                  <th className="text-right p-3">المبلغ</th>
                  <th className="text-right p-3">التاريخ</th>
                  <th className="text-right p-3">الطريقة</th>
                  <th className="text-right p-3">رقم الفاتورة</th>
                  <th className="text-right p-3">العميل</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-gray-500">
                      لا توجد مدفوعات
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const inv = invoicesMap[p.invoiceId];
                    const clientName = clientsMap[inv?.clientId] || '-';
                    return (
                      <tr key={p.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-bold">{p.amount.toFixed(2)} ₪</td>
                        <td className="p-3">{p.paymentDate}</td>
                        <td className="p-3">{p.method || '-'}</td>
                        <td className="p-3 font-mono">{inv?.invoiceNumber || p.invoiceId}</td>
                        <td className="p-3">{clientName}</td>
                        <td className="p-3">
                          <button
                            onClick={() => openDeleteModal(p.$id)}
                            className="text-red-600 hover:underline flex items-center gap-1"
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
          </div>
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