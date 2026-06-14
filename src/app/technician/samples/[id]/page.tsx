'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuthStore } from '@/store/useAuthStore';
import {
  DATABASE_ID,
  SAMPLES_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, Building, User } from 'lucide-react';

export default function SampleDetailPage() {
  const params = useParams();
  const sampleId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();

  const [sample, setSample] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [samplerName, setSamplerName] = useState('');
  const [preparerName, setPreparerName] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sampleId) return;
    const fetchData = async () => {
      try {
        const sampleDoc = await databases.getDocument(DATABASE_ID, SAMPLES_COLLECTION_ID, sampleId);
        setSample(sampleDoc);

        if (sampleDoc.projectId) {
          const project = await databases.getDocument(DATABASE_ID, PROJECTS_COLLECTION_ID, sampleDoc.projectId);
          setProjectName(project.name);
          if (project.clientId) {
            const client = await databases.getDocument(DATABASE_ID, CLIENTS_COLLECTION_ID, project.clientId);
            setClientName(client.name);
          }
        }
        if (sampleDoc.samplerId) {
          const emp = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, sampleDoc.samplerId);
          setSamplerName(emp.name);
        }
        if (sampleDoc.preparerId) {
          const emp = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, sampleDoc.preparerId);
          setPreparerName(emp.name);
        }
        if (sampleDoc.transporterId) {
          const emp = await databases.getDocument(DATABASE_ID, EMPLOYEES_COLLECTION_ID, sampleDoc.transporterId);
          setTransporterName(emp.name);
        }
      } catch (err: any) {
        toast.error('فشل تحميل بيانات العينة');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sampleId]);

  const downloadQR = () => {
    const svg = document.getElementById('sample-qr');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${sample?.sampleNumber || 'sample'}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // ------------------- حالة التحميل -------------------
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">جارٍ التحميل...</p>
      </div>
    );
  }

  // ------------------- المستخدم غير مسجل دخول ← شاشة الاختيار -------------------
  if (!user) {
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <QrCode size={48} className="mx-auto text-blue-600" />
          <h1 className="text-2xl font-bold">الوصول إلى العينة</h1>
          <p className="text-gray-500">يجب تسجيل الدخول لعرض تفاصيل العينة. اختر نوع الحساب:</p>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/login?redirect=${encodeURIComponent(pageUrl)}`)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Building size={20} /> دخول المختبر (الإدارة)
            </button>
            <button
              onClick={() => router.push(`/technician/login?redirect=${encodeURIComponent(pageUrl)}`)}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <User size={20} /> دخول الفنيين
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------- المستخدم مسجل دخول ← تفاصيل العينة -------------------
  if (!sample) return null;

  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/samples/${sampleId}` : '';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">تفاصيل العينة</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="text-gray-500">رقم العينة:</span> {sample.sampleNumber}</div>
          <div><span className="text-gray-500">النوع:</span> {sample.type}</div>
          <div><span className="text-gray-500">المشروع:</span> {projectName || '-'}</div>
          <div><span className="text-gray-500">العميل:</span> {clientName || '-'}</div>
          <div><span className="text-gray-500">تاريخ الأخذ:</span> {sample.samplingDate || '-'}</div>
          <div><span className="text-gray-500">تاريخ التحضير:</span> {sample.preparationDate || '-'}</div>
          <div><span className="text-gray-500">تاريخ الإحضار:</span> {sample.deliveryDate || '-'}</div>
          <div><span className="text-gray-500">الحالة:</span> {sample.status}</div>
          <div><span className="text-gray-500">فني الأخذ:</span> {samplerName || '-'}</div>
          <div><span className="text-gray-500">فني التحضير:</span> {preparerName || '-'}</div>
          <div><span className="text-gray-500">فني الإحضار:</span> {transporterName || '-'}</div>
        </div>

        {/* قسم QR Code */}
        <div className="mt-8 border-t pt-6 text-center">
          <h2 className="font-bold mb-2 flex items-center justify-center gap-2">
            <QrCode size={20} /> رمز الاستجابة السريعة (QR)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            امسح الباركود للوصول إلى تفاصيل العينة (يتطلب تسجيل الدخول)
          </p>

          {pageUrl && (
            <div className="inline-block bg-white p-4 border rounded-xl">
              <QRCodeSVG
                id="sample-qr"
                value={pageUrl}
                size={220}
                level="H"
                includeMargin
              />
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2 break-all">{pageUrl}</p>

          <button
            onClick={downloadQR}
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 mx-auto hover:bg-blue-700"
          >
            <Download size={16} /> تحميل صورة الباركود
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}