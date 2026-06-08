'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { databases, storage } from '@/lib/appwrite';
import { Query } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID, TESTS_COLLECTION_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { FileDown, Edit, ArrowRight, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب بيانات الموظف
        const emp = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, employeeId);
        setEmployee(emp);

        // جلب المستندات
        if (emp.documentIds) {
          try {
            const ids = JSON.parse(emp.documentIds);
            const docs = await Promise.all(
              ids.map(async (fileId: string) => {
                try {
                  const file = await storage.getFile(REPORTS_BUCKET_ID, fileId);
                  const viewUrl = storage.getFileView(REPORTS_BUCKET_ID, fileId);
                  return { $id: file.$id, name: file.name, viewUrl: viewUrl.toString() };
                } catch {
                  return null;
                }
              })
            );
            setDocuments(docs.filter(Boolean));
          } catch (parseErr) {
            console.warn('فشل تحليل documentIds');
          }
        }

        // جلب الفحوصات الموكلة
        const testsRes = await databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [
          Query.equal('assignedTo', employeeId),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]);
        setAssignedTests(testsRes.documents);
      } catch (err: any) {
        toast.error('فشل تحميل بيانات الموظف');
        router.push('/dashboard/hr/employees');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId, router]);

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center p-10">جارٍ تحميل البيانات...</div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!employee) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center p-10 text-red-500">الموظف غير موجود</div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* مسار التنقل */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard/hr/employees" className="hover:underline">الموظفون</Link>
            <ArrowRight size={14} />
            <span>{employee.name}</span>
          </div>

          {/* البطاقة الأساسية */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{employee.name}</h1>
                <p className="text-gray-500">{employee.jobTitle}</p>
              </div>
              <Link
                href={`/dashboard/hr/employees/${employeeId}/edit`}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"
              >
                <Edit size={16} /> تعديل
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <InfoItem label="رقم الموظف" value={employee.employeeNumber} mono />
              <InfoItem label="القسم" value={employee.department || '-'} />
              <InfoItem label="تاريخ التعيين" value={employee.hireDate || '-'} />
              <InfoItem label="البريد الإلكتروني" value={employee.email || '-'} />
              <InfoItem label="الهاتف" value={employee.phone || '-'} />
              <InfoItem label="المؤهل العلمي" value={employee.qualification || '-'} />
            </div>

            {employee.certifications && (
              <div className="mt-4">
                <h3 className="font-bold mb-1">الشهادات المهنية</h3>
                <p className="text-gray-700">{employee.certifications}</p>
              </div>
            )}
            {employee.notes && (
              <div className="mt-4">
                <h3 className="font-bold mb-1">ملاحظات</h3>
                <p className="text-gray-700">{employee.notes}</p>
              </div>
            )}
          </div>

          {/* المستندات */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">المستندات</h2>
            {documents.length === 0 ? (
              <p className="text-gray-400">لا توجد مستندات مرفوعة</p>
            ) : (
              <ul className="divide-y">
                {documents.map((doc: any) => (
                  <li key={doc.$id} className="py-2 flex justify-between items-center">
                    <span>{doc.name}</span>
                    <a
                      href={doc.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileDown size={16} /> تحميل
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* الفحوصات الموكلة */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ClipboardCheck size={24} /> الفحوصات الموكلة ({assignedTests.length})
            </h2>
            {assignedTests.length === 0 ? (
              <p className="text-gray-400">لا توجد فحوصات موكلة لهذا الموظف</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-right p-3">اسم الفحص</th>
                      <th className="text-right p-3">النتيجة</th>
                      <th className="text-right p-3">الوحدة</th>
                      <th className="text-right p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTests.map((test) => (
                      <tr key={test.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{test.testName}</td>
                        <td className="p-3">{test.result || '-'}</td>
                        <td className="p-3">{test.unit || '-'}</td>
                        <td className="p-3">{test.status}</td>
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

// مكون مساعد لعرض المعلومات
function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-50 p-3 rounded">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`font-bold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}