'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  SAMPLES_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
} from '@/lib/constants';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

export default function SampleDetailPage() {
  const params = useParams();
  const sampleId = params.id as string;
  const [sample, setSample] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [samplerName, setSamplerName] = useState('');
  const [preparerName, setPreparerName] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      downloadLink.download = `${sample.sampleNumber}_QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (loading) return <AuthGuard><DashboardLayout><p className="p-10 text-center">جارٍ التحميل...</p></DashboardLayout></AuthGuard>;
  if (!sample) return <AuthGuard><DashboardLayout><p className="p-10 text-center text-red-500">العينة غير موجودة</p></DashboardLayout></AuthGuard>;

  // بناء رابط الصفحة (يعتمد على الدومين الحالي)
  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/samples/${sampleId}` : '';

  return (
    <AuthGuard>
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

          {/* قسم QR Code مع الرابط الكامل */}
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
    </AuthGuard>
  );
}