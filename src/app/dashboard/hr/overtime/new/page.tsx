'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, OVERTIME_COLLECTION_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';

export default function NewOvertimePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    hours: 0,
    reason: '',
    status: 'معلق',
    notes: '',
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

  // حساب الساعات تلقائياً عند تغيير الوقت
  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (endMin <= startMin) return 0;
    return parseFloat(((endMin - startMin) / 60).toFixed(2));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      if (name === 'startTime' || name === 'endTime') {
        newForm.hours = calculateHours(
          name === 'startTime' ? value : prev.startTime,
          name === 'endTime' ? value : prev.endTime
        );
      }
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) { toast.error('اختر الموظف'); return; }
    if (form.hours <= 0) { toast.error('يجب أن تكون الساعات أكبر من صفر'); return; }
    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, OVERTIME_COLLECTION_ID, 'unique()', form);
      toast.success('تم تقديم طلب العمل الإضافي');
      router.push('/dashboard/hr/overtime');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">طلب عمل إضافي جديد</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">الموظف *</label>
              <select name="employeeId" value={form.employeeId} onChange={handleChange} required className="w-full border p-2 rounded">
                <option value="">اختر الموظف</option>
                {employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">التاريخ *</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full border p-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">وقت البداية</label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">وقت النهاية</label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div>
              <label className="block mb-1">عدد الساعات *</label>
              <input type="number" step="0.5" min="0" name="hours" value={form.hours} onChange={handleChange} required className="w-full border p-2 rounded" />
              <p className="text-sm text-gray-500 mt-1">يتم حسابه تلقائياً من الوقت (يمكنك تعديله)</p>
            </div>
            <div>
              <label className="block mb-1">سبب العمل الإضافي</label>
              <textarea name="reason" value={form.reason} onChange={handleChange} rows={3} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full border p-2 rounded" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:opacity-50">
              {loading ? 'جارٍ التقديم...' : 'تقديم الطلب'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}