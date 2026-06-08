'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Trash2, Search, Eye } from 'lucide-react';
import { DATABASE_ID, INVOICES_COLLECTION_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoices = async () => {
    try {
      const [invRes, cliRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [Query.orderDesc('$createdAt')]),
        databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(200)]),
      ]);
      const map: Record<string, string> = {};
      cliRes.documents.forEach((c: any) => (map[c.$id] = c.name));
      setClientsMap(map);
      setInvoices(invRes.documents);
      setFiltered(invRes.documents);
    } catch (err: any) {
      toast.error('فشل تحميل الفواتير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  useEffect(() => {
    if (!searchTerm.trim()) setFiltered(invoices);
    else {
      const term = searchTerm.toLowerCase();
      setFiltered(invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(term) || clientsMap[i.clientId]?.toLowerCase().includes(term)));
    }
  }, [searchTerm, invoices, clientsMap]);

  const openDeleteModal = (id: string, number: string) => { setDeleteTarget({ id, number }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, INVOICES_COLLECTION_ID, deleteTarget.id);
      setInvoices(prev => prev.filter(i => i.$id !== deleteTarget.id));
      toast.success('تم حذف الفاتورة');
    } catch (err: any) { toast.error(err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">الفواتير</h1>
          <Link href="/dashboard/finance/invoices/new" className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-green-700">
            <Plus size={18} /> فاتورة جديدة
          </Link>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو العميل..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
                  <th className="text-right p-3">رقم الفاتورة</th>
                  <th className="text-right p-3">العميل</th>
                  <th className="text-right p-3">تاريخ الإصدار</th>
                  <th className="text-right p-3">تاريخ الاستحقاق</th>
                  <th className="text-right p-3">الإجمالي</th>
                  <th className="text-right p-3">المدفوع</th>
                  <th className="text-right p-3">المتبقي</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-gray-500">
                      لا توجد فواتير
                    </td>
                  </tr>
                ) : (
                  filtered.map(inv => {
                    const paid = inv.paidAmount || 0;
                    const remaining = inv.remainingAmount ?? (inv.total - paid);
                    return (
                      <tr key={inv.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono">{inv.invoiceNumber}</td>
                        <td className="p-3">{clientsMap[inv.clientId] || inv.clientId}</td>
                        <td className="p-3">{inv.issueDate}</td>
                        <td className="p-3">{inv.dueDate || '-'}</td>
                        <td className="p-3 font-bold">{inv.total?.toFixed(2)} ₪</td>
                        <td className="p-3 text-green-600 font-bold">{paid.toFixed(2)} ₪</td>
                        <td className={`p-3 font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remaining > 0 ? remaining.toFixed(2) : '0.00'} ₪
                        </td>
                        <td className="p-3">{inv.status}</td>
                        <td className="p-3 flex gap-2">
                          <Link
                            href={`/dashboard/finance/invoices/${inv.$id}`}
                            className="text-green-600 hover:underline flex items-center gap-1"
                          >
                            <Eye size={16} /> عرض
                          </Link>
                          <button
                            onClick={() => openDeleteModal(inv.$id, inv.invoiceNumber)}
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