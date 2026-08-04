'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listSampleTypes, listStandardTests, listBookings, createBooking } from '@/lib/services';
import type { SampleType, StandardTest } from '@/lib/services';
import { Query } from '@/lib/services';
import { toast } from 'sonner';
import { ID } from 'appwrite';
import { CheckCircle } from 'lucide-react';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';

export default function BookSamplePage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // خطوة 1: اختيار الخدمة، خطوة 2: البيانات الشخصية
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [standardTests, setStandardTests] = useState<StandardTest[]>([]);
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

  // جلب أنواع العينات
  useEffect(() => {
    (async () => {
      const res = await listSampleTypes([Query.limit(100)]);
      setSampleTypes(res.documents);
    })();
  }, []);

  // عند تغيير النوع، نجلب الفحوصات ونعيد تعيين الاختيارات
  useEffect(() => {
    if (form.sampleType) {
      const type = sampleTypes.find((t: SampleType) => t.name === form.sampleType);
      if (type) {
        (async () => {
          const res = await listStandardTests([
            Query.equal('sampleTypeId', type.$id),
            Query.limit(50),
          ]);
          setStandardTests(res.documents);
        })();
      }
    }
  }, [form.sampleType, sampleTypes]);

  // إعادة تعيين الاختيارات كدالة منفصلة تستدعى فقط من حدث
  const handleSampleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, sampleType: e.target.value });
    setSelectedTests([]);
  };

  const toggleTest = (testName: string) => {
    setSelectedTests(prev =>
      prev.includes(testName) ? prev.filter(t => t !== testName) : [...prev, testName]
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateBookingNumber = async () => {
    const year = new Date().getFullYear();
    const prefix = `BOOK-${year}-`;
    try {
      const res = await listBookings([
        Query.startsWith('bookingNumber', prefix),
        Query.orderDesc('bookingNumber'),
        Query.limit(1),
      ]);
      let nextNumber = 1;
      if (res.documents.length > 0) {
        const last = res.documents[0].bookingNumber.split('-').pop();
        if (last) nextNumber = parseInt(last, 10) + 1;
      }
      return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    } catch {
      return `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const number = await generateBookingNumber();
      await createBooking(ID.unique(), {
        ...form,
        bookingNumber: number,
        requestedTests: JSON.stringify(selectedTests),
        status: 'معلق',
        source: 'أونلاين',
      });
      setBookingNumber(number);
      setSuccess(true);
    } catch (err: unknown) {
      toast.error('خطأ في إرسال الطلب: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-concrete-100 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <CheckCircle size={64} className="mx-auto text-petrol" />
          <h1 className="text-2xl font-bold">تم إرسال طلبك بنجاح!</h1>
          <p className="text-concrete-500">رقم الحجز: <span className="font-mono font-bold text-lg">{bookingNumber}</span></p>
          <p className="text-concrete-500">سنقوم بمراجعة طلبك والتواصل معك قريباً.</p>
          <button
            onClick={() => router.push('/portal/book')}
            className="bg-petrol text-white px-6 py-2 rounded-xl hover:bg-petrol-dark"
          >
            حجز جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-concrete-100 flex items-center justify-center p-4" dir="rtl">
      <FormCard title="حجز موعد فحص" maxWidth="max-w-lg">
        {/* مؤشر الخطوات */}
        <div className="flex justify-center mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-petrol text-white' : 'bg-concrete-200'}`}>1</div>
          <div className="w-16 h-1 mt-4 bg-concrete-200 mx-2"></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-petrol text-white' : 'bg-concrete-200'}`}>2</div>
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
              {sampleTypes.map((t: SampleType) => <option key={t.$id} value={t.name}>{t.name}</option>)}
            </SelectField>
            {standardTests.length > 0 && (
              <div className="bg-concrete-50 p-4 rounded-xl">
                <p className="font-bold mb-2">الفحوصات المطلوبة:</p>
                <div className="space-y-2">
                  {standardTests.map((test: StandardTest) => (
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
              className="w-full bg-petrol text-white py-3 rounded-xl font-bold hover:bg-petrol-dark disabled:opacity-50"
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
              <button type="button" onClick={() => setStep(1)} className="flex-1 bg-concrete-200 text-concrete-800 py-3 rounded-xl font-bold hover:bg-concrete-100">السابق</button>
              <SubmitButton loading={loading} loadingText="جارٍ الإرسال..." className="flex-1">إرسال الطلب</SubmitButton>
            </div>
          </form>
        )}
      </FormCard>
    </div>
  );
}