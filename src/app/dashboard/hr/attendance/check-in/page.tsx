'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Employee } from '@/types';
import { listEmployees } from '@/lib/services/employees';
import { createAttendance } from '@/lib/services/attendance';
import { Query } from '@/lib/services';

export default function CheckInPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<Record<string, { status: string; checkIn: string; checkOut: string; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await listEmployees([
          Query.equal('status', 'يعمل'),
          Query.limit(200),
        ]);
        setEmployees(res.documents);
        // تهيئة حالة افتراضية لكل موظف
        const initial: Record<string, { status: string; checkIn: string; checkOut: string; notes: string }> = {};
        res.documents.forEach((emp: Employee) => {
          initial[emp.$id] = { status: 'حاضر', checkIn: '', checkOut: '', notes: '' };
        });
        setAttendanceList(initial);
      } catch {
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
        createAttendance('unique()', {
          employeeId: empId,
          date,
          ...data,
        } as Record<string, unknown>)
      );
      await Promise.all(promises);
      toast.success('تم تسجيل الحضور بنجاح');
      router.push('/dashboard/hr/attendance');
    } catch (err: unknown) {
      toast.error('خطأ في التسجيل: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="p-10 text-center">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="تسجيل الحضور اليومي">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="التاريخ"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-concrete-50 border-b">
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الموظف</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">وقت الحضور</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">وقت الانصراف</th>
                    <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: Employee) => (
                    <tr key={emp.$id} className="border-b">
                      <td className="p-3">{emp.name}</td>
                      <td className="p-3">
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
                      <td className="p-3">
                        <input
                          type="time"
                          value={attendanceList[emp.$id]?.checkIn || ''}
                          onChange={(e) => handleChange(emp.$id, 'checkIn', e.target.value)}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="time"
                          value={attendanceList[emp.$id]?.checkOut || ''}
                          onChange={(e) => handleChange(emp.$id, 'checkOut', e.target.value)}
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="p-3">
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

            <SubmitButton loading={saving} loadingText="جارٍ التسجيل...">حفظ الحضور</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}