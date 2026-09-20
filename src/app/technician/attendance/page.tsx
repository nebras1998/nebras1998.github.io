'use client';

import { useState, useEffect, useCallback } from 'react';
import { listAttendance, Query } from '@/lib/services';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarCheck, CheckCircle2, WifiOff } from 'lucide-react';

import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import { createNotification } from '@/lib/notifications';
import { apiFetch } from '@/lib/api-client';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import SubmitButton from '@/components/SubmitButton';
import { computeWorkHours } from '@/lib/work-time';
import type { AttendanceRecord } from '@/types';

export default function TechnicianAttendance() {
  const { employee } = useAuthStore();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [checkIn, setCheckIn] = useState(new Date().toTimeString().slice(0, 5));
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saved, setSaved] = useState<{ type: 'in' | 'out'; time: string } | null>(null);

  // سجل ذاتي: آخر أيام الحضور الخاصة بالفني
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyError, setHistoryError] = useState(false);

  const findTodayRecord = useCallback(async (): Promise<string | null> => {
    if (!employee) return null;
    try {
      const res = await listAttendance([
        Query.equal('employeeId', employee.$id),
        Query.equal('date', today),
        Query.limit(1),
      ]);
      return res.documents[0]?.$id ?? null;
    } catch {
      return null;
    }
  }, [employee, today]);

  useEffect(() => {
    if (!employee) return;
    const init = async () => {
      try {
        const res = await listAttendance([
          Query.equal('employeeId', employee.$id),
          Query.equal('date', today),
          Query.limit(1),
        ]);
        setLoadError(false);
        if (res.documents.length > 0) {
          const record = res.documents[0];
          setExistingRecordId(record.$id);
          setCheckIn(record.checkIn || '');
          setCheckOut(record.checkOut || '');
          if (record.checkIn && record.checkOut) toast.info('لقد سجلت الحضور والانصراف اليوم');
          else if (record.checkIn) setMode('out');
        }
      } catch {
        // لا نمنع الحفظ، لكن نُظهر أن حالة اليوم لم تُتحقق لتجنب التكرار دون وعي
        setLoadError(true);
      }
    };
    init();

    (async () => {
      try {
        const res = await listAttendance([
          Query.equal('employeeId', employee.$id),
          Query.orderDesc('date'),
          Query.limit(30),
        ]);
        setHistory(res.documents);
        setHistoryError(false);
      } catch {
        setHistoryError(true);
      }
    })();

    return () => {
      // توليد متغير today/employee لم يُستخدم هنا — استقرار منع التكرار ضمني عبر cache
    };
  }, [employee, today]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setLoading(true);
    try {
      // تحقق مزدوج في لحظة الحفظ لمنع إنشاء سجل مكرر إذا فشل جلب أولي أو كان الاتصال متقطعًا
      let recordId = existingRecordId;
      if (!recordId) {
        recordId = await findTodayRecord();
      }
      if (recordId) {
        const updateData: Record<string, unknown> = {};
        if (mode === 'in') { updateData.checkIn = checkIn; updateData.status = 'حاضر'; }
        else { updateData.checkOut = checkOut; }
        await apiFetch(`/api/attendance/${recordId}`, { method: 'PATCH', body: updateData });
      } else {
        await apiFetch('/api/attendance', {
          method: 'POST',
          body: {
            employeeId: employee.$id, date: today,
            checkIn: mode === 'in' ? checkIn : '',
            checkOut: mode === 'out' ? checkOut : '',
            status: checkIn ? 'حاضر' : 'غائب',
          },
        });
      }
      await createNotification({
        type: 'حضور',
        message: `سجل ${employee.name} ${mode === 'in' ? 'حضوراً' : 'انصرافاً'} اليوم الساعة ${mode === 'in' ? checkIn : checkOut}`,
        employeeId: employee.$id, employeeName: employee.name,
      });
      toast.success(mode === 'in' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف');
      setSaved({ type: mode, time: mode === 'in' ? checkIn : checkOut });
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  // تأكيد بصري واضح بعد التسجيل
  if (saved) {
    return (
      <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
        <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
          <h1 className="text-lg font-bold">تسجيل الحضور</h1>
        </header>
        <main className="p-4">
          <Card className="text-center py-8 space-y-4">
            <CheckCircle2 size={64} className="mx-auto text-success" />
            <h2 className="text-2xl font-bold text-text-primary">
              {saved.type === 'in' ? 'تم تسجيل حضورك' : 'تم تسجيل انصرافك'}
            </h2>
            <p className="text-text-secondary">اليوم {today} الساعة <span className="font-bold font-mono" dir="ltr">{saved.time}</span></p>
            <button
              onClick={() => router.push('/technician/dashboard')}
              className="mx-auto bg-primary text-white px-8 py-3 rounded-xl font-bold hover:from-primary-dark hover:to-primary"
            >
              العودة إلى مهامي
            </button>
          </Card>
        </main>
        <TechnicianBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold">تسجيل الحضور</h1>
      </header>
      <main className="p-4 space-y-4">
        {loadError && (
          <div className="bg-danger-bg border border-danger/20 text-danger p-4 rounded-xl text-sm">
            <div className="flex items-center gap-2 font-bold">
              <WifiOff size={18} /> تعذر التحقق من حالة تسجيل اليوم الآن
            </div>
            <p className="mt-1">عند الحفظ سنتحقق مجددًا من تسجيلك لتجنب التكرار — إذا استمرت المشكلة أعد المحاولة لاحقًا.</p>
          </div>
        )}
        <Card>
          <div className="text-center mb-6">
            <CalendarCheck size={56} className="mx-auto text-primary mb-3" />
            <p className="text-xl font-bold">{employee?.name}</p>
            <p className="text-text-muted">{today}</p>
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={() => setMode('in')} className={`flex-1 py-4 rounded-xl font-bold text-base ${mode === 'in' ? 'bg-primary text-white' : 'bg-border'}`}>تسجيل حضور</button>
            <button onClick={() => setMode('out')} className={`flex-1 py-4 rounded-xl font-bold text-base ${mode === 'out' ? 'bg-warning-solid text-white' : 'bg-border'}`}>تسجيل انصراف</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label={mode === 'in' ? 'وقت الحضور' : 'وقت الانصراف'}
              type="time"
              value={mode === 'in' ? checkIn : checkOut}
              onChange={e => mode === 'in' ? setCheckIn(e.target.value) : setCheckOut(e.target.value)}
              inputClassName="text-lg text-center"
            />
            <SubmitButton
              loading={loading}
              loadingText="جارٍ التسجيل..."
              className={`w-full text-lg ${mode === 'in' ? '' : '!bg-warning-solid !from-warning-solid !to-warning-solid hover:!from-warning-solid hover:!to-warning-solid'}`}
            >
              {mode === 'in' ? 'تسجيل حضور' : 'تسجيل انصراف'}
            </SubmitButton>
          </form>
        </Card>

        {/* سجل ذاتي بأيام الفني */}
        <Card>
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <CalendarCheck size={20} className="text-primary" /> آخر تسجيلاتي
          </h2>
          {historyError ? (
            <p className="text-sm text-danger">تعذر تحميل السجل الذاتي — تحقق من الاتصال.</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-text-muted">لا توجد تسجيلات سابقة.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {history.map((r) => (
                <div key={r.$id} className="flex items-center justify-between text-sm border border-border rounded-xl px-3 py-2">
                  <div>
                    <p className="font-bold">{r.date}</p>
                    <p className="text-xs text-text-muted">
                      حضور: <span className="font-mono">{r.checkIn || '-'}</span> / انصراف: <span className="font-mono">{r.checkOut || '-'}</span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">{computeWorkHours(r.checkIn, r.checkOut) > 0 ? `${computeWorkHours(r.checkIn, r.checkOut)} س` : '-'}</p>
                    <p className="text-xs text-text-muted">{r.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
      <TechnicianBottomNav />
    </div>
  );
}