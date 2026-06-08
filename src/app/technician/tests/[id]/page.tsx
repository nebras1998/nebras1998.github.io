'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, TESTS_COLLECTION_ID, SAMPLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowRight, Save } from 'lucide-react';
import { createNotification } from '@/lib/notifications';

export default function TechnicianTestPage() {
  const params = useParams();
  const testId = params.id as string;
  const router = useRouter();
  const { employee } = useAuthStore();
  const [test, setTest] = useState<any>(null);
  const [sample, setSample] = useState<any>(null);
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const t = await databases.getDocument(DATABASE_ID, TESTS_COLLECTION_ID, testId);
        setTest(t);
        setResult(t.result || '');
        setUnit(t.unit || '');
        setNotes(t.notes || '');
        setCompletedAt(t.completedAt || new Date().toISOString().split('T')[0]);
        if (t.sampleId) {
          const s = await databases.getDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, t.sampleId);
          setSample(s);
        }
      } catch (err: any) {
        toast.error('فشل تحميل بيانات الفحص');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) { toast.error('الرجاء إدخال النتيجة'); return; }
    setSaving(true);
    try {
      await databases.updateDocument(DATABASE_ID, TESTS_COLLECTION_ID, testId, {
        result, unit, notes, status: 'مكتمل',
        completedBy: employee?.$id,
        completedAt: completedAt || new Date().toISOString(),
      });
      if (employee) {
        await createNotification({
          type: 'فحص_مكتمل',
          message: `أكمل ${employee.name} فحص "${test.testName}" للعينة ${sample?.sampleNumber || test.sampleId} بالنتيجة ${result} ${unit}`,
          relatedId: testId, employeeId: employee.$id, employeeName: employee.name,
        });
      }
      toast.success('تم حفظ النتيجة بنجاح');
      router.push('/technician/dashboard');
    } catch (err: any) {
      toast.error('خطأ في الحفظ: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center">جارٍ التحميل...</div>;
  if (!test) return <div className="p-4 text-center text-red-500">الفحص غير موجود</div>;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold">{test.testName}</h1>
      </header>
      <main className="p-4">
        <div className="bg-white p-4 rounded-2xl shadow mb-4 space-y-1 text-sm">
          <p><span className="text-gray-500">رقم العينة:</span> {sample?.sampleNumber || test.sampleId}</p>
          <p><span className="text-gray-500">النوع:</span> {sample?.type || '-'}</p>
          <p><span className="text-gray-500">المواصفة:</span> {test.specification || '-'}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl shadow space-y-4">
          <div>
            <label className="block mb-1.5 font-bold text-base">النتيجة *</label>
            <input type="text" value={result} onChange={e => setResult(e.target.value)} required
              className="w-full border p-3.5 rounded-xl text-lg" placeholder="أدخل قيمة النتيجة" dir="ltr" />
          </div>
          <div>
            <label className="block mb-1.5 font-bold text-base">الوحدة</label>
            <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
              className="w-full border p-3.5 rounded-xl" placeholder="kg/cm2, MPa" dir="ltr" />
          </div>
          <div>
            <label className="block mb-1.5 font-bold text-base">تاريخ النتيجة</label>
            <input type="date" value={completedAt} onChange={e => setCompletedAt(e.target.value)}
              className="w-full border p-3.5 rounded-xl" />
          </div>
          <div>
            <label className="block mb-1.5 font-bold text-base">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border p-3.5 rounded-xl" placeholder="أي ملاحظات إضافية..." />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={22} /> {saving ? 'جارٍ الحفظ...' : 'حفظ النتيجة'}
          </button>
        </form>
      </main>
    </div>
  );
}