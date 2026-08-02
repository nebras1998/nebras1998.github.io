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
import { Edit, ArrowRight, Building, FileText } from 'lucide-react';
import Badge from '@/components/Badge';
import Card from '@/components/Card';

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

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!client) return <AuthGuard><DashboardLayout><p className="text-center p-10 text-danger">العميل غير موجود</p></DashboardLayout></AuthGuard>;

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalRemaining = totalInvoices - totalPaid;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* بطاقة بيانات العميل */}
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <p className="text-concrete-500">{client.type}</p>
              </div>
              <Link
                href={`/dashboard/clients/${client.$id}/edit`}
                className="text-petrol hover:underline flex items-center gap-1"
              >
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-concrete-500">الهاتف:</span> {client.phone}</div>
              <div><span className="text-concrete-500">البريد:</span> {client.email || '-'}</div>
              <div><span className="text-concrete-500">العنوان:</span> {client.address || '-'}</div>
              <div><span className="text-concrete-500">الرقم الضريبي:</span> {client.taxId || '-'}</div>
            </div>
          </Card>

          {/* ملخص مالي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-concrete-500 text-sm">إجمالي الفواتير</p>
              <p className="text-xl font-bold">{totalInvoices.toFixed(2)} ₪</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-concrete-500 text-sm">المدفوع</p>
              <p className="text-xl font-bold text-petrol">{totalPaid.toFixed(2)} ₪</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-concrete-500 text-sm">المتبقي</p>
              <p className="text-xl font-bold text-danger">{totalRemaining.toFixed(2)} ₪</p>
            </div>
          </div>

          {/* جدول المشاريع */}
          <Card>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building size={20} /> مشاريع العميل ({projects.length})</h2>
            {projects.length === 0 ? (
              <p className="text-concrete-500">لا توجد مشاريع</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-concrete-50 border-b"><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">رقم المشروع</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الاسم</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th><th className="p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50"></th></tr></thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.$id} className="border-b">
                        <td className="p-3">{p.projectNumber}</td>
                        <td className="p-3">{p.name}</td>
                        <td className="p-3"><Badge status={p.status} size="sm" /></td>
                        <td className="p-3">
                          <Link href={`/dashboard/projects/${p.$id}`} className="text-petrol hover:underline text-sm">عرض</Link>
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
              <p className="text-concrete-500">لا توجد فواتير</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-concrete-50 border-b"><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">رقم الفاتورة</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">التاريخ</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجمالي</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المدفوع</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المتبقي</th><th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th><th className="p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50"></th></tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.$id} className="border-b">
                        <td className="p-3 font-mono">{inv.invoiceNumber}</td>
                        <td className="p-3">{inv.issueDate}</td>
                        <td className="p-3">{inv.total?.toFixed(2)} ₪</td>
                        <td className="p-3 text-petrol">{inv.paidAmount?.toFixed(2) || '0.00'} ₪</td>
                        <td className="p-3 text-danger">{inv.remainingAmount?.toFixed(2) || '0.00'} ₪</td>
                        <td className="p-3"><Badge status={inv.status} size="sm" /></td>
                        <td className="p-3">
                          <Link href={`/dashboard/finance/invoices/${inv.$id}`} className="text-petrol hover:underline text-sm">عرض</Link>
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