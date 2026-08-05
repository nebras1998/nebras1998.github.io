'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import TableSkeleton from './TableSkeleton';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user || !role) {
      if (pathname.startsWith('/technician')) {
        router.push('/technician/login');
      } else {
        router.push('/login');
      }
      return;
    }

    if (pathname.startsWith('/dashboard')) {
      if (role !== 'مدير' && role !== 'إداري') {
        router.push('/technician/dashboard');
      }
    } else if (pathname.startsWith('/technician')) {
      if (role !== 'فني' && role !== 'مدير') {
        router.push('/dashboard');
      }
    }
  }, [user, role, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-concrete-50 p-4">
        <div className="w-full max-w-3xl">
          <TableSkeleton rows={3} cols={3} />
        </div>
      </div>
    );
  }

  if (!user || !role) return null;

  if (pathname.startsWith('/dashboard') && role !== 'مدير' && role !== 'إداري') {
    return null;
  }
  if (pathname.startsWith('/technician') && role !== 'فني' && role !== 'مدير') {
    return null;
  }

  return <>{children}</>;
}
