'use client';

import { useEffect, useState } from 'react';
import type { Sample, Project, Client } from '@/types';
import { listSamples, deleteSample } from '@/lib/services/samples';
import { listProjects } from '@/lib/services/projects';
import { listClients } from '@/lib/services/clients';
import { Query } from '@/lib/services';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
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
  const [lookupReady, setLookupReady] = useState(false);

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
      } catch {} finally { setLookupReady(true); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const queries: string[] = [];
        if (filterStatus) queries.push(Query.equal('status', filterStatus));
        if (filterType) queries.push(Query.equal('type', filterType));
        if (filterClient) queries.push(Query.equal('clientName', filterClient));
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
      await deleteSample(deleteTarget.id);
      toast.success('تم حذف العينة بنجاح');
      setCurrentPage(1);
    } catch (err: unknown) { toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const sampleTypes = [...new Set(samples.map((s) => s.type).filter(Boolean))];
  const clientOptions = [...new Set(samples.map((s) => s.clientName || clients[s.clientId || ''] || '').filter(Boolean))];

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">العينات</h1>
        <Link href="/dashboard/samples/new" className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark"><Plus size={18} /> إضافة عينة جديدة</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
          <input type="text" placeholder="ابحث عن عينة..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border border-concrete-200 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-petrol" />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-concrete-200 p-2 rounded">
          <option value="">كل الحالات</option>
          <option value="تم الاستلام">تم الاستلام</option>
          <option value="تحت الفحص">تحت الفحص</option>
          <option value="منجز">منجز</option>
          <option value="مرفوض">مرفوض</option>
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} className="border border-concrete-200 p-2 rounded">
          <option value="">كل الأنواع</option>
          {sampleTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setCurrentPage(1); }} className="border border-concrete-200 p-2 rounded">
          <option value="">كل العملاء</option>
          {clientOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={PAGE_SIZE} cols={7} /> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="bg-concrete-50 border-b"><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">رقم العينة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">النوع</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المشروع</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">العميل</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">تاريخ الأخذ</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th></tr></thead>
              <tbody>
                {samples.length === 0 ? <tr><td colSpan={7} className="text-center p-4 text-concrete-500">لا يوجد عينات مطابقة</td></tr> :
                  samples.map(sample => (
                    <tr key={sample.$id} className="border-b hover:bg-concrete-50">
                      <td className="p-3 font-mono">{sample.sampleNumber}</td>
                      <td className="p-3">{sample.type}</td>
                      <td className="p-3">{sample.projectName || projects[sample.projectId || ''] || sample.projectId}</td>
                      <td className="p-3">{sample.clientName || clients[sample.clientId || ''] || sample.clientId}</td>
                      <td className="p-3"><Badge status={sample.status} /></td>
                      <td className="p-3">{sample.samplingDate || '-'}</td>
                      <td className="p-3 flex gap-2">
                        <Link href={`/dashboard/samples/${sample.$id}`} className="text-petrol hover:underline flex items-center gap-1"><Eye size={16} /> عرض</Link>
                        <Link href={`/dashboard/samples/${sample.$id}/edit`} className="text-petrol hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
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
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
            <p className="text-sm text-concrete-500">عرض {samples.length} من أصل {totalDocuments} عينة</p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        </>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف العينة "${deleteTarget?.number}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}
