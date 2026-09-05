'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Project, Sample, Test, Invoice } from '@/types';
import { getProject, getClient, listSamples, listTests, listInvoices } from '@/lib/services';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import Link from 'next/link';
import { Edit, FlaskConical, ClipboardCheck, FileText } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [clientName, setClientName] = useState('');
  const [samples, setSamples] = useState<Sample[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projDoc = await getProject(projectId);
        setProject(projDoc);

        // جلب اسم العميل
        if (projDoc.clientId) {
          try {
            const client = await getClient(projDoc.clientId);
            setClientName(client.name);
          } catch {}
        }

        const [samplesRes, testsRes, invoicesRes] = await Promise.all([
          listSamples([
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          listTests([
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          listInvoices([
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
        ]);

        setSamples(samplesRes.documents);
        setTests(testsRes.documents);
        setInvoices(invoicesRes.documents);
      } catch {
        toast.error('فشل تحميل بيانات المشروع');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={4} cols={3} /></DashboardLayout></AuthGuard>;
  if (!project) return <AuthGuard><DashboardLayout><EmptyData title="المشروع غير موجود" /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Breadcrumb items={[{ href: '/dashboard/projects', label: 'المشاريع' }, { label: 'تفاصيل المشروع' }]} />
          {/* بطاقة بيانات المشروع */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-text-muted">رقم المشروع: {project.projectNumber}</p>
              </div>
              <Link href={`/dashboard/projects/${project.$id}/edit`} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1">
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-text-muted">العميل:</span> {clientName || '-'}</div>
              <div><span className="text-text-muted">الموقع:</span> {project.location || '-'}</div>
              <div><span className="text-text-muted">تاريخ البداية:</span> {project.startDate || '-'}</div>
              <div><span className="text-text-muted">الحالة:</span> <Badge status={project.status} /></div>
            </div>
          </Card>

          {/* العينات */}
          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FlaskConical size={20} /> العينات ({samples.length})</h2>
            {samples.length === 0 ? <EmptyData title="لا توجد عينات" /> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-surface-dim border-b border-border"><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم العينة</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النوع</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">تاريخ الاستلام</th><th className="p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim"></th></tr></thead>
                  <tbody>
                    {samples.map(s => (
                      <tr key={s.$id} className="border-b">
                        <td className="p-3 font-mono">{s.sampleNumber}</td>
                        <td className="p-3">{s.type}</td>
                        <td className="p-3"><Badge status={s.status} size="sm" /></td>
                        <td className="p-3">{s.samplingDate || '-'}</td>
                        <td className="p-3"><Link href={`/dashboard/samples/${s.$id}`} className="text-primary hover:text-primary-dark font-medium transition-colors text-sm">تفاصيل</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* الفحوصات */}
          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ClipboardCheck size={20} /> الفحوصات ({tests.length})</h2>
            {tests.length === 0 ? <EmptyData title="لا توجد فحوصات" /> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-surface-dim border-b border-border"><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">اسم الفحص</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النتيجة</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الوحدة</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim"></th></tr></thead>
                  <tbody>
                    {tests.map(t => (
                      <tr key={t.$id} className="border-b">
                        <td className="p-3">{t.testName}</td>
                        <td className="p-3">{t.result || '-'}</td>
                        <td className="p-3">{t.unit || '-'}</td>
                        <td className="p-3"><Badge status={t.status} size="sm" /></td>
                        <td className="p-3"><Link href={`/dashboard/tests/${t.$id}`} className="text-primary hover:text-primary-dark font-medium transition-colors text-sm">عرض</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* الفواتير */}
          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={20} /> الفواتير ({invoices.length})</h2>
            {invoices.length === 0 ? <EmptyData title="لا توجد فواتير" /> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-surface-dim border-b border-border"><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الفاتورة</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">التاريخ</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجمالي</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المدفوع</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">المتبقي</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim"></th></tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.$id} className="border-b">
                        <td className="p-3 font-mono">{inv.invoiceNumber}</td>
                        <td className="p-3">{inv.issueDate}</td>
                        <td className="p-3">{inv.total?.toFixed(2)} ₪</td>
                        <td className="p-3 text-primary">{inv.paidAmount?.toFixed(2) || '0.00'} ₪</td>
                        <td className="p-3 text-danger">{inv.remainingAmount?.toFixed(2) || '0.00'} ₪</td>
                        <td className="p-3"><Badge status={inv.status} size="sm" /></td>
                        <td className="p-3"><Link href={`/dashboard/finance/invoices/${inv.$id}`} className="text-primary hover:text-primary-dark font-medium transition-colors text-sm">عرض</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}