'use client';

import { useRef, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
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
  Menu,
  X,
  ChevronDown,
  List,
  FileText,
  CreditCard,
  Receipt,
  CalendarCheck,
  Clock,
  CalendarOff,
  BookOpen,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import SessionManager from '@/components/SessionManager';
import ErrorBoundary from '@/components/ErrorBoundary';
import GlobalSearch from '@/components/GlobalSearch';

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { key: string; href: string; label: string; icon: LucideIcon; items: NavItem[] };

const OPERATIONS: NavGroup = {
  key: 'operations',
  href: '/dashboard',
  label: 'العمليات',
  icon: Home,
  items: [
    { href: '/dashboard/clients', label: 'العملاء', icon: Users },
    { href: '/dashboard/projects', label: 'المشاريع', icon: FolderKanban },
    { href: '/dashboard/samples', label: 'العينات', icon: FlaskConical },
    { href: '/dashboard/tests', label: 'الفحوصات', icon: ClipboardCheck },
    { href: '/dashboard/catalog', label: 'كتالوج الفحوصات', icon: BookOpen },
    { href: '/dashboard/equipment', label: 'الأجهزة', icon: Wrench },
    { href: '/dashboard/bookings', label: 'الحجوزات', icon: Calendar },
  ],
};

const RESOURCES: NavGroup = {
  key: 'resources',
  href: '/dashboard/files',
  label: 'الموارد',
  icon: HardDrive,
  items: [
    { href: '/dashboard/vehicles', label: 'المركبات', icon: Car },
    { href: '/dashboard/files', label: 'الملفات', icon: FolderOpen },
    { href: '/dashboard/backup', label: 'النسخ الاحتياطي', icon: HardDrive },
    { href: '/dashboard/import-data', label: 'استيراد', icon: Upload },
  ],
};

const GROUPS: NavGroup[] = [
  {
    key: 'finance',
    href: '/dashboard/finance',
    label: 'المالية',
    icon: Banknote,
    items: [
      { href: '/dashboard/finance/services', label: 'الخدمات والأسعار', icon: List },
      { href: '/dashboard/finance/invoices', label: 'الفواتير', icon: FileText },
      { href: '/dashboard/finance/payments', label: 'المدفوعات', icon: CreditCard },
      { href: '/dashboard/finance/expenses', label: 'المصروفات', icon: Receipt },
    ],
  },
  {
    key: 'hr',
    href: '/dashboard/hr',
    label: 'الموارد البشرية',
    icon: UserCheck,
    items: [
      { href: '/dashboard/hr/employees', label: 'الموظفون', icon: Users },
      { href: '/dashboard/hr/attendance', label: 'الحضور والانصراف', icon: CalendarCheck },
      { href: '/dashboard/hr/leaves', label: 'الإجازات', icon: CalendarOff },
      { href: '/dashboard/hr/overtime', label: 'العمل الإضافي', icon: Clock },
    ],
  },
];

const ALL_GROUPS: NavGroup[] = [OPERATIONS, ...GROUPS, RESOURCES];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const openMenuSoon = (key: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(key);
  };

  const closeMenuSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 180);
  };

  return (
    <div className="min-h-screen bg-concrete-50" dir="rtl">
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b">
        <div className="relative">
          <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
            {/* زر القائمة (الجوال) */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-concrete-600 hover:bg-concrete-100"
              aria-label="فتح القائمة"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* شعار النظام */}
            <Link
              href="/dashboard"
              className="flex-shrink-0 flex items-center gap-2 text-concrete-800 hover:text-petrol font-bold text-lg"
              title="العودة إلى لوحة التحكم"
            >
              <Home size={20} />
              <span className="hidden md:inline">مختبرات الشمال</span>
            </Link>

            {/* التنقل الرئيسي (سطح المكتب) */}
            <nav className="hidden lg:flex items-center gap-1 min-w-0 overflow-x-auto py-1">
              {ALL_GROUPS.map((group) => {
                const active = openMenu === group.key;
                return (
                  <button
                    key={group.key}
                    onClick={() => setOpenMenu(active ? null : group.key)}
                    onMouseEnter={() => openMenuSoon(group.key)}
                    onMouseLeave={closeMenuSoon}
                    className={`flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                      active ? 'text-petrol bg-petrol-soft font-bold' : 'text-concrete-500 hover:text-petrol hover:bg-concrete-50'
                    }`}
                  >
                    <group.icon size={16} />
                    <span>{group.label}</span>
                    <ChevronDown size={14} className={active ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                );
              })}
            </nav>

            {/* البحث العام (سطح المكتب) */}
            <div className="hidden md:block flex-1 max-w-md mx-auto min-w-0">
              <GlobalSearch />
            </div>

            <div className="flex-1" />
            <NotificationBell />
            <span className="text-concrete-500 text-sm hidden xl:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-danger-solid hover:bg-danger-dark text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>

          {/* لوحة المجموعات (سطح المكتب) — خارج شريط التمرير حتى لا تُقتطع */}
          {openMenu && (
            <div
              className="hidden lg:block absolute inset-x-0 top-full bg-white border-b border-concrete-200 shadow-md"
              onMouseEnter={() => openMenuSoon(openMenu)}
              onMouseLeave={closeMenuSoon}
            >
              {ALL_GROUPS.filter((g) => g.key === openMenu).map((group) => (
                <div key={group.key} className="max-w-screen-2xl mx-auto px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <group.icon size={20} className="text-petrol" />
                      {group.label}
                    </h2>
                    <Link href={group.href} className="text-sm text-petrol hover:underline">
                      عرض كل قسم {group.label}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 p-3 rounded-lg border border-concrete-100 hover:border-petrol hover:bg-petrol-soft transition-colors"
                      >
                        <item.icon size={18} className="text-petrol flex-shrink-0" />
                        <span className="text-sm font-bold">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* قائمة الجوال */}
        {menuOpen && (
          <div className="lg:hidden border-t border-concrete-100 bg-white px-4 py-4 space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <GlobalSearch />

            {ALL_GROUPS.map((group) => (
              <div key={group.key}>
                <h3 className="text-xs font-bold text-concrete-400 mb-2">{group.label}</h3>
                <div className="grid grid-cols-2 gap-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-concrete-700 hover:bg-concrete-50"
                    >
                      <item.icon size={16} className="text-concrete-500" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* محتوى الصفحة */}
      <main className="p-4 sm:p-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* إدارة مهلة الجلسة */}
      <SessionManager timeoutMinutes={30} warningMinutes={5} logoutRedirect="/login" />
    </div>
  );
}
