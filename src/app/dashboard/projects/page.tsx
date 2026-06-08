'use client';

import { useEffect, useState, useCallback } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { DATABASE_ID, PROJECTS_COLLECTION_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queries: string[] = [];

      if (filterStatus) queries.push(Query.equal('status', filterStatus));
      if (filterClient) queries.push(Query.equal('clientId', filterClient));
      if (searchTerm.trim()) {
        queries.push(Query.search('name', searchTerm));
      }

      queries.push(Query.orderDesc('$createdAt'));
      queries.push(Query.limit(PAGE_SIZE));
      queries.push(Query.offset((currentPage - 1) * PAGE_SIZE));

      const projectsRes = await databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, queries);

      setProjects(projectsRes.documents);
      setTotalDocuments(projectsRes.total);
      setTotalPages(Math.ceil(projectsRes.total / PAGE_SIZE));

      if (Object.keys(clientsMap).length === 0) {
        const clientsRes = await databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(200)]);
        const map: Record<string, string> = {};
        clientsRes.documents.forEach((c: any) => (map[c.$id] = c.name));
        setClientsMap(map);
      }
    } catch (err: any) {
      toast.error('فشل تحميل المشاريع');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterClient, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterClient, searchTerm]);

  const openDeleteModal = (id: string, name: string) => { setDeleteTarget({ id, name }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, deleteTarget.id);
      toast.success('تم حذف المشروع بنجاح');
      fetchData();
    } catch (err: any) { toast.error('خطأ في الحذف: ' + err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const clientOptions = Object.entries(clientsMap);

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">المشاريع</h1>
        <Link href="/dashboard/projects/new" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"><Plus size={18} /> إضافة مشروع جديد</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ابحث عن مشروع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 p-2 rounded">
          <option value="">كل الحالات</option>
          <option value="نشط">نشط</option>
          <option value="مكتمل">مكتمل</option>
          <option value="متوقف">متوقف</option>
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-300 p-2 rounded">
          <option value="">كل العملاء</option>
          {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={PAGE_SIZE} cols={6} /> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="bg-gray-50 border-b"><th className="text-right p-3">رقم المشروع</th><th className="text-right p-3">اسم المشروع</th><th className="text-right p-3">العميل</th><th className="text-right p-3">الموقع</th><th className="text-right p-3">الحالة</th><th className="text-right p-3">الإجراءات</th></tr></thead>
              <tbody>
                {projects.length === 0 ? <tr><td colSpan={6} className="text-center p-4 text-gray-500">لا يوجد مشاريع مطابقة</td></tr> :
                  projects.map(project => (
                    <tr key={project.$id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{project.projectNumber}</td>
                      <td className="p-3">{project.name}</td>
                      <td className="p-3">{clientsMap[project.clientId] || project.clientId}</td>
                      <td className="p-3">{project.location}</td>
                      <td className="p-3">{project.status}</td>
                      <td className="p-3 flex gap-2">
                        <Link href={`/dashboard/projects/${project.$id}`} className="text-green-600 hover:underline flex items-center gap-1"><Eye size={16} /> عرض</Link>
                        <Link href={`/dashboard/projects/${project.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                        <button onClick={() => openDeleteModal(project.$id, project.name)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
            <p className="text-sm text-gray-500">عرض {projects.length} من أصل {totalDocuments} مشروع</p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        </>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف المشروع "${deleteTarget?.name}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}