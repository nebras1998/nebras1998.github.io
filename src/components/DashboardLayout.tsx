'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  LogOut,
  FolderKanban,
  FlaskConical,
  ClipboardCheck,
  Home,
  Wrench,
  Banknote,
  FolderOpen,
  UserCheck,
  Car,
  HardDrive,
  Upload,
  Calendar,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import SessionManager from '@/components/SessionManager';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-concrete-50" dir="rtl">
      {/* شريط التنقل العلوي */}
      <nav className="bg-white shadow-sm border-b px-4 py-3 flex items-center gap-4 overflow-x-auto">
        {/* رابط العودة إلى لوحة التحكم */}
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-2 text-concrete-800 hover:text-petrol font-bold text-lg"
          title="العودة إلى لوحة التحكم"
        >
          <Home size={20} />
          <span className="hidden sm:inline">مختبرات الشمال</span>
        </Link>

        <Link href="/dashboard/clients" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <Users size={16} />
          <span className="hidden sm:inline">العملاء</span>
        </Link>
        <Link href="/dashboard/projects" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <FolderKanban size={16} />
          <span className="hidden sm:inline">المشاريع</span>
        </Link>
        <Link href="/dashboard/samples" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <FlaskConical size={16} />
          <span className="hidden sm:inline">العينات</span>
        </Link>
        <Link href="/dashboard/tests" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <ClipboardCheck size={16} />
          <span className="hidden sm:inline">الفحوصات</span>
        </Link>
        <Link href="/dashboard/equipment" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <Wrench size={16} />
          <span className="hidden sm:inline">الأجهزة</span>
        </Link>
        <Link href="/dashboard/finance" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <Banknote size={16} />
          <span className="hidden sm:inline">المالية</span>
        </Link>
        <Link href="/dashboard/files" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <FolderOpen size={16} />
          <span className="hidden sm:inline">الملفات</span>
        </Link>
        <Link href="/dashboard/hr" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <UserCheck size={16} />
          <span className="hidden sm:inline">الموارد البشرية</span>
        </Link>
        <Link href="/dashboard/vehicles" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <Car size={16} />
          <span className="hidden sm:inline">المركبات</span>
        </Link>
        <Link href="/dashboard/bookings" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <Calendar size={16} />
          <span className="hidden sm:inline">الحجوزات</span>
        </Link>
        <Link href="/dashboard/backup" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <HardDrive size={16} />
          <span className="hidden sm:inline">النسخ الاحتياطي</span>
        </Link>
        <Link href="/dashboard/import-data" className="flex-shrink-0 flex items-center gap-1 text-concrete-500 hover:text-petrol text-sm">
          <Upload size={16} />
          <span className="hidden sm:inline">استيراد</span>
        </Link>

        <div className="flex-1" />
        <NotificationBell />
        <span className="text-concrete-500 text-sm hidden sm:inline">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="bg-danger-solid hover:bg-danger-solid text-white px-3 py-1 rounded text-sm flex items-center gap-1"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">خروج</span>
        </button>
      </nav>

      {/* محتوى الصفحة */}
      <main className="p-4 sm:p-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* إدارة مهلة الجلسة */}
      <SessionManager timeoutMinutes={30} warningMinutes={5} logoutRedirect="/login" />
    </div>
  );
}