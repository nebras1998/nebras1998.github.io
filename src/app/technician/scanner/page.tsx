'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowRight, Camera } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';

export default function ScannerPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    // تأكد من أن الكود يعمل في المتصفح فقط
    if (typeof window === 'undefined') return;

    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scanner
      .start(
        { facingMode: 'environment' }, // الكاميرا الخلفية
        config,
        (decodedText) => {
          // تم التعرف على QR Code
          setScanning(false);
          // افترض أن الرابط هو: /dashboard/samples/SAMPLE_ID
          if (decodedText.includes('/dashboard/samples/')) {
            const sampleId = decodedText.split('/dashboard/samples/').pop();
            if (sampleId) {
              // إيقاف الماسح والانتقال إلى صفحة العينة في تطبيق الفنيين
              scanner.stop().then(() => {
                router.push(`/technician/samples/${sampleId}`);
              });
            }
          } else {
            setError('الباركود غير صالح. تأكد من مسح باركود عينة.');
            // استمر في المسح بعد ثانيتين
            setTimeout(() => setError(''), 2000);
          }
        },
        (errorMessage) => {
          // أخطاء المسح (نتجاهلها)
          console.log(errorMessage);
        }
      )
      .catch((err) => {
        setError('فشل تشغيل الكاميرا. تأكد من السماح بالوصول للكاميرا.');
        setScanning(false);
      });

    // تنظيف عند الخروج
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-black pb-20" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-lg font-bold">مسح الباركود</h1>
      </header>

      <main className="flex flex-col items-center justify-center">
        {/* حاوية الماسح */}
        <div id="reader" className="w-full max-w-md mx-auto mt-4 rounded-xl overflow-hidden" />

        {error && (
          <div className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!scanning && !error && (
          <p className="text-white mt-4">جاري الانتقال إلى العينة...</p>
        )}

        {!scanning && error && (
          <button
            onClick={() => {
              setError('');
              setScanning(true);
              // إعادة التشغيل
              if (scannerRef.current) {
                scannerRef.current.start(
                  { facingMode: 'environment' },
                  { fps: 10, qrbox: { width: 250, height: 250 } },
                  (decodedText) => {
                    setScanning(false);
                    if (decodedText.includes('/dashboard/samples/')) {
                      const sampleId = decodedText.split('/dashboard/samples/').pop();
                      if (sampleId) {
                        scannerRef.current?.stop().then(() => {
                          router.push(`/technician/samples/${sampleId}`);
                        });
                      }
                    }
                  },
                  () => {}
                );
              }
            }}
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Camera size={20} /> إعادة المحاولة
          </button>
        )}
      </main>

      <TechnicianBottomNav />
    </div>
  );
}