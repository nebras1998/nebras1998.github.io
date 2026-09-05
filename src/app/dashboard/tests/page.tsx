'use client';

import { useEffect, useState } from 'react';
import { listTests, getTest, deleteTest } from '@/lib/services/tests';
import { listSamples } from '@/lib/services/samples';
import { listEmployees } from '@/lib/services/employees';
import { listClients } from '@/lib/services/clients';
import type { Test } from '@/types';
import { deleteFile } from '@/lib/services/files';
import { Query } from '@/lib/services';
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
import { parseResultFields } from '@/lib/test-config';

const PAGE_SIZE = 15;

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
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

  useEffect(() => {
    (async () => {
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
        const testsRes = await listTests(queries);
        setTests(testsRes.documents);
        setTotalDocuments(testsRes.total);
        setTotalPages(Math.ceil(testsRes.total / PAGE_SIZE));
        if (Object.keys(samplesMap).length === 0) {
          const [samplesRes, employeesRes, clientsRes] = await Promise.all([
            listSamples([Query.limit(500)]),
            listEmployees([Query.limit(200)]),
            listClients([Query.limit(200)]),
          ]);
          const sMap: Record<string, string> = {};
          samplesRes.documents.forEach((s) => (sMap[s.$id] = s.sampleNumber));
          setSamplesMap(sMap);
          const eMap: Record<string, string> = {};
          employeesRes.documents.forEach((emp) => (eMap[emp.$id] = emp.name));
          setEmployeesMap(eMap);
          const cMap: Record<string, string> = {};
          clientsRes.documents.forEach((c) => (cMap[c.$id] = c.name));
          setClientsMap(cMap);
        }
      } catch (err) {
        toast.error('فشل تحميل الفحوصات');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, filterStatus, filterEmployee, filterClient, searchTerm]);

  const openDeleteModal = (id: string, name: string) => { setDeleteTarget({ id, name }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const testDoc = await getTest(deleteTarget.id);
      if (testDoc.reportFileId) {
        try { await deleteFile(testDoc.reportFileId); } catch {}
      }
      await deleteTest(deleteTarget.id);
      toast.success('تم حذف الفحص بنجاح');
      setCurrentPage(1);
    } catch (err: unknown) { toast.error('خطأ في حذف الفحص: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  const employeeOptions = Object.entries(employeesMap);
  const clientOptions = Object.entries(clientsMap);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('ar-EG'); } catch { return dateStr.slice(0, 10); }
  };

  // دالة لتنسيق عرض النتيجة في الجدول
  const renderResult = (test: Test) => {
    if (test.resultFieldsValues && test.resultFields) {
      const fields = parseResultFields(test.resultFields);
      if (fields.length > 0) {
        try {
          const values = JSON.parse(test.resultFieldsValues);
          const summary = fields.map((f) => `${f.label}: ${values[f.key] || '-'}`).join('، ');
          return <span title={summary}>نتائج متعددة</span>;
        } catch {}
      }
    }
    if (test.averageResult) {
      return <span title={`المتوسط: ${test.averageResult}`}>{test.averageResult}</span>;
    }
    if (test.results) {
      return <span title={test.results}>نتائج متعددة</span>;
    }
    if (test.result7Days || test.result28Days) {
      return (
        <div className="text-xs space-y-1">
          {test.result7Days && <div>7 أيام: {test.result7Days}</div>}
          {test.result28Days && <div>28 يوم: {test.result28Days}</div>}
        </div>
      );
    }
    return test.result || '-';
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">الفحوصات</h1>
          <Link href="/dashboard/tests/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2"><Plus size={18} /> إضافة فحص جديد</Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="ابحث عن فحص..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded">
            <option value="">كل الحالات</option>
            <option value="قيد الانتظار">قيد الانتظار</option>
            <option value="تحت الفحص">تحت الفحص</option>
            <option value="مكتمل">مكتمل</option>
            <option value="مرفوض">مرفوض</option>
          </select>
          <select value={filterEmployee} onChange={e => { setFilterEmployee(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded">
            <option value="">كل المسؤولين</option>
            {employeeOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setCurrentPage(1); }} className="border border-border p-2 rounded">
            <option value="">كل العملاء</option>
            {clientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>

        {loading ? <TableSkeleton rows={PAGE_SIZE} cols={10} /> : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الفحص</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">اسم الفحص</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم العينة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النتيجة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الوحدة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المسؤول</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المطابقة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">تاريخ الإنشاء</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">تاريخ النتيجة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.length === 0 ? (
                    <tr><td colSpan={11}><EmptyData title="لا يوجد فحوصات مطابقة" className="py-8" /></td></tr>
                  ) : (
                    tests.map(test => (
                      <tr key={test.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                        <td className="p-3 font-mono text-sm">{test.testNumber || '-'}</td>
                        <td className="p-3">{test.testName}</td>
                        <td className="p-3 font-mono">{samplesMap[test.sampleId ?? ''] || test.sampleId || '-'}</td>
                        <td className="p-3">{renderResult(test)}</td>
                        <td className="p-3">{test.unit || '-'}</td>
                        <td className="p-3">{employeesMap[test.assignedTo ?? ''] || '-'}</td>
                        <td className="p-3"><Badge status={test.status} /></td>
                        <td className="p-3">{test.complianceStatus ? <Badge status={test.complianceStatus} size="sm" /> : '-'}</td>
                        <td className="p-3 text-sm">{formatDate(test.$createdAt)}</td>
                        <td className="p-3 text-sm">{test.completedAt ? formatDate(test.completedAt) : '-'}</td>
                        <td className="p-3 flex gap-2">
                          <Link href={`/dashboard/tests/${test.$id}`} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"><Eye size={16} /> عرض</Link>
                          <Link href={`/dashboard/tests/${test.$id}/edit`} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                          <button
                            onClick={() => openDeleteModal(test.$id, test.testName)}
                            disabled={deleting}
                            className="text-danger hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            {deleting && deleteTarget?.id === test.$id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
              <p className="text-sm text-text-muted">عرض {tests.length} من أصل {totalDocuments} فحص</p>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
            </div>
          </>
        )}

        <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف الفحص "${deleteTarget?.name}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
      </DashboardLayout>
    </AuthGuard>
  );
}