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
    { href: '/dashboard/reports', label: 'التقارير', icon: FileText },
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
    <div className="min-h-screen bg-surface-dim" dir="rtl">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed top-0 right-0 z-40 h-screen w-[240px] bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 px-5 py-5 border-b border-white/10 group"
          title="العودة إلى لوحة التحكم"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <FlaskConical size={18} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base block leading-tight">مختبرات الشمال</span>
            <span className="text-sidebar-text text-[11px]">نظام إدارة المختبر</span>
          </div>
        </Link>

        {/* Mobile search */}
        <div className="lg:hidden px-3 pt-3">
          <GlobalSearch />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {ALL_GROUPS.map((group) => {
            const groupActive = group.key === activeKey;
            const open = openGroups.has(group.key) || groupActive;
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    groupActive
                      ? 'bg-white/10 text-white'
                      : 'text-sidebar-text hover:bg-white/5 hover:text-sidebar-text-active'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <group.icon size={17} className="flex-shrink-0" />
                    <span className="truncate font-semibold">{group.label}</span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <div className="mt-1 mr-2 space-y-0.5 border-r-2 border-white/10">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 mr-[-1px] ${
                            active
                              ? 'bg-primary text-white font-bold border-r-2 border-accent -mr-[1px]'
                              : 'text-sidebar-text hover:bg-white/5 hover:text-sidebar-text-active'
                          }`}
                        >
                          <item.icon size={14} className="flex-shrink-0" />
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

        {/* Sidebar footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-3 py-2 text-sidebar-text text-xs">
            <div className="w-2 h-2 rounded-full bg-success-solid animate-pulse" />
            <span>v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-lg border-b border-border lg:mr-[240px]">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden p-2 -ml-1 rounded-xl text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors"
            aria-label="فتح القائمة"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Desktop search */}
          <div className="hidden md:block flex-1 max-w-lg mx-auto min-w-0">
            <GlobalSearch />
          </div>

          <div className="flex-1" />

          <NotificationBell />

          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-border">
            <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
              <span className="text-primary text-sm font-bold">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-text-secondary text-sm">{user?.email}</span>
          </div>

          <button
            onClick={handleLogout}
            className="bg-danger-solid hover:bg-danger-dark text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="p-4 sm:p-6 lg:mr-[240px]">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <SessionManager timeoutMinutes={30} warningMinutes={5} logoutRedirect="/login" />
    </div>
  );
}
