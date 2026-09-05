'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getClient, listProjects, listInvoices } from '@/lib/services';
import type { Client, Project, Invoice } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { Query } from '@/lib/services';
import Link from 'next/link';
import { Edit, Building, FileText } from 'lucide-react';
import Badge from '@/components/Badge';
import Breadcrumb from '@/components/Breadcrumb';
import Card from '@/components/Card';
import StatCard from '@/components/StatCard';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientDoc = await getClient(clientId);
        setClient(clientDoc);

        const [projRes, invRes] = await Promise.all([
          listProjects([
            Query.equal('clientId', clientId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          listInvoices([
            Query.equal('clientId', clientId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
        ]);

        setProjects(projRes.documents);
        setInvoices(invRes.documents);
      } catch {
        toast.error('فشل تحميل بيانات العميل');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={4} cols={3} /></DashboardLayout></AuthGuard>;
  if (!client) return <AuthGuard><DashboardLayout><EmptyData title="العميل غير موجود" /></DashboardLayout></AuthGuard>;

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalRemaining = totalInvoices - totalPaid;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <Breadcrumb items={[{ href: '/dashboard/clients', label: 'العملاء' }, { label: client.name }]} />
          {/* بطاقة بيانات العميل */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <p className="text-text-muted">{client.type}</p>
              </div>
              <Link
                href={`/dashboard/clients/${client.$id}/edit`}
                className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
              >
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-text-muted">الهاتف:</span> {client.phone}</div>
              <div><span className="text-text-muted">البريد:</span> {client.email || '-'}</div>
              <div><span className="text-text-muted">العنوان:</span> {client.address || '-'}</div>
              <div><span className="text-text-muted">الرقم الضريبي:</span> {client.taxId || '-'}</div>
            </div>
          </Card>

          {/* ملخص مالي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="إجمالي الفواتير" value={`${totalInvoices.toFixed(2)} ₪`} bgColor="bg-surface" centered />
            <StatCard title="المدفوع" value={`${totalPaid.toFixed(2)} ₪`} bgColor="bg-surface" valueClass="text-primary" centered />
            <StatCard title="المتبقي" value={`${totalRemaining.toFixed(2)} ₪`} bgColor="bg-surface" valueClass="text-danger" centered />
          </div>

          {/* جدول المشاريع */}
          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building size={20} /> مشاريع العميل ({projects.length})</h2>
            {projects.length === 0 ? (
              <EmptyData title="لا توجد مشاريع" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-surface-dim border-b border-border"><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم المشروع</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الاسم</th><th className="p-4 text-right text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim"></th></tr></thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.$id} className="border-b">
                        <td className="p-3">{p.projectNumber}</td>
                        <td className="p-3">{p.name}</td>
                        <td className="p-3"><Badge status={p.status} size="sm" /></td>
                        <td className="p-3">
                          <Link href={`/dashboard/projects/${p.$id}`} className="text-primary hover:text-primary-dark font-medium transition-colors text-sm">عرض</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* جدول الفواتير */}
          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={20} /> الفواتير ({invoices.length})</h2>
            {invoices.length === 0 ? (
              <EmptyData title="لا توجد فواتير" />
            ) : (
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
                        <td className="p-3">
                          <Link href={`/dashboard/finance/invoices/${inv.$id}`} className="text-primary hover:text-primary-dark font-medium transition-colors text-sm">عرض</Link>
                        </td>
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