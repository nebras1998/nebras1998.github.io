'use client';

import { useEffect, useState } from 'react';
import type { Project, Client } from '@/types';
import { listProjects, listClients, deleteProject } from '@/lib/services';
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
import Badge from '@/components/Badge';

const PAGE_SIZE = 15;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
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

  useEffect(() => {
    (async () => {
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
        const projectsRes = await listProjects(queries);
        setProjects(projectsRes.documents);
        setTotalDocuments(projectsRes.total);
        setTotalPages(Math.ceil(projectsRes.total / PAGE_SIZE));
        if (Object.keys(clientsMap).length === 0) {
          const clientsRes = await listClients([Query.limit(200)]);
          const map: Record<string, string> = {};
          (clientsRes.documents as Client[]).forEach((c) => (map[c.$id] = c.name));
          setClientsMap(map);
        }
      } catch {
        toast.error('فشل تحميل المشاريع');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, filterStatus, filterClient, searchTerm, clientsMap]);

  const openDeleteModal = (id: string, name: string) => { setDeleteTarget({ id, name }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      toast.success('تم حذف المشروع بنجاح');
      setCurrentPage(1);
    } catch (err: unknown) { toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const clientOptions = Object.entries(clientsMap);

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">المشاريع</h1>
        <Link href="/dashboard/projects/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2"><Plus size={18} /> إضافة مشروع جديد</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="ابحث عن مشروع..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-border bg-surface p-3 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200">
          <option value="">كل الحالات</option>
          <option value="نشط">نشط</option>
          <option value="مكتمل">مكتمل</option>
          <option value="متوقف">متوقف</option>
        </select>
        <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setCurrentPage(1); }} className="border border-border bg-surface p-3 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200">
          <option value="">كل العملاء</option>
          {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={PAGE_SIZE} cols={6} /> : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="bg-surface-dim border-b border-border"><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم المشروع</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">اسم المشروع</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العميل</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الموقع</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th></tr></thead>
              <tbody>
                {projects.length === 0 ? <tr><td colSpan={6}><EmptyData title="لا يوجد مشاريع مطابقة" className="py-8" /></td></tr> :
                  projects.map(project => (
                    <tr key={project.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                      <td className="p-4 text-text-primary text-sm font-mono">{project.projectNumber}</td>
                      <td className="p-4 text-text-primary text-sm">{project.name}</td>
                      <td className="p-4 text-text-secondary text-sm">{clientsMap[project.clientId] || project.clientId}</td>
                      <td className="p-4 text-text-secondary text-sm">{project.location}</td>
                      <td className="p-4"><Badge status={project.status} /></td>
                      <td className="p-4 flex gap-1">
                        <Link href={`/dashboard/projects/${project.$id}`} className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"><Eye size={15} /> عرض</Link>
                        <Link href={`/dashboard/projects/${project.$id}/edit`} className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"><Edit size={15} /> تعديل</Link>
                        <button onClick={() => openDeleteModal(project.$id, project.name)} className="inline-flex items-center gap-1 text-danger hover:text-danger-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-danger-bg"><Trash2 size={15} /> حذف</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </Card>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
            <p className="text-sm text-text-muted">عرض {projects.length} من أصل {totalDocuments} مشروع</p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        </>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف المشروع "${deleteTarget?.name}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}