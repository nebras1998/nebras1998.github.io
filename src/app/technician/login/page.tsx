'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export default function TechnicianLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginTechnician = useAuthStore((state) => state.loginTechnician);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginTechnician(email, password);
      router.push('/technician/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('غير موجود')) {
        setError('لا يوجد موظف بهذا البريد الإلكتروني. تواصل مع المدير.');
      } else if (msg.includes('ليس للفنيين')) {
        setError('هذا الحساب ليس للفنيين. استخدم لوحة الإدارة.');
      } else if (msg.includes('Invalid credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError(msg || 'فشل تسجيل الدخول. حاول مجددًا.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1 text-center">دخول الفنيين</h1>
        <p className="text-center text-gray-500 mb-5 text-sm">مختبرات الشمال الإنشائية</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-1.5 text-gray-700 font-medium">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 p-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="example@lab.ps"
            dir="ltr"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1.5 text-gray-700 font-medium">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 p-3.5 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="********"
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3.5 rounded-xl text-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'جارٍ تسجيل الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}