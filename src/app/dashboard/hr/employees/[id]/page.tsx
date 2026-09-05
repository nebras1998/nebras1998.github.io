'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Employee, Test } from '@/types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import { toast } from 'sonner';
import { FileDown, Edit, ClipboardCheck } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import Link from 'next/link';
import { getEmployee } from '@/lib/services/employees';
import { listTests } from '@/lib/services/tests';
import { getFile, getFileViewUrl } from '@/lib/services/files';
import { Query } from '@/lib/services';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import StatCard from '@/components/StatCard';
import EmptyData from '@/components/EmptyData';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<{ $id: string; name: string; viewUrl: string }[]>([]);
  const [assignedTests, setAssignedTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب بيانات الموظف
        const emp = await getEmployee(employeeId);
        setEmployee(emp);

        if (emp.documentIds) {
          try {
            const ids = JSON.parse(emp.documentIds);
            const docs = await Promise.all(
              ids.map(async (fileId: string) => {
                try {
                  const file = await getFile(fileId);
                  const viewUrl = getFileViewUrl(fileId);
                  return { $id: file.$id, name: file.name, viewUrl };
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

        const testsRes = await listTests([
          Query.equal('assignedTo', employeeId),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]);
        setAssignedTests(testsRes.documents);
      } catch {
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
          <TableSkeleton rows={5} cols={3} />
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!employee) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="text-center p-10 text-danger">الموظف غير موجود</div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Breadcrumb items={[{ href: '/dashboard/hr/employees', label: 'الموظفون' }, { label: employee.name }]} />

          {/* البطاقة الأساسية */}
          <Card>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{employee.name}</h1>
                <p className="text-text-muted">{employee.jobTitle}</p>
              </div>
              <Link
                href={`/dashboard/hr/employees/${employeeId}/edit`}
                className="bg-primary text-white px-4 py-2 rounded flex items-center gap-1 hover:from-primary-dark hover:to-primary"
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
                <p className="text-text-primary">{employee.certifications}</p>
              </div>
            )}
            {employee.notes && (
              <div className="mt-4">
                <h3 className="font-bold mb-1">ملاحظات</h3>
                <p className="text-text-primary">{employee.notes}</p>
              </div>
            )}
          </Card>

          {/* المستندات */}
          <Card>
            <h2 className="text-xl font-bold mb-4">المستندات</h2>
            {documents.length === 0 ? (
              <EmptyData title="لا توجد مستندات مرفوعة" />
            ) : (
              <ul className="divide-y">
                {documents.map((doc) => (
                  <li key={doc.$id} className="py-2 flex justify-between items-center">
                    <span>{doc.name}</span>
                    <a
                      href={doc.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1"
                    >
                      <FileDown size={16} /> تحميل
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* الفحوصات الموكلة */}
          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ClipboardCheck size={24} /> الفحوصات الموكلة ({assignedTests.length})
            </h2>
            {assignedTests.length === 0 ? (
              <EmptyData title="لا توجد فحوصات موكلة لهذا الموظف" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-dim border-b border-border">
                      <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">اسم الفحص</th>
                      <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النتيجة</th>
                      <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الوحدة</th>
                      <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTests.map((test) => (
                      <tr key={test.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                        <td className="p-3">{test.testName}</td>
                        <td className="p-3">{test.result || '-'}</td>
                        <td className="p-3">{test.unit || '-'}</td>
                        <td className="p-3"><Badge status={test.status} /></td>
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

// مكون مساعد لعرض المعلومات
function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <StatCard title={label} value={value} bgColor="bg-surface-dim" valueClass={mono ? 'font-mono' : undefined} centered />
  );
}