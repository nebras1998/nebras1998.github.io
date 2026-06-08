'use client'; // هذا المكون يعمل في جهة المستخدم (المتصفح)

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore(); // نقرأ حالة المستخدم
  const router = useRouter();               // للتوجيه إلى صفحة تسجيل الدخول

  useEffect(() => {
    // إذا انتهى التحميل ولا يوجد مستخدم، اذهب إلى صفحة /login
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // أثناء فحص الجلسة، نعرض رسالة تحميل
  if (loading) return <div className="text-center p-10">جارٍ التحميل...</div>;

  // إذا لم يوجد مستخدم، لا نعرض شيئًا (سيتم التوجيه قريبًا)
  if (!user) return null;

  // المستخدم مسجل الدخول، نعرض المحتوى المحمي
  return <>{children}</>;
}