'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { LogOut, Clock } from 'lucide-react';

interface SessionManagerProps {
  timeoutMinutes?: number;        // مدة الجلسة (افتراضياً 30)
  warningMinutes?: number;        // قبل كم دقيقة يظهر التنبيه (افتراضياً 5)
  logoutRedirect?: string;        // إلى أين يذهب بعد الخروج (افتراضياً '/login')
}

export default function SessionManager({
  timeoutMinutes = 30,
  warningMinutes = 5,
  logoutRedirect = '/login',
}: SessionManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

  const [showWarning, setShowWarning] = useState(false);
  const [remaining, setRemaining] = useState(timeoutMinutes * 60); // بالثواني

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // تسجيل الخروج
  const handleLogout = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowWarning(false);
    await logout();
    router.push(logoutRedirect);
  };

  const setupTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, warningTime);

    const logoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, logoutTime);

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeoutMinutes, warningMinutes]);

  // إعادة تعيين المؤقت (يُستدعى من النشاط وتمديد الجلسة)
  const resetTimer = useCallback(() => {
    setShowWarning(false);
    setRemaining(timeoutMinutes * 60);
    setupTimers();
  }, [timeoutMinutes, setupTimers]);

  // تمديد الجلسة
  const handleExtend = () => {
    resetTimer();
  };

  // بدء المؤقت عند تحميل المكون
  useEffect(() => {
    setupTimers();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [setupTimers, resetTimer]);

  // صياغة الوقت المتبقي
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* نافذة التحذير */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 text-center">
            <Clock size={48} className="mx-auto text-warning mb-4" />
            <h2 className="text-xl font-bold mb-2">الجلسة على وشك الانتهاء</h2>
            <p className="text-concrete-500 mb-4">
              ستنتهي جلستك خلال 5 دقائق. هل تريد تمديد الوقت؟
            </p>
            <p className="text-sm text-concrete-500 mb-6">
              الوقت المتبقي: {formatTime(remaining)}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleExtend}
                className="bg-petrol text-white px-6 py-2 rounded-lg hover:bg-petrol-dark font-bold"
              >
                تمديد الجلسة
              </button>
              <button
                onClick={handleLogout}
                className="bg-danger-solid text-white px-6 py-2 rounded-lg hover:bg-danger-dark flex items-center gap-1"
              >
                <LogOut size={16} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}