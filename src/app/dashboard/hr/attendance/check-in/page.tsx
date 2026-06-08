'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, ATTENDANCE_COLLECTION_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import { useRouter } from 'next/navigation';

export default function CheckInPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<Record<string, { status: string; checkIn: string; checkOut: string; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
          Query.equal('status', 'يعمل'),
          Query.limit(200),
        ]);
        setEmployees(res.documents);
        // تهيئة حالة افتراضية لكل موظف
        const initial: Record<string, any> = {};
        res.documents.forEach((emp: any) => {
          initial[emp.$id] = { status: 'حاضر', checkIn: '', checkOut: '', notes: '' };
        });
        setAttendanceList(initial);
      } catch (err: any) {
        toast.error('فشل تحميل الموظفين');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleChange = (empId: string, field: string, value: string) => {
    setAttendanceList((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promises = Object.entries(attendanceList).map(([empId, data]) =>
        databases.createDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, 'unique()', {
          employeeId: empId,
          date,
          ...data,
        })
      );
      await Promise.all(promises);
      toast.success('تم تسجيل الحضور بنجاح');
      router.push('/dashboard/hr/attendance');
    } catch (err: any) {
      toast.error('خطأ في التسجيل: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="p-10 text-center">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">تسجيل الحضور اليومي</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded"
                required
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-right p-2">الموظف</th>
                    <th className="text-right p-2">الحالة</th>
                    <th className="text-right p-2">وقت الحضور</th>
                    <th className="text-right p-2">وقت الانصراف</th>
                    <th className="text-right p-2">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.$id} className="border-b">
                      <td className="p-2">{emp.name}</td>
                      <td className="p-2">
                        <select
                          value={attendanceList[emp.$id]?.status || 'حاضر'}
                          onChange={(e) => handleChange(emp.$id, 'status', e.target.value)}
                          className="border p-1 rounded w-full"
                        >
                          <option value="حاضر">حاضر</option>
                          <option value="غائب">غائب</option>
                          <option value="متأخر">متأخر</option>
                          <option value="إجازة">إجازة</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="time"
                          value={attendanceList[emp.$id]?.checkIn || ''}
                          onChange={(e) => handleChange(emp.$id, 'checkIn', e.target.value)}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="time"
                          value={attendanceList[emp.$id]?.checkOut || ''}
                          onChange={(e) => handleChange(emp.$id, 'checkOut', e.target.value)}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={attendanceList[emp.$id]?.notes || ''}
                          onChange={(e) => handleChange(emp.$id, 'notes', e.target.value)}
                          className="border p-1 rounded w-full"
                          placeholder="ملاحظة"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'جارٍ التسجيل...' : 'حفظ الحضور'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}