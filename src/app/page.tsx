'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function Home() {
  const router = useRouter();
  const { loading, user } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [loading, user, router]);

  // عرض رسالة تحميل مؤقتة
  return (
    <div className="min-h-screen flex items-center justify-center text-xl text-gray-500">
      جارٍ التحقق من الجلسة...
    </div>
  );
}