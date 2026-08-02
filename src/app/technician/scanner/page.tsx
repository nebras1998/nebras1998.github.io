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
  const isMounted = useRef(true);
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
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
          { facingMode: 'environment' },
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
              window.location.href = `/technician/samples/${sampleId}`;
            } else {
              setError('الباركود غير صالح. حاول مرة أخرى.');
              if (isMounted.current) setScanKey(k => k + 1);
            }
          },
          () => {}
        );
      } catch {
        if (isMounted.current) {
          setError('فشل تشغيل الكاميرا. تأكد من السماح بالوصول.');
          setScanning(false);
        }
      }
    })();

    return () => {
      isMounted.current = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(() => {});
        } catch {}
      }
    };
  }, [scanKey]);

  return (
    <div className="min-h-screen bg-black pb-20" dir="rtl">
      <header className="bg-petrol text-white p-4 flex items-center gap-3 shadow">
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
            className="mt-4 bg-petrol text-white px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Camera size={20} /> إعادة المحاولة
          </button>
        )}
      </main>

      <TechnicianBottomNav />
    </div>
  );
}