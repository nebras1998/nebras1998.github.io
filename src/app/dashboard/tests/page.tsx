'use client';

import { useEffect, useState, useCallback } from 'react';
import { databases, storage } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import {
  DATABASE_ID,
  TESTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
  REPORTS_BUCKET_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 15;

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [samplesMap, setSamplesMap] = useState<Record<string, string>>({});
  const [employeesMap, setEmployeesMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterClient, setFilterClient] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queries: string[] = [];

      if (filterStatus) queries.push(Query.equal('status', filterStatus));
      if (filterEmployee) queries.push(Query.equal('assignedTo', filterEmployee));
      if (filterClient) queries.push(Query.equal('clientId', filterClient));
      if (searchTerm.trim()) {
        queries.push(Query.search('testName', searchTerm));
      }

      queries.push(Query.orderDesc('$createdAt'));
      queries.push(Query.limit(PAGE_SIZE));
      queries.push(Query.offset((currentPage - 1) * PAGE_SIZE));

      const testsRes = await databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, queries);

      setTests(testsRes.documents);
      setTotalDocuments(testsRes.total);
      setTotalPages(Math.ceil(testsRes.total / PAGE_SIZE));

      if (Object.keys(samplesMap).length === 0) {
        const [samplesRes, employeesRes, clientsRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [Query.limit(500)]),
          databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(200)]),
        ]);

        const sMap: Record<string, string> = {};
        samplesRes.documents.forEach((s: any) => (sMap[s.$id] = s.sampleNumber));
        setSamplesMap(sMap);

        const eMap: Record<string, string> = {};
        employeesRes.documents.forEach((emp: any) => (eMap[emp.$id] = emp.name));
        setEmployeesMap(eMap);

        const cMap: Record<string, string> = {};
        clientsRes.documents.forEach((c: any) => (cMap[c.$id] = c.name));
        setClientsMap(cMap);
      }
    } catch (err) {
      toast.error('فشل تحميل الفحوصات');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterEmployee, filterClient, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterEmployee, filterClient, searchTerm]);

  const openDeleteModal = (id: string, name: string) => { setDeleteTarget({ id, name }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const testDoc = await databases.getDocument(DATABASE_ID, TESTS_COLLECTION_ID, deleteTarget.id);
      if (testDoc.reportFileId) {
        try { await storage.deleteFile(REPORTS_BUCKET_ID, testDoc.reportFileId); } catch {}
      }
      await databases.deleteDocument(DATABASE_ID, TESTS_COLLECTION_ID, deleteTarget.id);
      toast.success('تم حذف الفحص بنجاح');
      fetchData();
    } catch (err: any) { toast.error('خطأ في حذف الفحص: ' + err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const employeeOptions = Object.entries(employeesMap);
  const clientOptions = Object.entries(clientsMap);

  // دالة لتنسيق التاريخ
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG');
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">الفحوصات</h1>
          <Link href="/dashboard/tests/new" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"><Plus size={18} /> إضافة فحص جديد</Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="ابحث عن فحص..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 p-2 pr-10 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 p-2 rounded">
            <option value="">كل الحالات</option>
            <option value="قيد الانتظار">قيد الانتظار</option>
            <option value="تحت الفحص">تحت الفحص</option>
            <option value="مكتمل">مكتمل</option>
            <option value="مرفوض">مرفوض</option>
          </select>
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="border border-gray-300 p-2 rounded">
            <option value="">كل المسؤولين</option>
            {employeeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-300 p-2 rounded">
            <option value="">كل العملاء</option>
            {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>

        {loading ? <TableSkeleton rows={PAGE_SIZE} cols={10} /> : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-right p-3">رقم الفحص</th>
                    <th className="text-right p-3">اسم الفحص</th>
                    <th className="text-right p-3">رقم العينة</th>
                    <th className="text-right p-3">النتيجة</th>
                    <th className="text-right p-3">الوحدة</th>
                    <th className="text-right p-3">المسؤول</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">تاريخ الإنشاء</th>
                    <th className="text-right p-3">تاريخ النتيجة</th>
                    <th className="text-right p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.length === 0 ? (
                    <tr><td colSpan={10} className="text-center p-4 text-gray-500">لا يوجد فحوصات مطابقة</td></tr>
                  ) : (
                    tests.map(test => (
                      <tr key={test.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-sm">{test.testNumber || '-'}</td>
                        <td className="p-3">{test.testName}</td>
                        <td className="p-3 font-mono">{samplesMap[test.sampleId] || test.sampleId}</td>
                        <td className="p-3">
                          {test.averageResult ? (
                            <span title={`المتوسط: ${test.averageResult}`}>{test.averageResult}</span>
                          ) : test.results ? (
                            <span title={test.results}>نتائج متعددة</span>
                          ) : (
                            test.result || '-'
                          )}
                        </td>
                        <td className="p-3">{test.unit || '-'}</td>
                        <td className="p-3">{employeesMap[test.assignedTo] || '-'}</td>
                        <td className="p-3">{test.status}</td>
                        <td className="p-3 text-sm">{formatDate(test.$createdAt)}</td>
                        <td className="p-3 text-sm">{test.completedAt ? formatDate(test.completedAt) : '-'}</td>
                        <td className="p-3 flex gap-2">
                          <Link href={`/dashboard/tests/${test.$id}`} className="text-green-600 hover:underline flex items-center gap-1"><Eye size={16} /> عرض</Link>
                          <Link href={`/dashboard/tests/${test.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                          <button onClick={() => openDeleteModal(test.$id, test.testName)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
              <p className="text-sm text-gray-500">عرض {tests.length} من أصل {totalDocuments} فحص</p>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
            </div>
          </>
        )}

        <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف الفحص "${deleteTarget?.name}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
      </DashboardLayout>
    </AuthGuard>
  );
}