'use client';

import { useEffect, useState } from 'react';
import type { Sample } from '@/types';
import { listSamples } from '@/lib/services/samples';
import { listProjects } from '@/lib/services/projects';
import { listClients } from '@/lib/services/clients';
import { Query } from '@/lib/services';
import { apiFetch } from '@/lib/api-client';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import { Plus, Edit, Trash2, Search, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';
import Badge from '@/components/Badge';

const PAGE_SIZE = 15;

export default function SamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [projRes, clientRes] = await Promise.all([
          listProjects([Query.limit(500)]),
          listClients([Query.limit(500)]),
        ]);
        const projMap: Record<string, string> = {};
        for (const p of projRes.documents) projMap[p.$id] = p.name;
        const clientMap: Record<string, string> = {};
        for (const c of clientRes.documents) clientMap[c.$id] = c.name;
        setProjects(projMap);
        setClients(clientMap);
      } catch {}
    })();
  }, []);

  // تحميل أسماء العملاء والمشاريع المفقودة من خريطة التحميل المسبق (أكثر من 500 مستند)
  // بدلًا من عرض معرّف المستند الخام، نجلبه عند الحاجة. إذا فشل الجلب فهي غالبًا مشكلة
  // صلاحيات للمستند في Appwrite ولا يمكن حلها من الكود — نعرض المعرّف مع تحذير في الكنزول.
  const resolveNames = async (list: Sample[]) => {
    const clientIds = [...new Set(list.map((s) => s.clientId).filter((id): id is string => !!id))];
    const projectIds = [...new Set(list.map((s) => s.projectId).filter((id): id is string => !!id))];

    if (clientIds.length > 0) {
      try {
        const res = await listClients([Query.equal('$id', clientIds), Query.limit(clientIds.length)]);
        setClients((prev) => {
          const next = { ...prev };
          for (const c of res.documents) next[c.$id] = c.name;
          return next;
        });
      } catch (err) {
        console.warn('تعذر تحميل أسماء العملاء (قد تكون مشكلة صلاحيات للمستند):', err);
      }
    }
    if (projectIds.length > 0) {
      try {
        const res = await listProjects([Query.equal('$id', projectIds), Query.limit(projectIds.length)]);
        setProjects((prev) => {
          const next = { ...prev };
          for (const p of res.documents) next[p.$id] = p.name;
          return next;
        });
      } catch (err) {
        console.warn('تعذر تحميل أسماء المشاريع (قد تكون مشكلة صلاحيات للمستند):', err);
      }
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const queries: string[] = [];
        if (filterStatus) queries.push(Query.equal('status', filterStatus));
        if (filterType) queries.push(Query.equal('type', filterType));
        if (filterClient) queries.push(Query.equal('clientId', filterClient));
        if (searchTerm.trim()) {
          queries.push(Query.search('sampleNumber', searchTerm));
        }
        queries.push(Query.orderDesc('$createdAt'));
        queries.push(Query.limit(PAGE_SIZE));
        queries.push(Query.offset((currentPage - 1) * PAGE_SIZE));
        const samplesRes = await listSamples(queries);
        setSamples(samplesRes.documents);
        setTotalDocuments(samplesRes.total);
        setTotalPages(Math.ceil(samplesRes.total / PAGE_SIZE));
        resolveNames(samplesRes.documents);
      } catch {
        toast.error('فشل تحميل العينات');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, filterStatus, filterType, filterClient, searchTerm]);

  const openDeleteModal = (id: string, number: string) => { setDeleteTarget({ id, number }); setModalOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch('/api/samples/' + deleteTarget.id, { method: 'DELETE' });
      toast.success('تم حذف العينة بنجاح');
      setCurrentPage(1);
    } catch (err: unknown) { toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const sampleTypes = [...new Set(samples.map((s) => s.type).filter(Boolean))];
  const clientOptions = [...new Map(
    samples
      .map((s) => (s.clientId ? [s.clientId, clients[s.clientId] || s.clientName || ''] as [string, string] : null))
      .filter((x): x is [string, string] => x !== null && x[1] !== '')
  ).values()];

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">العينات</h1>
        <Link href="/dashboard/samples/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2"><Plus size={18} /> إضافة عينة جديدة</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="ابحث عن عينة..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded">
          <option value="">كل الحالات</option>
          <option value="تم الاستلام">تم الاستلام</option>
          <option value="تحت الفحص">تحت الفحص</option>
          <option value="منجز">منجز</option>
          <option value="مرفوض">مرفوض</option>
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded">
          <option value="">كل الأنواع</option>
          {sampleTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded">
          <option value="">كل العملاء</option>
          {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={PAGE_SIZE} cols={7} /> : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="bg-surface-dim border-b border-border"><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم العينة</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النوع</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المشروع</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العميل</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">تاريخ الأخذ</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th></tr></thead>
              <tbody>
                {samples.length === 0 ? <tr><td colSpan={7}><EmptyData title="لا يوجد عينات مطابقة" className="py-8" /></td></tr> :
                  samples.map(sample => (
                    <tr key={sample.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                      <td className="p-3 font-mono">{sample.sampleNumber}</td>
                      <td className="p-3">{sample.type}</td>
                      <td className="p-3">{sample.projectName || projects[sample.projectId || ''] || sample.projectId}</td>
                      <td className="p-3">{sample.clientName || clients[sample.clientId || ''] || sample.clientId}</td>
                      <td className="p-3"><Badge status={sample.status} /></td>
                      <td className="p-3">{sample.samplingDate || '-'}</td>
                      <td className="p-3 flex gap-2">
                        <Link href={`/dashboard/samples/${sample.$id}`} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"><Eye size={16} /> عرض</Link>
                        <Link href={`/dashboard/samples/${sample.$id}/edit`} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                        <button
                          onClick={() => openDeleteModal(sample.$id, sample.sampleNumber)}
                          disabled={deleting}
                          className="text-danger hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          {deleting && deleteTarget?.number === sample.sampleNumber ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </Card>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
            <p className="text-sm text-text-muted">عرض {samples.length} من أصل {totalDocuments} عينة</p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        </>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف العينة "${deleteTarget?.number}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}
