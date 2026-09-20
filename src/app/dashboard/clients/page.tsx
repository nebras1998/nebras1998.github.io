'use client';

import { useEffect, useState } from 'react';
import type { Client } from '@/types';
import { listClients } from '@/lib/services/clients';
import { apiFetch } from '@/lib/api-client';
import { Query } from '@/lib/services';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const queries: string[] = [];
        if (searchTerm.trim()) {
          queries.push(Query.search('name', searchTerm));
        }
        queries.push(Query.orderDesc('$createdAt'));
        queries.push(Query.limit(PAGE_SIZE));
        queries.push(Query.offset((currentPage - 1) * PAGE_SIZE));
        const response = await listClients(queries);
        setClients(response.documents);
        setTotalDocuments(response.total);
        setTotalPages(Math.ceil(response.total / PAGE_SIZE));
      } catch {
        toast.error('فشل تحميل العملاء');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, searchTerm]);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch('/api/clients/' + deleteTarget.id, { method: 'DELETE' });
      toast.success('تم حذف العميل بنجاح');
      setClients(prev => prev.filter(c => c.$id !== deleteTarget.id));
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
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">العملاء</h1>
          <Link
            href="/dashboard/clients/new"
            className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة عميل جديد
          </Link>
        </div>

        <div className="mb-5 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="ابحث عن عميل..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={PAGE_SIZE} cols={6} />
        ) : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الاسم</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النوع</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الهاتف</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العنوان</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">البريد الإلكتروني</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyData title="لا يوجد عملاء مطابقين" className="py-8" />
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                        <td className="p-4 text-text-primary text-sm">{client.name}</td>
                        <td className="p-4 text-text-secondary text-sm">{client.type}</td>
                        <td className="p-4 text-text-primary text-sm">{client.phone}</td>
                        <td className="p-4 text-text-secondary text-sm">{client.address || '-'}</td>
                        <td className="p-4 text-text-secondary text-sm">{client.email || '-'}</td>
                        <td className="p-4 flex gap-1">
                          <Link
                            href={`/dashboard/clients/${client.$id}`}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"
                          >
                            <Eye size={15} /> عرض
                          </Link>
                          <Link
                            href={`/dashboard/clients/${client.$id}/edit`}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"
                          >
                            <Edit size={15} /> تعديل
                          </Link>
                          <button
                            onClick={() => openDeleteModal(client.$id, client.name)}
                            className="inline-flex items-center gap-1 text-danger hover:text-danger-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-danger-bg"
                          >
                            <Trash2 size={15} /> حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
              <p className="text-sm text-text-muted">
                عرض {clients.length} من أصل {totalDocuments} عميل
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        )}

        <ConfirmModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف العميل "${deleteTarget?.name}"؟`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}