import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { List, FileText, CreditCard, Receipt } from 'lucide-react';

export default function FinancePage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-8">المالية</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/dashboard/finance/services"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <List size={32} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-bold">الخدمات والأسعار</h2>
              <p className="text-gray-500">إدارة قائمة الخدمات وتسعيرها</p>
            </div>
          </Link>

          <Link
            href="/dashboard/finance/invoices"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <FileText size={32} className="text-green-600" />
            <div>
              <h2 className="text-xl font-bold">الفواتير</h2>
              <p className="text-gray-500">إصدار الفواتير ومتابعتها</p>
            </div>
          </Link>

          <Link
            href="/dashboard/finance/payments"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <CreditCard size={32} className="text-orange-600" />
            <div>
              <h2 className="text-xl font-bold">المدفوعات</h2>
              <p className="text-gray-500">تسجيل المدفوعات واستعراضها</p>
            </div>
          </Link>

          <Link
            href="/dashboard/finance/expenses"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <Receipt size={32} className="text-red-600" />
            <div>
              <h2 className="text-xl font-bold">المصروفات</h2>
              <p className="text-gray-500">إدارة المصروفات والنفقات</p>
            </div>
          </Link>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}