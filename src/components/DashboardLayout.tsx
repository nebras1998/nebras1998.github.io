'use client';

import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, usePathname } from 'next/navigation';
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
  FileText,
  CreditCard,
  Receipt,
  CalendarCheck,
  Clock,
  CalendarOff,
  BookOpen,
  Settings,
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

const SETTINGS: NavGroup = {
  key: 'settings',
  href: '/dashboard/settings/report-template',
  label: 'الإعدادات',
  icon: Settings,
  items: [
    { href: '/dashboard/settings/report-template', label: 'قالب التقرير', icon: FileText },
  ],
};

const ALL_GROUPS: NavGroup[] = [OPERATIONS, ...GROUPS, RESOURCES, SETTINGS];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Group that should be open by default for the current route (active item,
  // matching section index, or the dashboard home -> operations).
  const activeKey = useMemo(() => {
    for (const group of ALL_GROUPS) {
      if (group.href !== '/dashboard' && pathname.startsWith(group.href)) return group.key;
    }
    if (pathname === '/dashboard') return OPERATIONS.key;
    for (const group of ALL_GROUPS) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return group.key;
      }
    }
    return null;
  }, [pathname]);

  const [prevActiveKey, setPrevActiveKey] = useState(activeKey);
  if (prevActiveKey !== activeKey) {
    setPrevActiveKey(activeKey);
    setOpenGroups(new Set(activeKey ? [activeKey] : []));
  }

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-concrete-50" dir="rtl">
      {/* الشريط الجانبي */}
      <aside
        className={`fixed top-0 right-0 z-40 h-screen w-[220px] bg-white border-l border-concrete-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* شعار النظام */}
        <Link
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2 px-5 py-4 text-concrete-800 hover:text-petrol font-bold text-lg border-b border-concrete-100"
          title="العودة إلى لوحة التحكم"
        >
          <Home size={20} />
          <span>مختبرات الشمال</span>
        </Link>

        {/* البحث العام (الجوال) */}
        <div className="lg:hidden px-3 pt-3">
          <GlobalSearch />
        </div>

        {/* التنقل (أكورديون) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {ALL_GROUPS.map((group) => {
            const groupActive = group.key === activeKey;
            const open = openGroups.has(group.key) || groupActive;
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                    groupActive ? 'text-petrol' : 'text-concrete-700 hover:bg-concrete-50'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <group.icon size={16} className="flex-shrink-0" />
                    <span className="truncate">{group.label}</span>
                  </span>
                  <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="mt-1 pr-2 space-y-0.5 border-r border-concrete-100">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                            active ? 'bg-petrol-soft text-petrol font-bold' : 'text-concrete-500 hover:bg-concrete-50 hover:text-petrol'
                          }`}
                        >
                          <item.icon size={15} className="flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* الخلفية المعتمة (الجوال) */}
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* الشريط العلوي */}
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b lg:mr-[220px]">
        <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3">
          {/* زر القائمة (الجوال) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden p-2 -ml-1 rounded-lg text-concrete-600 hover:bg-concrete-100"
            aria-label="فتح القائمة"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

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
      </header>

      {/* محتوى الصفحة */}
      <main className="p-4 sm:p-6 lg:mr-[220px]">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* إدارة مهلة الجلسة */}
      <SessionManager timeoutMinutes={30} warningMinutes={5} logoutRedirect="/login" />
    </div>
  );
}
