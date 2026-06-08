'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { databases, storage } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  TESTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  REPORTS_BUCKET_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { FileDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function TestDetailPage() {
  const params = useParams();
  const testId = params.id as string;

  const [test, setTest] = useState<any>(null);
  const [sample, setSample] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const testDoc = await databases.getDocument(DATABASE_ID, TESTS_COLLECTION_ID, testId);
        setTest(testDoc);

        if (testDoc.sampleId) {
          const sampleDoc = await databases.getDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, testDoc.sampleId);
          setSample(sampleDoc);
        }

        if (testDoc.reportFileId) {
          const result = storage.getFileView(REPORTS_BUCKET_ID, testDoc.reportFileId);
          setFileUrl(result.toString());
        }
      } catch (err: any) {
        toast.error('فشل تحميل بيانات الفحص');
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG');
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="p-10 text-center">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!test) return <AuthGuard><DashboardLayout><p className="p-10 text-center text-red-500">الفحص غير موجود</p></DashboardLayout></AuthGuard>;

  let resultsArray: number[] = [];
  try {
    if (test.results) resultsArray = JSON.parse(test.results);
  } catch {}

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/dashboard/tests" className="hover:underline">الفحوصات</Link>
            <ArrowRight size={14} />
            <span>تفاصيل الفحص</span>
          </div>

          <h1 className="text-2xl font-bold">{test.testName}</h1>

          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500">رقم الفحص:</span> {test.testNumber || '-'}</div>
            <div><span className="text-gray-500">العينة:</span> {sample?.sampleNumber || test.sampleId}</div>
            <div><span className="text-gray-500">الحالة:</span> {test.status}</div>
            <div><span className="text-gray-500">المواصفة:</span> {test.specification || '-'}</div>
            <div><span className="text-gray-500">المسؤول:</span> {test.assignedTo || '-'}</div>
            <div><span className="text-gray-500">تاريخ الإنشاء:</span> {formatDate(test.$createdAt)}</div>
            <div><span className="text-gray-500">تاريخ النتيجة:</span> {test.completedAt ? formatDate(test.completedAt) : '-'}</div>
          </div>

          {/* عرض النتائج */}
          <div className="border-t pt-4">
            <h2 className="font-bold text-lg mb-2">النتائج</h2>
            {resultsArray.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">نتائج المكعبات:</p>
                <div className="grid grid-cols-3 gap-2">
                  {resultsArray.map((val, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded text-center">
                      <p className="text-xs text-gray-500">مكعب {idx + 1}</p>
                      <p className="font-bold text-lg">{val}</p>
                      <p className="text-xs">{test.unit || 'kg/cm2'}</p>
                    </div>
                  ))}
                </div>
                {test.averageResult && (
                  <div className="mt-3 bg-green-50 p-3 rounded text-center">
                    <p className="text-sm text-gray-600">المتوسط</p>
                    <p className="font-bold text-xl text-green-700">{test.averageResult} {test.unit || 'kg/cm2'}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">النتيجة: {test.result || '-'} {test.unit || ''}</p>
            )}
          </div>

          {/* قسم التقرير */}
          <div className="border-t pt-4">
            <h2 className="font-bold text-lg mb-2">تقرير الفحص</h2>
            {fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" download>
                <FileDown size={18} /> تحميل التقرير (PDF)
              </a>
            ) : (
              <p className="text-gray-400">لا يوجد تقرير مرفوع بعد.</p>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}