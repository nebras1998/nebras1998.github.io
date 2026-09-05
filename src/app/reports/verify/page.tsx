'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Loader2, ScanLine } from 'lucide-react';

interface VerifyResult {
  verified: boolean;
  reportNumber?: string;
  testId?: string;
  status?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export default function VerifyReportPage() {
  const searchParams = useSearchParams();
  const hash = searchParams.get('hash') || '';
  const reportNumber = searchParams.get('no') || '';

  const [state, setState] = useState<'loading' | 'ok' | 'invalid' | 'error' | 'missing'>('loading');
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hash || !reportNumber) {
        setState('missing');
        return;
      }
      try {
        const res = await fetch(`/api/reports/verify?hash=${encodeURIComponent(hash)}&no=${encodeURIComponent(reportNumber)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.verified === true) {
          setResult(data);
          setState('ok');
        } else if (res.ok) {
          setState('invalid');
        } else {
          setState('error');
        }
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash, reportNumber]);

  const primary = '#0f4c5c';

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-6" style={{ fontFamily: 'var(--font-plex-sans-arabic)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 text-center" style={{ background: primary }}>
            <ScanLine size={40} className="mx-auto text-white mb-2" />
            <h1 className="text-xl font-bold text-white">التحقق من التقرير</h1>
            <p className="text-white/80 text-sm mt-1">منصة مختبرات الشمال — التحقق الإلكتروني من التقارير</p>
          </div>

          <div className="p-6">
            {state === 'loading' && (
              <div className="flex flex-col items-center gap-3 text-center py-6">
                <Loader2 size={32} className="animate-spin text-slate-400" />
                <p className="text-sm text-slate-500">جارٍ التحقق من التقرير...</p>
              </div>
            )}

            {state === 'missing' && (
              <div className="text-center py-6">
                <ShieldAlert size={40} className="mx-auto text-amber-500 mb-2" />
                <h2 className="font-bold text-lg mb-1">بيانات تحقق ناقصة</h2>
                <p className="text-sm text-slate-500">
                  هذا الرابط لا يحتوي على بيانات تحقق صالحة. امسح رمز QR المطبوع على التقرير المعتمد.
                </p>
              </div>
            )}

            {state === 'invalid' && (
              <div className="text-center py-6">
                <ShieldAlert size={44} className="mx-auto text-red-500 mb-3" />
                <h2 className="font-bold text-lg mb-1">لم يتم التحقق</h2>
                <p className="text-sm text-slate-600">
                  لم نتمكن من مطابقة رقم التقرير مع البصمة الرقمية (SHA-256). قد يكون التقرير معدَّلًا أو غير صادر من هذا المختبر.
                </p>
              </div>
            )}

            {state === 'error' && (
              <div className="text-center py-6">
                <ShieldAlert size={44} className="mx-auto text-slate-400 mb-3" />
                <h2 className="font-bold text-lg mb-1">تعذر التحقق</h2>
                <p className="text-sm text-slate-500">حدث خطأ مؤقت أثناء التحقق. حاول مرة أخرى بعد قليل.</p>
              </div>
            )}

            {state === 'ok' && result && (
              <div className="py-2">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-4 py-1.5 font-bold">
                    <ShieldCheck size={18} /> تم التحقق — تقرير أصلي
                  </div>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <dt className="text-slate-500">رقم التقرير</dt>
                    <dd className="font-bold" dir="ltr">{result.reportNumber || '-'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <dt className="text-slate-500">الحالة</dt>
                    <dd className="font-bold">{result.status || '-'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <dt className="text-slate-500">اعتمده</dt>
                    <dd className="font-medium">{result.reviewedBy || '-'}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-2">
                    <dt className="text-slate-500">تاريخ الاعتماد</dt>
                    <dd className="font-medium">{result.reviewedAt ? new Date(result.reviewedAt).toLocaleDateString('ar-EG') : '-'}</dd>
                  </div>
                </dl>
                <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 leading-relaxed" dir="ltr">
                  <span dir="rtl">البصمة: </span>
                  <span className="break-all font-mono">{hash}</span>
                </div>
              </div>
            )}

            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm underline" style={{ color: primary }}>
                الذهاب إلى المنصة
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
