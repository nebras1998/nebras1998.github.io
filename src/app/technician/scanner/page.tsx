'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowRight, Camera, Flashlight, RefreshCw } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';

export default function ScannerPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const isMounted = useRef(true);
  const [scanKey, setScanKey] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const startScanner = async () => {
    setError('');
    setScanning(true);
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (!isMounted.current) return;
          setScanning(false);
          try { await scanner.stop(); } catch {}
          scanner.clear();
          let sampleId = '';
          if (decodedText.includes('/dashboard/samples/')) {
            sampleId = decodedText.split('/dashboard/samples/').pop() || '';
          } else if (decodedText.includes('/technician/samples/')) {
            sampleId = decodedText.split('/technician/samples/').pop() || '';
          }
          if (sampleId) {
            router.push(`/technician/samples/${sampleId}`);
          } else {
            setError('الباركود غير صالح. حاول مرة أخرى.');
            if (isMounted.current) setScanKey(k => k + 1);
          }
        },
        () => {}
      );
      // كشف دعم الكاميرا الخلفية للفلاش بعد بدء التشغيل
      try {
        const caps = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(caps?.torch === true);
      } catch {
        setTorchSupported(false);
      }
    } catch {
      if (isMounted.current) {
        setError('فشل تشغيل الكاميرا. تأكد من السماح بالوصول.');
        setScanning(false);
      }
    }
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: !torch } as MediaTrackConstraintSet],
      } as MediaTrackConstraints);
      setTorch(!torch);
    } catch {
      setError('جهازك لا يدعم الفلاش على هذه الكاميرا.');
    }
  };

  const flipCamera = async () => {
    setFacingMode((prev) => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    isMounted.current = true;
    // تأجيل بدء الفحص دورة زمنية خارج جسم الـ Effect تجنبًا للتحديثات المتتالية
    const timer = setTimeout(startScanner, 0);

    return () => {
      clearTimeout(timer);
      isMounted.current = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanKey, facingMode]);

  return (
    <div className="min-h-screen bg-black pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/technician/dashboard')} className="text-white">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-lg font-bold">مسح الباركود</h1>
      </header>

      <main className="flex flex-col items-center justify-center">
        <div id="reader" className="w-full max-w-md mx-auto mt-4 rounded-xl overflow-hidden" />

        {error && (
          <div className="mt-4 bg-danger-bg text-danger px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!scanning && error && (
          <button
            onClick={() => setScanKey(k => k + 1)}
            className="mt-4 bg-primary text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Camera size={20} /> إعادة المحاولة
          </button>
        )}

        {scanning && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={toggleTorch}
              disabled={!torchSupported}
              className={`px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold ${torchSupported ? 'bg-white text-black' : 'bg-white/20 text-white/50'}`}
            >
              <Flashlight size={20} /> {torch ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}
            </button>
            <button
              onClick={flipCamera}
              className="bg-white text-black px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold"
            >
              <RefreshCw size={20} /> تبديل الكاميرا
            </button>
          </div>
        )}
      </main>

      <TechnicianBottomNav />
    </div>
  );
}