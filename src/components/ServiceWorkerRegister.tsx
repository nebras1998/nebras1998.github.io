'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // نفعّل الوركِر في بيئة الإنتاج فقط لتفادي مشاكل التخزين المؤقت أثناء التطوير
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('فشل تسجيل وركِر الخدمة:', err);
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}