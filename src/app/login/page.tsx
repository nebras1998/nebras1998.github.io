'use client';

// TODO(هوية بصرية): لون الثيم العام --primary (#1a5276، كحلي تركوازي) أبعد من الكحلي الفعلي في الشعار
// (#1a2b4a تقريبًا). تعديل متغيرات الثيم العامة قرار شامل يحتاج موافقة صريحة، لذا لم نغيّرها هنا
// واكتفينا بتدرج كحلي محلي للوحة تسجيل الدخول (from #1a2b4a via #14233f إلى #0d1729) كقيمة محلية.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';
import Image from 'next/image';
import { Wrench, ArrowLeft, Eye, EyeOff, FlaskConical, Users, FileText } from 'lucide-react';
import TextField from '@/components/TextField';
import SubmitButton from '@/components/SubmitButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a2b4a] via-[#14233f] to-[#0d1729] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-white/5 rounded-full blur-xl" />

        <div className="relative z-10 flex h-full flex-col justify-center px-16 text-white">
          <div className="bg-white rounded-3xl px-5 py-3 mb-10 shadow-2xl shadow-black/40 ring-1 ring-white/10 w-full max-w-[300px] flex items-center justify-center">
            <Image
              src="/branding/shamal-logo.jpg"
              alt="شعار مختبرات الشمال للفحوصات الهندسية والإنشائية"
              width={260}
              height={116}
              className="object-contain"
              style={{ maxWidth: '100%', height: 'auto' }}
              loading="eager"
            />
          </div>
          <p className="text-xl text-white/80 mb-8">نظام إدارة المختبر</p>
          <div className="space-y-4 text-white/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <FlaskConical size={18} className="text-white/90" />
              </div>
              <span>إدارة العينات والفحوصات الإنشائية</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-white/90" />
              </div>
              <span>تتبع المشاريع والعملاء</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-white/90" />
              </div>
              <span>تقارير احترافية مع ضمان الجودة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-dim">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <div className="w-full max-w-[200px]">
              <Image
                src="/branding/shamal-logo.jpg"
                alt="شعار مختبرات الشمال للفحوصات الهندسية والإنشائية"
                width={200}
                height={90}
                className="object-contain"
                style={{ width: '100%', height: 'auto' }}
                loading="eager"
              />
            </div>
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                dir="ltr"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-pressed={showPassword}
                    className="text-text-secondary hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <SubmitButton loading={loading} loadingText="جارٍ تسجيل الدخول..." className="w-full mt-2">
                دخول
              </SubmitButton>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/technician/login"
              dir="rtl"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors group"
            >
              <Wrench size={16} className="shrink-0" />
              تسجيل الدخول كفني
              <ArrowLeft
                size={14}
                className="opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all duration-200"
              />
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-text-muted">
            جميع الحقوق محفوظة © 2026 مختبرات الشمال
          </div>
        </div>
      </div>
    </div>
  );
}
