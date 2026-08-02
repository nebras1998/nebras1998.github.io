'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listSampleTypes, listStandardTests, listBookings, createBooking } from '@/lib/services';
import type { SampleType, StandardTest } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { ID } from 'appwrite';

export default function NewBookingPage() {
  const router = useRouter();
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
    status: 'معلق',
    source: 'مباشر',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await listSampleTypes([Query.limit(100)]);
      setSampleTypes(res.documents);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (form.sampleType) {
        const type = sampleTypes.find(t => t.name === form.sampleType);
        if (type) {
          const res = await listStandardTests([
            Query.equal('sampleTypeId', type.$id),
            Query.limit(50),
          ]);
          setStandardTests(res.documents);
        }
      } else {
        setStandardTests([]);
      }
    })();
  }, [form.sampleType, sampleTypes]);

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
      });
      toast.success('تم إضافة الحجز بنجاح');
      router.push('/dashboard/bookings');
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl shadow">
          <h1 className="text-2xl font-bold mb-6">إضافة حجز جديد</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-bold">الاسم *</label>
                <input name="clientName" value={form.clientName} onChange={handleChange} required className="w-full border p-3 rounded-xl" />
              </div>
              <div>
                <label className="block mb-1 font-bold">الهاتف *</label>
                <input name="clientPhone" value={form.clientPhone} onChange={handleChange} required className="w-full border p-3 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="block mb-1">البريد الإلكتروني</label>
              <input name="clientEmail" type="email" value={form.clientEmail} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
            <div>
              <label className="block mb-1 font-bold">نوع العينة *</label>
              <select name="sampleType" value={form.sampleType} onChange={handleSampleTypeChange} required className="w-full border p-3 rounded-xl">
                <option value="">اختر النوع</option>
                {sampleTypes.map(t => <option key={t.$id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            {standardTests.length > 0 && (
              <div className="bg-concrete-50 p-4 rounded-xl">
                <p className="font-bold mb-2">الفحوصات المطلوبة:</p>
                <div className="space-y-2">
                  {standardTests.map(test => (
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">التاريخ المفضل</label>
                <input type="date" name="preferredDate" value={form.preferredDate} onChange={handleChange} className="w-full border p-3 rounded-xl" />
              </div>
              <div>
                <label className="block mb-1">الحالة</label>
                <select name="status" value={form.status} onChange={handleChange} className="w-full border p-3 rounded-xl">
                  <option value="معلق">معلق</option>
                  <option value="مقبول">مقبول</option>
                  <option value="مرفوض">مرفوض</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block mb-1">المصدر</label>
              <select name="source" value={form.source} onChange={handleChange} className="w-full border p-3 rounded-xl">
                <option value="مباشر">مباشر</option>
                <option value="هاتف">هاتف</option>
                <option value="أونلاين">أونلاين</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">اسم المشروع (اختياري)</label>
              <input name="projectName" value={form.projectName} onChange={handleChange} className="w-full border p-3 rounded-xl" />
            </div>
            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-3 rounded-xl" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-petrol text-white py-3 rounded-xl font-bold hover:bg-petrol-dark disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'حفظ الحجز'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}