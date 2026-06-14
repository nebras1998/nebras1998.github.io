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
  const [scanning, setScanning] = useState(false);

  const startScanner = async () => {
    setError('');
    setScanning(true);
    try {
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // تم التعرف على الرمز
          setScanning(false);
          await scanner.stop();
          scanner.clear();
          if (decodedText.includes('/dashboard/samples/')) {
            const sampleId = decodedText.split('/dashboard/samples/').pop();
            if (sampleId) {
              router.push(`/technician/samples/${sampleId}`);
            }
          } else {
            setError('الباركود غير صالح. حاول مرة أخرى.');
            setScanning(true);
            startScanner(); // إعادة التشغيل
          }
        },
        () => {} // تجاهل أخطاء المسح
      );
    } catch (err) {
      setError('فشل تشغيل الكاميرا. تأكد من السماح بالوصول.');
      setScanning(false);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black pb-20" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-lg font-bold">مسح الباركود</h1>
      </header>

      <main className="flex flex-col items-center justify-center">
        <div id="reader" className="w-full max-w-md mx-auto mt-4 rounded-xl overflow-hidden" />

        {error && (
          <div className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!scanning && error && (
          <button
            onClick={startScanner}
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