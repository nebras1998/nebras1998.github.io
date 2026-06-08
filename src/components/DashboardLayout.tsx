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
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import SessionManager from '@/components/SessionManager';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* شريط التنقل العلوي */}
      <nav className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          {/* رابط العودة إلى لوحة التحكم */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-gray-800 hover:text-blue-600 font-bold text-xl"
            title="العودة إلى لوحة التحكم"
          >
            <Home size={22} />
            مختبرات الشمال الإنشائية
          </Link>

          <Link href="/dashboard/clients" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <Users size={18} />
            <span>العملاء</span>
          </Link>
          <Link href="/dashboard/projects" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <FolderKanban size={18} />
            <span>المشاريع</span>
          </Link>
          <Link href="/dashboard/samples" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <FlaskConical size={18} />
            <span>العينات</span>
          </Link>
          <Link href="/dashboard/tests" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <ClipboardCheck size={18} />
            <span>الفحوصات</span>
          </Link>
          <Link href="/dashboard/equipment" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <Wrench size={18} />
            <span>الأجهزة</span>
          </Link>
          <Link href="/dashboard/finance" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <Banknote size={18} />
            <span>المالية</span>
          </Link>
          <Link href="/dashboard/files" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <FolderOpen size={18} />
            <span>الملفات</span>
          </Link>
          <Link href="/dashboard/hr" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <UserCheck size={18} />
            <span>الموارد البشرية</span>
          </Link>
          <Link href="/dashboard/vehicles" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <Car size={18} />
            <span>المركبات</span>
          </Link>
          <Link href="/dashboard/backup" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <HardDrive size={18} />
            <span>النسخ الاحتياطي</span>
          </Link>
          <Link href="/dashboard/import-data" className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
            <Upload size={18} />
            <span>استيراد البيانات</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <span className="text-gray-600">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </nav>

      {/* محتوى الصفحة */}
      <main className="p-6">{children}</main>

      {/* إدارة مهلة الجلسة */}
      <SessionManager timeoutMinutes={30} warningMinutes={5} logoutRedirect="/login" />
    </div>
  );
}