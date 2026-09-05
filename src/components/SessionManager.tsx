'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { LogOut, Clock } from 'lucide-react';

interface SessionManagerProps {
  timeoutMinutes?: number;
  warningMinutes?: number;
  logoutRedirect?: string;
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
  const [remaining, setRemaining] = useState(timeoutMinutes * 60);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const resetTimer = useCallback(() => {
    setShowWarning(false);
    setRemaining(timeoutMinutes * 60);
    setupTimers();
  }, [timeoutMinutes, setupTimers]);

  const handleExtend = () => {
    resetTimer();
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-warning-bg flex items-center justify-center mx-auto mb-5">
              <Clock size={32} className="text-warning" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">الجلسة على وشك الانتهاء</h2>
            <p className="text-text-secondary mb-2">
              ستنتهي جلستك خلال {warningMinutes} دقائق. هل تريد تمديد الوقت؟
            </p>
            <p className="text-sm text-text-muted mb-6 font-mono">
              الوقت المتبقي: {formatTime(remaining)}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleExtend}
                className="bg-gradient-to-l from-primary to-primary-dark text-white px-6 py-2.5 rounded-xl hover:from-primary-dark hover:to-primary font-bold transition-all duration-200 active:scale-[0.98]"
              >
                تمديد الجلسة
              </button>
              <button
                onClick={handleLogout}
                className="bg-danger-solid text-white px-6 py-2.5 rounded-xl hover:bg-danger-dark flex items-center gap-1.5 font-semibold transition-all duration-200 active:scale-[0.98]"
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
