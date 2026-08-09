'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { LogOut, User, Briefcase, Building, GraduationCap, Award, Mail, Phone } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import TableSkeleton from '@/components/TableSkeleton';

export default function TechnicianProfilePage() {
  const { employee, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/technician/login');
  };

  // إذا لم تكن بيانات الموظف محملة بعد، نعرض مؤشر تحميل
  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-concrete-50 p-4">
        <div className="w-full max-w-3xl">
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-concrete-50 pb-16" dir="rtl">
      {/* الهيدر */}
      <header className="bg-petrol text-white p-4 shadow">
        <h1 className="text-lg font-bold">الملف الشخصي</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* بطاقة الاسم والمسمى */}
        <Card className="text-center">
          <div className="w-20 h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <User size={36} className="text-petrol" />
          </div>
          <h2 className="text-xl font-bold">{employee.name}</h2>
          <p className="text-concrete-500">{employee.jobTitle}</p>
          <Badge status={employee.status} />
        </Card>

        {/* تفاصيل الموظف */}
        <Card className="space-y-3">
          <h3 className="font-bold text-concrete-800 mb-2">معلومات الحساب</h3>

          <div className="flex items-center gap-3">
            <Mail size={18} className="text-concrete-500" />
            <div>
              <p className="text-sm text-concrete-500">البريد الإلكتروني</p>
              <p className="font-medium">{employee.email || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone size={18} className="text-concrete-500" />
            <div>
              <p className="text-sm text-concrete-500">الهاتف</p>
              <p className="font-medium">{employee.phone || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Briefcase size={18} className="text-concrete-500" />
            <div>
              <p className="text-sm text-concrete-500">المسمى الوظيفي</p>
              <p className="font-medium">{employee.jobTitle || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Building size={18} className="text-concrete-500" />
            <div>
              <p className="text-sm text-concrete-500">القسم</p>
              <p className="font-medium">{employee.department || '-'}</p>
            </div>
          </div>

          {employee.qualification && (
            <div className="flex items-center gap-3">
              <GraduationCap size={18} className="text-concrete-500" />
              <div>
                <p className="text-sm text-concrete-500">المؤهل العلمي</p>
                <p className="font-medium">{employee.qualification}</p>
              </div>
            </div>
          )}

          {employee.certifications && (
            <div className="flex items-center gap-3">
              <Award size={18} className="text-concrete-500" />
              <div>
                <p className="text-sm text-concrete-500">الشهادات المهنية</p>
                <p className="font-medium">{employee.certifications}</p>
              </div>
            </div>
          )}
        </Card>

        {/* زر تسجيل الخروج */}
        <button
          onClick={handleLogout}
          className="w-full bg-danger-solid hover:bg-danger-dark text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow"
        >
          <LogOut size={20} />
          تسجيل الخروج
        </button>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}