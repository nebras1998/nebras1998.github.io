'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import TextField from '@/components/TextField';
import SubmitButton from '@/components/SubmitButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير معروف.';
      if (message.includes('Invalid credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (message.includes('session is active')) {
        setError('يوجد جلسة نشطة. جارٍ المحاولة...');
        try {
          await useAuthStore.getState().checkSession();
          router.push('/dashboard');
        } catch (e) {
          setError('فشل استعادة الجلسة. أعد المحاولة.');
        }
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-concrete-100" dir="rtl">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-concrete-800">تسجيل الدخول</h1>

        {error && (
          <div className="bg-danger-bg border border-danger-solid text-danger px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            className="mb-4"
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@domain.com"
            dir="ltr"
          />

          <TextField
            className="mb-6"
            label="كلمة المرور"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="********"
            dir="ltr"
          />

          <SubmitButton loading={loading} loadingText="جارٍ تسجيل الدخول..." className="w-full">
            دخول
          </SubmitButton>
        </form>

        <div className="mt-6 border-t pt-4 text-center">
          <Link
            href="/technician/login"
            className="inline-flex items-center gap-2 bg-petrol text-white px-6 py-2 rounded-lg hover:bg-petrol-dark transition-colors"
          >
            <Wrench size={18} />
            تسجيل الدخول كفني
          </Link>
        </div>
      </div>
    </div>
  );
}