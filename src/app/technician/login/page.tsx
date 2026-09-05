'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import { Wrench, FlaskConical, ArrowLeft, Shield } from 'lucide-react';
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
    <div className="min-h-screen flex" dir="rtl">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a6b4a] via-[#1e8449] to-[#0d3d28] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
        <div className="absolute top-1/3 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
            <Wrench size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight tracking-tight">تطبيق الفنيين</h1>
          <p className="text-xl text-white/70 mb-8">مختبرات الشمال الإنشائية</p>
          <div className="space-y-4 text-white/60">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>إدارة المهام والفحوصات اليومية</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>تسجيل الحضور والانصراف</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>إدارة المركبات والرحلات</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-dim">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e8449] to-[#1a6b4a] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Wrench size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">تطبيق الفنيين</h1>
            <p className="text-text-secondary text-sm">مختبرات الشمال الإنشائية</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">دخول الفنيين</h2>
              <p className="text-text-secondary text-sm mt-1">سجّل دخولك لمتابعة مهامك</p>
              <div className="mt-3 h-0.5 w-12 bg-gradient-to-l from-success-solid to-[#1a6b4a] rounded-full" />
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
                placeholder="example@lab.ps"
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

              <SubmitButton loading={loading} loadingText="جارٍ تسجيل الدخول..." className="w-full mt-2" variant="secondary">
                <span className="flex items-center justify-center gap-2">
                  <Shield size={18} />
                  دخول
                </span>
              </SubmitButton>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors group"
            >
              <FlaskConical size={16} />
              تسجيل الدخول كمدير
              <ArrowLeft size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
