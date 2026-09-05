import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/Card';
import Link from 'next/link';
import { FileText, CreditCard, Receipt } from 'lucide-react';

export default function FinancePage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-8">المالية</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <Link href="/dashboard/finance/invoices" className="flex items-center gap-4 h-full">
              <FileText size={32} className="text-primary" />
              <div>
                <h2 className="text-xl font-bold">الفواتير</h2>
                <p className="text-text-muted">إصدار الفواتير ومتابعتها</p>
              </div>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <Link href="/dashboard/finance/payments" className="flex items-center gap-4 h-full">
              <CreditCard size={32} className="text-warning" />
              <div>
                <h2 className="text-xl font-bold">المدفوعات</h2>
                <p className="text-text-muted">تسجيل المدفوعات واستعراضها</p>
              </div>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <Link href="/dashboard/finance/expenses" className="flex items-center gap-4 h-full">
              <Receipt size={32} className="text-danger" />
              <div>
                <h2 className="text-xl font-bold">المصروفات</h2>
                <p className="text-text-muted">إدارة المصروفات والنفقات</p>
              </div>
            </Link>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
