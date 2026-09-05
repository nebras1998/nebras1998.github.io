'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Report } from '@/types';
import { listReports } from '@/lib/services/reports';
import { getFileViewUrl } from '@/lib/services/files';
import { Query } from '@/lib/services';
import { parseReportSnapshot } from '@/lib/report-snapshot';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import TableSkeleton from '@/components/TableSkeleton';
import Pagination from '@/components/Pagination';
import Breadcrumb from '@/components/Breadcrumb';
import { toast } from 'sonner';
import { Search, FileDown, Eye } from 'lucide-react';
import type { ReportSnapshot } from '@/types';

const PAGE_SIZE = 15;

function formatDate(value?: string): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch {
    return value.slice(0, 10);
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const queries: string[] = [];
        if (filterStatus) queries.push(Query.equal('status', filterStatus));
        if (searchTerm.trim()) queries.push(Query.search('reportNumber', searchTerm));
        queries.push(Query.orderDesc('$createdAt'));
        queries.push(Query.limit(PAGE_SIZE));
        queries.push(Query.offset((currentPage - 1) * PAGE_SIZE));
        const res = await listReports(queries);
        setReports(res.documents);
        setTotalDocuments(res.total);
        setTotalPages(Math.ceil(res.total / PAGE_SIZE));
      } catch {
        toast.error('فشل تحميل التقارير');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentPage, filterStatus, searchTerm]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <Breadcrumb items={[{ label: 'التقارير' }]} />
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">التقارير</h1>
            <p className="text-sm text-text-muted">السجل المركزي لتقارير الفحوصات — المسودات والمعتمدة.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="ابحث برقم التقرير..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="border border-border p-2 rounded"
          >
            <option value="">كل الحالات</option>
            <option value="مسودة">مسودة</option>
            <option value="معتمد">معتمد</option>
          </select>
        </div>

        {loading ? <TableSkeleton rows={PAGE_SIZE} cols={6} /> : (
          <>
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-dim border-b border-border">
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">رقم التقرير</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">الفحص</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">رقم الفحص</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">رقم العينة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">العميل</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">الحالة</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">تاريخ الإنشاء</th>
                    <th className="text-right p-4 text-sm font-semibold text-text-secondary">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan={8}><EmptyData title="لا توجد تقارير مطابقة" className="py-8" /></td></tr>
                  ) : (
                    reports.map(report => {
                      let snapshot: ReportSnapshot | null = null;
                      try { snapshot = parseReportSnapshot(report.snapshotData); } catch {}
                      return (
                        <tr key={report.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                          <td className="p-3 font-mono" dir="ltr">{report.reportNumber}</td>
                          <td className="p-3">{snapshot?.testName || '-'}</td>
                          <td className="p-3 font-mono" dir="ltr">{snapshot?.testNumber || '-'}</td>
                          <td className="p-3 font-mono" dir="ltr">{snapshot?.sampleNumber || '-'}</td>
                          <td className="p-3">{snapshot?.clientName || '-'}</td>
                          <td className="p-3"><Badge status={report.status} /></td>
                          <td className="p-3">{formatDate(report.$createdAt)}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Link
                                href={`/dashboard/reports/${report.$id}`}
                                className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
                              >
                                <Eye size={16} /> عرض
                              </Link>
                              {report.status === 'معتمد' && report.pdfFileId && (
                                <a
                                  href={getFileViewUrl(report.pdfFileId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
                                >
                                  <FileDown size={16} /> PDF
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4">
              <p className="text-sm text-text-muted">عرض {reports.length} من أصل {totalDocuments} تقرير</p>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
            </div>
          </>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
