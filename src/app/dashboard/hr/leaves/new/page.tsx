'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, LEAVE_REQUESTS_COLLECTION_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';

export default function NewLeavePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    type: 'سنوي',
    status: 'معلق',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [Query.equal('status', 'يعمل'), Query.limit(200)]);
        setEmployees(res.documents);
      } catch (err: any) {
        toast.error('فشل تحميل الموظفين');
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) { toast.error('اختر الموظف'); return; }
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, LEAVE_REQUESTS_COLLECTION_ID, 'unique()', form);
      toast.success('تم تقديم طلب الإجازة');
      router.push('/dashboard/hr/leaves');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">طلب إجازة جديد</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">الموظف *</label>
              <select name="employeeId" value={form.employeeId} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="">اختر الموظف</option>
                {employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">تاريخ البداية *</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">تاريخ النهاية *</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required className="w-full border p-2 rounded" />
              </div>
            </div>
            <div>
              <label className="block mb-1">نوع الإجازة *</label>
              <select name="type" value={form.type} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="سنوي">سنوية</option>
                <option value="مرضي">مرضية</option>
                <option value="طارئ">طارئة</option>
                <option value="بدون راتب">بدون راتب</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">السبب</label>
              <textarea name="reason" value={form.reason} onChange={handleChange} rows={3} className="w-full border p-2 rounded" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'جارٍ التقديم...' : 'تقديم الطلب'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}