'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, PROJECTS_COLLECTION_ID, SAMPLES_COLLECTION_ID, TESTS_COLLECTION_ID, INVOICES_COLLECTION_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import Link from 'next/link';
import { Edit, FlaskConical, ClipboardCheck, FileText } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [samples, setSamples] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projDoc = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, projectId);
        setProject(projDoc);

        // جلب اسم العميل
        if (projDoc.clientId) {
          try {
            const client = await databases.getDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, projDoc.clientId);
            setClientName(client.name);
          } catch {}
        }

        const [samplesRes, testsRes, invoicesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, SAMPLES_COLLECTION_ID, [
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
          databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [
            Query.equal('projectId', projectId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ]),
        ]);

        setSamples(samplesRes.documents);
        setTests(testsRes.documents);
        setInvoices(invoicesRes.documents);
      } catch (err: any) {
        toast.error('فشل تحميل بيانات المشروع');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  if (loading) return <AuthGuard><DashboardLayout><p className="text-center p-10">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!project) return <AuthGuard><DashboardLayout><p className="text-center p-10 text-red-500">المشروع غير موجود</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* بطاقة بيانات المشروع */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-gray-500">رقم المشروع: {project.projectNumber}</p>
              </div>
              <Link href={`/dashboard/projects/${project.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1">
                <Edit size={16} /> تعديل
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500">العميل:</span> {clientName || '-'}</div>
              <div><span className="text-gray-500">الموقع:</span> {project.location || '-'}</div>
              <div><span className="text-gray-500">تاريخ البداية:</span> {project.startDate || '-'}</div>
              <div><span className="text-gray-500">الحالة:</span> {project.status}</div>
            </div>
          </div>

          {/* العينات */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FlaskConical size={20} /> العينات ({samples.length})</h2>
            {samples.length === 0 ? <p className="text-gray-400">لا توجد عينات</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-50 border-b"><th className="p-2 text-right">رقم العينة</th><th className="p-2 text-right">النوع</th><th className="p-2 text-right">الحالة</th><th className="p-2 text-right">تاريخ الاستلام</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {samples.map(s => (
                      <tr key={s.$id} className="border-b">
                        <td className="p-2 font-mono">{s.sampleNumber}</td>
                        <td className="p-2">{s.type}</td>
                        <td className="p-2">{s.status}</td>
                        <td className="p-2">{s.collectionDate || '-'}</td>
                        <td className="p-2"><Link href={`/dashboard/samples/${s.$id}/edit`} className="text-blue-600 hover:underline text-sm">تفاصيل</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* الفحوصات */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ClipboardCheck size={20} /> الفحوصات ({tests.length})</h2>
            {tests.length === 0 ? <p className="text-gray-400">لا توجد فحوصات</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-gray-50 border-b"><th className="p-2 text-right">اسم الفحص</th><th className="p-2 text-right">النتيجة</th><th className="p-2 text-right">الوحدة</th><th className="p-2 text-right">الحالة</th><th className="p-2"></th></tr></thead>
                  <tbody>
                    {tests.map(t => (
                      <tr key={t.$id} className="border-b">
                        <td className="p-2">{t.testName}</td>
                        <td className="p-2">{t.result || '-'}</td>
                        <td className="p-2">{t.unit || '-'}</td>
                        <td className="p-2">{t.status}</td>
                        <td className="p-2"><Link href={`/dashboard/tests/${t.$id}`} className="text-blue-600 hover:underline text-sm">عرض</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* الفواتير */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={20} /> الفواتير ({invoices.length})</h2>
            {invoices.length === 0 ? <p className="text-gray-400">لا توجد فواتير</p> : (
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
                        <td className="p-2"><Link href={`/dashboard/finance/invoices/${inv.$id}`} className="text-blue-600 hover:underline text-sm">عرض</Link></td>
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