'use client';

import { useState } from 'react';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, STANDARD_TESTS_COLLECTION_ID } from '@/lib/constants';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ID } from 'appwrite';

export default function ImportDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult('جارٍ قراءة الملف...');
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 1. استيراد أنواع العينات وتخزين معرفاتها
      const typeIds: Record<string, string> = {}; // name -> id
      if (data.sampleTypes && Array.isArray(data.sampleTypes)) {
        for (const type of data.sampleTypes) {
          setResult(`إنشاء نوع عينة: ${type.name}...`);
          const doc = await databases.createDocument(
            DATABASE_ID,
            SAMPLE_TYPES_COLLECTION_ID,
            ID.unique(),
            { name: type.name, category: type.category || '' }
          );
          typeIds[type.name] = doc.$id;
        }
      }

      // 2. استيراد الفحوصات القياسية
      if (data.standardTests && Array.isArray(data.standardTests)) {
        for (const test of data.standardTests) {
          const sampleTypeId = typeIds[test.sampleTypeName];
          if (!sampleTypeId) {
            console.warn(`لم يتم العثور على نوع العينة: ${test.sampleTypeName}`);
            continue;
          }
          setResult(`إنشاء فحص: ${test.name}...`);
          await databases.createDocument(
            DATABASE_ID,
            STANDARD_TESTS_COLLECTION_ID,
            ID.unique(),
            {
              name: test.name,
              sampleTypeId: sampleTypeId,
              specification: test.specification || '',
              unit: test.unit || '',
            }
          );
        }
      }

      setResult('');
      toast.success('تم استيراد جميع البيانات بنجاح');
    } catch (err: any) {
      toast.error('فشل الاستيراد: ' + err.message);
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow text-center">
          <Upload size={48} className="mx-auto text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">استيراد أنواع العينات والفحوصات</h1>
          <p className="text-gray-500 mb-6">
            ارفع ملف JSON الذي يحتوي على أنواع العينات والفحوصات القياسية (sampleTypes و standardTests).
          </p>

          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            className="mb-4 block mx-auto"
          />

          {result && (
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
              <Loader2 size={18} className="animate-spin" />
              <span>{result}</span>
            </div>
          )}

          <AlertTriangle size={16} className="inline text-amber-500" /> تأكد من أخذ نسخة احتياطية قبل الاستيراد.
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

// مكون صغير للتحميل (يمكنك إضافته في نفس الملف أو استيراده)
function Loader2({ size, className }: any) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}