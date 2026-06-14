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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 shadow-lg z-50 safe-area-bottom">
      {navItems.map((item) => (
        <button
          key={item.href}
          onClick={() => router.push(item.href)}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] ${
            pathname.startsWith(item.href)
              ? 'text-green-600 bg-green-50'
              : 'text-gray-500'
          }`}
        >
          <item.icon size={26} />
          <span className="text-xs font-medium">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}