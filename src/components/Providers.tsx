'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function Providers({ children }: { children: React.ReactNode }) {
  const checkSession = useAuthStore((state) => state.checkSession);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-text-muted">
        جارٍ التحقق من الجلسة...
      </div>
    );
  }

  return <>{children}</>;
}