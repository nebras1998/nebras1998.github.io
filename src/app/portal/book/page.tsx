'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';

interface CatalogSampleType {
  $id: string;
  name: string;
}

interface CatalogTest {
  $id: string;
  sampleTypeId: string;
  name: string;
}

interface CatalogResponse {
  sampleTypes: CatalogSampleType[];
  tests: CatalogTest[];
}

export default function BookSamplePage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // خطوة 1: اختيار الخدمة، خطوة 2: البيانات الشخصية
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    sampleType: '',
    preferredDate: '',
    projectName: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  // جلب الكتالوج من الخادم (لا قراءة مباشرة لقاعدة البيانات من المتصفح)
  const loadCatalog = async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/portal/catalog', { cache: 'no-store' });
      if (!res.ok) throw new Error('تعذر تحميل الكتالوج');
      const data = (await res.json()) as CatalogResponse;
      setCatalog(data);
    } catch {
      setLoadError('تعذر تحميل أنواع العينات. يرجى إعادة المحاولة.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/portal/catalog', { cache: 'no-store' });
        if (!res.ok) throw new Error('تعذر تحميل الكتالوج');
        const data = (await res.json()) as CatalogResponse;
        if (!cancelled) setCatalog(data);
      } catch {
        if (!cancelled) setLoadError('تعذر تحميل أنواع العينات. يرجى إعادة المحاولة.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // الفحوصات المعروضة تتبع نوع العينة المختار من الكتالوج
  const currentType = catalog?.sampleTypes.find((t: CatalogSampleType) => t.name === form.sampleType) ?? null;
  const standardTests = currentType
    ? catalog?.tests.filter((t: CatalogTest) => t.sampleTypeId === currentType.$id) ?? []
    : [];

  const toggleTest = (testName: string) => {
    setSelectedTests(prev =>
      prev.includes(testName) ? prev.filter(t => t !== testName) : [...prev, testName]
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSampleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, sampleType: e.target.value });
    setSelectedTests([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/portal/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          requestedTests: selectedTests,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطأ في إرسال الطلب. يرجى المحاولة لاحقاً.');
      }
      setBookingNumber(data.bookingNumber);
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'خطأ في إرسال الطلب');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <CheckCircle size={64} className="mx-auto text-primary" />
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">تم إرسال طلبك بنجاح!</h1>
          <p className="text-text-muted">رقم الحجز: <span className="font-mono font-bold text-lg">{bookingNumber}</span></p>
          <p className="text-text-muted">سنقوم بمراجعة طلبك والتواصل معك قريباً.</p>
          <button
            onClick={() => router.push('/portal/book')}
            className="bg-primary text-white px-6 py-2 rounded-xl hover:from-primary-dark hover:to-primary"
          >
            حجز جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4" dir="rtl">
      <FormCard title="حجز موعد فحص" maxWidth="max-w-lg">
        {/* حالة فشل تحميل أنواع العينات */}
        {loadError && (
          <div className="bg-danger-bg border border-danger/30 text-danger p-4 rounded-xl mb-6 flex flex-col items-center gap-3 text-center">
            <AlertTriangle size={28} />
            <p>{loadError}</p>
            <button
              onClick={loadCatalog}
              className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:from-primary-dark hover:to-primary"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* مؤشر الخطوات */}
        {!loadError && (
          <>
            <div className="flex justify-center mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary text-white' : 'bg-border'}`}>1</div>
              <div className="w-16 h-1 mt-4 bg-border mx-2"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-primary text-white' : 'bg-border'}`}>2</div>
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                <SelectField
                  label="نوع العينة"
                  name="sampleType"
                  value={form.sampleType}
                  onChange={handleSampleTypeChange}
                  required
                >
                  <option value="">اختر النوع</option>
                  {catalog?.sampleTypes.map((t: CatalogSampleType) => <option key={t.$id} value={t.name}>{t.name}</option>)}
                </SelectField>
                {standardTests.length > 0 && (
                  <div className="bg-surface-dim p-4 rounded-xl">
                    <p className="font-bold mb-2">الفحوصات المطلوبة:</p>
                    <div className="space-y-2">
                      {standardTests.map((test: CatalogTest) => (
                        <label key={test.$id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test.name)}
                            onChange={() => toggleTest(test.name)}
                            className="w-5 h-5"
                          />
                          <span>{test.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.sampleType}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:from-primary-dark hover:to-primary disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <TextField
                  label="الاسم"
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="الهاتف"
                  name="clientPhone"
                  value={form.clientPhone}
                  onChange={handleChange}
                  required
                />
                <TextField
                  label="البريد الإلكتروني"
                  name="clientEmail"
                  type="email"
                  value={form.clientEmail}
                  onChange={handleChange}
                />
                <TextField
                  label="التاريخ المفضل"
                  type="date"
                  name="preferredDate"
                  value={form.preferredDate}
                  onChange={handleChange}
                />
                <TextField
                  label="اسم المشروع (اختياري)"
                  name="projectName"
                  value={form.projectName}
                  onChange={handleChange}
                />
                <TextAreaField
                  label="ملاحظات"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 bg-border text-text-primary py-3 rounded-xl font-bold hover:bg-surface-muted">السابق</button>
                  <SubmitButton loading={loading} loadingText="جارٍ الإرسال..." className="flex-1">إرسال الطلب</SubmitButton>
                </div>
              </form>
            )}
          </>
        )}
      </FormCard>
    </div>
  );
}