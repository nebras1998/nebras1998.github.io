'use client';

import { useState } from 'react';
import { createSampleType, createStandardTest } from '@/lib/services';
import { ID } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
          const doc = await createSampleType(
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
          await createStandardTest(
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
    } catch (err: unknown) {
      toast.error('فشل الاستيراد: ' + (err instanceof Error ? err.message : String(err)));
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow text-center">
          <Upload size={48} className="mx-auto text-petrol mb-4" />
          <h1 className="text-2xl font-bold mb-2">استيراد أنواع العينات والفحوصات</h1>
          <p className="text-concrete-500 mb-6">
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
            <div className="flex items-center justify-center gap-2 text-petrol mb-4">
              <Loader2 size={18} className="animate-spin" />
              <span>{result}</span>
            </div>
          )}

          <AlertTriangle size={16} className="inline text-warning" /> تأكد من أخذ نسخة احتياطية قبل الاستيراد.
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}

