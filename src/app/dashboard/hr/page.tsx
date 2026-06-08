'use client';

import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, UserCheck, CalendarCheck, Clock } from 'lucide-react';

export default function HRPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-8">الموارد البشرية</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard/hr/employees"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <Users size={32} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">الموظفون</h2>
              <p className="text-gray-500">إدارة بيانات الموظفين</p>
            </div>
          </Link>

          <Link
            href="/dashboard/hr/attendance"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <CalendarCheck size={32} className="text-green-600" />
            <div>
              <h2 className="text-xl font-bold">الحضور والانصراف</h2>
              <p className="text-gray-500">تسجيل ومتابعة الحضور اليومي</p>
            </div>
          </Link>

          <Link
            href="/dashboard/hr/leaves"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <UserCheck size={32} className="text-orange-600" />
            <div>
              <h2 className="text-xl font-bold">الإجازات</h2>
              <p className="text-gray-500">إدارة طلبات الإجازة</p>
            </div>
          </Link>

          <Link
            href="/dashboard/hr/overtime"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <Clock size={32} className="text-purple-600" />
            <div>
              <h2 className="text-xl font-bold">العمل الإضافي</h2>
              <p className="text-gray-500">إدارة طلبات وساعات العمل الإضافي</p>
            </div>
          </Link>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}