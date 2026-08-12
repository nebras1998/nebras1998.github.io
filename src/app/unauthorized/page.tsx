import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-concrete-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
        <ShieldX size={64} className="mx-auto text-danger" />
        <h1 className="text-2xl font-bold">غير مصرح</h1>
        <p className="text-concrete-500">ليست لديك صلاحية الوصول إلى هذه الصفحة.</p>
        <p className="text-sm text-concrete-400">
          إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الإدارة.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="bg-petrol text-white px-6 py-2 rounded-xl hover:bg-petrol-dark">
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
