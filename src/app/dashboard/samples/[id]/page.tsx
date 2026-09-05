'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Sample } from '@/types';
import { getSample } from '@/lib/services/samples';
import { getProject } from '@/lib/services/projects';
import { getClient } from '@/lib/services/clients';
import { getEmployee } from '@/lib/services/employees';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import Breadcrumb from '@/components/Breadcrumb';
import Badge from '@/components/Badge';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';

export default function SampleDetailPage() {
  const params = useParams();
  const sampleId = params.id as string;
  const [sample, setSample] = useState<Sample | null>(null);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [samplerName, setSamplerName] = useState('');
  const [preparerName, setPreparerName] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sampleDoc = await getSample(sampleId);
        setSample(sampleDoc);

        if (sampleDoc.projectId) {
          const project = await getProject(sampleDoc.projectId);
          setProjectName(project.name);
          if (project.clientId) {
            const client = await getClient(project.clientId);
            setClientName(client.name);
          }
        }
        if (sampleDoc.samplerId) {
          const emp = await getEmployee(sampleDoc.samplerId);
          setSamplerName(emp.name);
        }
        if (sampleDoc.preparerId) {
          const emp = await getEmployee(sampleDoc.preparerId);
          setPreparerName(emp.name);
        }
        if (sampleDoc.transporterId) {
          const emp = await getEmployee(sampleDoc.transporterId);
          setTransporterName(emp.name);
        }
      } catch {
        toast.error('فشل تحميل بيانات العينة');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sampleId]);

  const downloadQR = () => {
    if (!sample) return;
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

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={4} cols={3} /></DashboardLayout></AuthGuard>;
  if (!sample) return <AuthGuard><DashboardLayout><EmptyData title="العينة غير موجودة" /></DashboardLayout></AuthGuard>;

  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard/samples/${sampleId}` : '';

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Breadcrumb items={[{ href: '/dashboard/samples', label: 'العينات' }, { label: 'تفاصيل العينة' }]} />
          <FormCard title="تفاصيل العينة" maxWidth="max-w-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><span className="text-text-muted">رقم العينة:</span> {sample.sampleNumber}</div>
            <div><span className="text-text-muted">النوع:</span> {sample.type}</div>
            <div><span className="text-text-muted">المشروع:</span> {projectName || '-'}</div>
            <div><span className="text-text-muted">العميل:</span> {clientName || '-'}</div>
            <div><span className="text-text-muted">تاريخ الأخذ:</span> {sample.samplingDate || '-'}</div>
            <div><span className="text-text-muted">تاريخ التحضير:</span> {sample.preparationDate || '-'}</div>
            <div><span className="text-text-muted">تاريخ الإحضار:</span> {sample.deliveryDate || '-'}</div>
            <div><span className="text-text-muted">الحالة:</span> <Badge status={sample.status} /></div>
            <div><span className="text-text-muted">فني الأخذ:</span> {samplerName || '-'}</div>
            <div><span className="text-text-muted">فني التحضير:</span> {preparerName || '-'}</div>
            <div><span className="text-text-muted">فني الإحضار:</span> {transporterName || '-'}</div>
          </div>

          <div className="mt-8 border-t pt-6 text-center">
            <h2 className="font-bold mb-2 flex items-center justify-center gap-2">
              <QrCode size={20} /> رمز الاستجابة السريعة (QR)
            </h2>
            <p className="text-sm text-text-muted mb-4">
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
            
            <p className="text-xs text-text-muted mt-2 break-all">{pageUrl}</p>
            
            <button
              onClick={downloadQR}
              className="mt-4 bg-primary text-white px-5 py-2 rounded-xl flex items-center gap-2 mx-auto hover:from-primary-dark hover:to-primary"
            >
              <Download size={16} /> تحميل صورة الباركود
            </button>
          </div>
          </FormCard>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
