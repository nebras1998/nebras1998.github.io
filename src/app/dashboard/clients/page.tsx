'use client';

import { useEffect, useState, useCallback } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { DATABASE_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const queries: string[] = [];

      if (searchTerm.trim()) {
        queries.push(Query.search('name', searchTerm));
      }

      queries.push(Query.orderDesc('$createdAt'));
      queries.push(Query.limit(PAGE_SIZE));
      queries.push(Query.offset((currentPage - 1) * PAGE_SIZE));

      const response = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, queries);

      setClients(response.documents);
      setTotalDocuments(response.total);
      setTotalPages(Math.ceil(response.total / PAGE_SIZE));
    } catch (err: any) {
      toast.error('فشل تحميل العملاء');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, deleteTarget.id);
      toast.success('تم حذف العميل بنجاح');
      fetchClients();
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
          <h1 className="text-2xl font-bold">العملاء</h1>
          <Link
            href="/dashboard/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"
          >
            <Plus size={18} />
            إضافة عميل جديد
          </Link>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن عميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={PAGE_SIZE} cols={6} />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-right p-3">الاسم</th>
                    <th className="text-right p-3">النوع</th>
                    <th className="text-right p-3">الهاتف</th>
                    <th className="text-right p-3">العنوان</th>
                    <th className="text-right p-3">البريد الإلكتروني</th>
                    <th className="text-right p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-gray-500">
                        لا يوجد عملاء مطابقين
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{client.name}</td>
                        <td className="p-3">{client.type}</td>
                        <td className="p-3">{client.phone}</td>
                        <td className="p-3">{client.address || '-'}</td>
                        <td className="p-3">{client.email || '-'}</td>
                        <td className="p-3 flex gap-2">
                          <Link
                            href={`/dashboard/clients/${client.$id}`}
                            className="text-green-600 hover:underline flex items-center gap-1"
                          >
                            <Eye size={16} /> عرض
                          </Link>
                          <Link
                            href={`/dashboard/clients/${client.$id}/edit`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Edit size={16} /> تعديل
                          </Link>
                          <button
                            onClick={() => openDeleteModal(client.$id, client.name)}
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

            <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
              <p className="text-sm text-gray-500">
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