'use client';

import { usePathname, useRouter } from 'next/navigation';
import { ClipboardCheck, CalendarCheck, User, Car, QrCode } from 'lucide-react';

export default function TechnicianBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/technician/dashboard', icon: ClipboardCheck, label: 'مهامي' },
    { href: '/technician/attendance', icon: CalendarCheck, label: 'الحضور' },
    { href: '/technician/vehicles', icon: Car, label: 'المركبات' },
    { href: '/technician/scanner', icon: QrCode, label: 'مسح' },
    { href: '/technician/profile', icon: User, label: 'حسابي' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar/95 backdrop-blur-lg border-t border-white/10 flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl z-50">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[60px] transition-all duration-200 ${
              active
                ? 'text-white bg-primary'
                : 'text-sidebar-text hover:text-white'
            }`}
          >
            <item.icon size={22} />
            <span className="text-[11px] font-semibold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
