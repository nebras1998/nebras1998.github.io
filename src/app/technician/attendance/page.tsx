'use client';

import { useState, useEffect } from 'react';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, ATTENDANCE_COLLECTION_ID } from '@/lib/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { Query } from 'appwrite';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import { createNotification } from '@/lib/notifications';

export default function TechnicianAttendance() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(new Date().toTimeString().slice(0, 5));
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) return;
    const findTodayRecord = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, ATTENDANCE_COLLECTION_ID, [
          Query.equal('employeeId', employee.$id),
          Query.equal('date', today),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) {
          const record = res.documents[0];
          setExistingRecordId(record.$id);
          setCheckIn(record.checkIn || '');
          setCheckOut(record.checkOut || '');
          if (record.checkIn && record.checkOut) toast.info('لقد سجلت الحضور والانصراف اليوم');
          else if (record.checkIn) setMode('out');
        }
      } catch {}
    };
    findTodayRecord();
  }, [employee, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setLoading(true);
    try {
      if (existingRecordId) {
        const updateData: any = {};
        if (mode === 'in') { updateData.checkIn = checkIn; updateData.status = 'حاضر'; }
        else updateData.checkOut = checkOut;
        await databases.updateDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, existingRecordId, updateData);
        toast.success(mode === 'in' ? 'تم تحديث وقت الحضور' : 'تم تسجيل الانصراف');
      } else {
        await databases.createDocument(DATABASE_ID, ATTENDANCE_COLLECTION_ID, 'unique()', {
          employeeId: employee.$id, date: today,
          checkIn: mode === 'in' ? checkIn : '',
          checkOut: mode === 'out' ? checkOut : '',
          status: checkIn ? 'حاضر' : 'غائب',
        });
        toast.success(mode === 'in' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف');
      }
      if (employee) {
        await createNotification({
          type: 'حضور',
          message: `سجل ${employee.name} ${mode === 'in' ? 'حضوراً' : 'انصرافاً'} اليوم الساعة ${mode === 'in' ? checkIn : checkOut}`,
          employeeId: employee.$id, employeeName: employee.name,
        });
      }
      router.push('/technician/dashboard');
    } catch (err: any) { toast.error('خطأ: ' + err.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold">تسجيل الحضور</h1>
      </header>
      <main className="p-4">
        <div className="bg-white p-6 rounded-2xl shadow">
          <div className="text-center mb-6">
            <CalendarCheck size={56} className="mx-auto text-green-600 mb-3" />
            <p className="text-xl font-bold">{employee?.name}</p>
            <p className="text-gray-500">{today}</p>
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={() => setMode('in')} className={`flex-1 py-3 rounded-xl font-bold text-base ${mode === 'in' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>تسجيل حضور</button>
            <button onClick={() => setMode('out')} className={`flex-1 py-3 rounded-xl font-bold text-base ${mode === 'out' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>تسجيل انصراف</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1.5 font-bold text-base">{mode === 'in' ? 'وقت الحضور' : 'وقت الانصراف'}</label>
              <input type="time" value={mode === 'in' ? checkIn : checkOut}
                onChange={e => mode === 'in' ? setCheckIn(e.target.value) : setCheckOut(e.target.value)}
                className="w-full border p-3.5 rounded-xl text-lg text-center" />
            </div>
            <button type="submit" disabled={loading}
              className={`w-full text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 ${mode === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {loading ? 'جارٍ التسجيل...' : mode === 'in' ? 'تسجيل حضور' : 'تسجيل انصراف'}
            </button>
          </form>
        </div>
      </main>
      <TechnicianBottomNav />
    </div>
  );
}