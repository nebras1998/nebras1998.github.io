'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function Providers({ children }: { children: React.ReactNode }) {
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    checkSession(); // عند تحميل التطبيق، نفحص الجلسة
  }, [checkSession]);

  return <>{children}</>;
}