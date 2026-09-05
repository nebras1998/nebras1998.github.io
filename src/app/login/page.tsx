'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { FlaskConical, Wrench, ArrowLeft, Mail, Lock } from 'lucide-react';
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
    <div className="min-h-screen flex" dir="rtl">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-[#0d2b3e] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-white/5 rounded-full blur-xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
            <FlaskConical size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight tracking-tight">مختبرات الشمال</h1>
          <p className="text-xl text-white/70 mb-8">الإنشائية</p>
          <div className="space-y-4 text-white/60">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>إدارة العينات والفحوصات الإنشائية</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>تتبع المشاريع والعملاء</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>تقارير احترافية مع ضمان الجودة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-dim">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FlaskConical size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">مختبرات الشمال</h1>
            <p className="text-text-secondary text-sm">الإنشائية</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">تسجيل الدخول</h2>
              <p className="text-text-secondary text-sm mt-1">أدخل بياناتك للوصول إلى لوحة التحكم</p>
              <div className="mt-3 h-0.5 w-12 bg-gradient-to-l from-primary to-accent rounded-full" />
            </div>

            {error && (
              <div className="bg-danger-bg border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@domain.com"
                dir="ltr"
              />

              <TextField
                label="كلمة المرور"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                dir="ltr"
              />

              <SubmitButton loading={loading} loadingText="جارٍ تسجيل الدخول..." className="w-full mt-2">
                دخول
              </SubmitButton>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/technician/login"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors group"
            >
              <Wrench size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              تسجيل الدخول كفني
              <ArrowLeft size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
