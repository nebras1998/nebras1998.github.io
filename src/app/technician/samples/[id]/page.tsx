'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import { DATABASE_ID, SAMPLES_COLLECTION_ID, PROJECTS_COLLECTION_ID, CLIENTS_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';

export default function TechnicianSampleDetail() {
  const params = useParams();
  const sampleId = params.id as string;
  const router = useRouter();
  const [sample, setSample] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSample = async () => {
      try {
        const s = await databases.getDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, sampleId);
        setSample(s);
        if (s.projectId) {
          const proj = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, s.projectId);
          setProjectName(proj.name);
          if (proj.clientId) {
            const client = await databases.getDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, proj.clientId);
            setClientName(client.name);
          }
        }
      } catch (err: any) {
        toast.error('فشل تحميل بيانات العينة');
      } finally {
        setLoading(false);
      }
    };
    fetchSample();
  }, [sampleId]);

  if (loading) return <div className="p-4 text-center">جارٍ التحميل...</div>;
  if (!sample) return <div className="p-4 text-center text-red-500">العينة غير موجودة</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      <header className="bg-green-600 text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-lg font-bold">تفاصيل العينة</h1>
      </header>

      <main className="p-4">
        <div className="bg-white p-6 rounded-2xl shadow space-y-4">
          <div className="text-center">
            <p className="text-2xl font-mono font-bold">{sample.sampleNumber}</p>
            <p className="text-gray-500">{sample.type}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">المشروع:</span> {projectName || '-'}</div>
            <div><span className="text-gray-500">العميل:</span> {clientName || '-'}</div>
            <div><span className="text-gray-500">تاريخ الأخذ:</span> {sample.samplingDate || '-'}</div>
            <div><span className="text-gray-500">تاريخ الإحضار:</span> {sample.deliveryDate || '-'}</div>
            <div><span className="text-gray-500">الحالة:</span> {sample.status}</div>
          </div>
        </div>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}