'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import TextField from '@/components/TextField';
import SubmitButton from '@/components/SubmitButton';

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
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
    <div className="min-h-screen flex items-center justify-center bg-concrete-100 px-4" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1 text-center">دخول الفنيين</h1>
        <p className="text-center text-concrete-500 mb-5 text-sm">مختبرات الشمال الإنشائية</p>

        {error && (
          <div className="bg-danger-bg border border-danger-solid text-danger px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <TextField
          label="البريد الإلكتروني"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="example@lab.ps"
          dir="ltr"
          className="mb-4"
        />

        <TextField
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="********"
          dir="ltr"
          className="mb-6"
        />

        <SubmitButton loading={loading} loadingText="جارٍ تسجيل الدخول..." className="w-full text-lg">
          دخول
        </SubmitButton>
      </form>
    </div>
  );
}