'use client';

import { useEffect, useState, useCallback } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import {
  DATABASE_ID,
  SAMPLES_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

export default function SamplesPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
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

  const fetchData = useCallback(async () => {
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

      const samplesRes = await databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, queries);

      setSamples(samplesRes.documents);
      setTotalDocuments(samplesRes.total);
      setTotalPages(Math.ceil(samplesRes.total / PAGE_SIZE));

      // جلب البيانات المساعدة مرة واحدة
      if (Object.keys(projectsMap).length === 0) {
        const [projectsRes, clientsRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [Query.limit(500)]),
          databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(200)]),
        ]);

        const pMap: Record<string, string> = {};
        projectsRes.documents.forEach((p: any) => (pMap[p.$id] = p.name));
        setProjectsMap(pMap);

        const cMap: Record<string, string> = {};
        clientsRes.documents.forEach((c: any) => (cMap[c.$id] = c.name));
        setClientsMap(cMap);
      }
    } catch (err: any) {
      toast.error('فشل تحميل العينات');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterType, filterClient, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterType, filterClient, searchTerm]);

  const openDeleteModal = (id: string, number: string) => { setDeleteTarget({ id, number }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, deleteTarget.id);
      toast.success('تم حذف العينة بنجاح');
      fetchData();
    } catch (err: any) { toast.error('خطأ في الحذف: ' + err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const sampleTypes = [...new Set(samples.map((s) => s.type).filter(Boolean))];
  const clientOptions = Object.entries(clientsMap);

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">العينات</h1>
        <Link href="/dashboard/samples/new" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"><Plus size={18} /> إضافة عينة جديدة</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="ابحث عن عينة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 p-2 rounded">
          <option value="">كل الحالات</option>
          <option value="تم الاستلام">تم الاستلام</option>
          <option value="تحت الفحص">تحت الفحص</option>
          <option value="منجز">منجز</option>
          <option value="مرفوض">مرفوض</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-300 p-2 rounded">
          <option value="">كل الأنواع</option>
          {sampleTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-300 p-2 rounded">
          <option value="">كل العملاء</option>
          {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={PAGE_SIZE} cols={7} /> : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="bg-gray-50 border-b"><th className="text-right p-3">رقم العينة</th><th className="text-right p-3">النوع</th><th className="text-right p-3">المشروع</th><th className="text-right p-3">العميل</th><th className="text-right p-3">الحالة</th><th className="text-right p-3">تاريخ الأخذ</th><th className="text-right p-3">الإجراءات</th></tr></thead>
              <tbody>
                {samples.length === 0 ? <tr><td colSpan={7} className="text-center p-4 text-gray-500">لا يوجد عينات مطابقة</td></tr> :
                  samples.map(sample => (
                    <tr key={sample.$id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono">{sample.sampleNumber}</td>
                      <td className="p-3">{sample.type}</td>
                      <td className="p-3">{projectsMap[sample.projectId] || sample.projectId}</td>
                      <td className="p-3">{clientsMap[sample.clientId] || sample.clientId}</td>
                      <td className="p-3">{sample.status}</td>
                      <td className="p-3">{sample.samplingDate || '-'}</td>
                      <td className="p-3 flex gap-2">
                        <Link href={`/dashboard/samples/${sample.$id}`} className="text-green-600 hover:underline flex items-center gap-1"><Eye size={16} /> عرض</Link>
                        <Link href={`/dashboard/samples/${sample.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                        <button onClick={() => openDeleteModal(sample.$id, sample.sampleNumber)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
            <p className="text-sm text-gray-500">عرض {samples.length} من أصل {totalDocuments} عينة</p>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        </>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف العينة "${deleteTarget?.number}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}