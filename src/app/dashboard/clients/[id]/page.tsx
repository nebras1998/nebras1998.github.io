'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, CLIENTS_COLLECTION_ID, PROJECTS_COLLECTION_ID, INVOICES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import Link from 'next/link';
import { Edit, ArrowRight, Building, FileText } from 'lucide-react';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientDoc = await databases.getDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, clientId);
        setClient(clientDoc);

        const [projRes, invRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [
            Query.equal('clientId', clientId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [
            Query.equal('clientId', clientId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
        ]);

        setProjects(projRes.documents);
        setInvoices(invRes.documents);
      } catch (err: any) {
        toast.error('فشل تحميل بيانات العميل');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!client) return <AuthGuard><DashboardLayout><p className="text-center p-10 text-red-500">العميل غير موجود</p></DashboardLayout></AuthGuard>;

  const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalRemaining = totalInvoices - totalPaid;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* بطاقة بيانات العميل */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <p className="text-gray-500">{client.type}</p>
              </div>
              <Link
                href={`/dashboard/clients/${client.$id}/edit`}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">الهاتف:</span> {client.phone}</div>
              <div><span className="text-gray-500">البريد:</span> {client.email || '-'}</div>
              <div><span className="text-gray-500">العنوان:</span> {client.address || '-'}</div>
              <div><span className="text-gray-500">الرقم الضريبي:</span> {client.taxId || '-'}</div>
            </div>
          </div>

          {/* ملخص مالي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-gray-500 text-sm">إجمالي الفواتير</p>
              <p className="text-xl font-bold">{totalInvoices.toFixed(2)} ₪</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-gray-500 text-sm">المدفوع</p>
              <p className="text-xl font-bold text-green-600">{totalPaid.toFixed(2)} ₪</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow text-center">
              <p className="text-gray-500 text-sm">المتبقي</p>
              <p className="text-xl font-bold text-red-600">{totalRemaining.toFixed(2)} ₪</p>
            </div>
          </div>

          {/* جدول المشاريع */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building size={20} /> مشاريع العميل ({projects.length})</h2>
            {projects.length === 0 ? (
              <p className="text-gray-400">لا توجد مشاريع</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-50 border-b"><th className="p-2 text-right">رقم المشروع</th><th className="p-2 text-right">الاسم</th><th className="p-2 text-right">الحالة</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.$id} className="border-b">
                        <td className="p-2">{p.projectNumber}</td>
                        <td className="p-2">{p.name}</td>
                        <td className="p-2">{p.status}</td>
                        <td className="p-2">
                          <Link href={`/dashboard/projects/${p.$id}`} className="text-blue-600 hover:underline text-sm">عرض</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* جدول الفواتير */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={20} /> الفواتير ({invoices.length})</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-400">لا توجد فواتير</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-50 border-b"><th className="p-2 text-right">رقم الفاتورة</th><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">الإجمالي</th><th className="p-2 text-right">المدفوع</th><th className="p-2 text-right">المتبقي</th><th className="p-2 text-right">الحالة</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.$id} className="border-b">
                        <td className="p-2 font-mono">{inv.invoiceNumber}</td>
                        <td className="p-2">{inv.issueDate}</td>
                        <td className="p-2">{inv.total?.toFixed(2)} ₪</td>
                        <td className="p-2 text-green-600">{inv.paidAmount?.toFixed(2) || '0.00'} ₪</td>
                        <td className="p-2 text-red-600">{inv.remainingAmount?.toFixed(2) || '0.00'} ₪</td>
                        <td className="p-2">{inv.status}</td>
                        <td className="p-2">
                          <Link href={`/dashboard/finance/invoices/${inv.$id}`} className="text-blue-600 hover:underline text-sm">عرض</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}