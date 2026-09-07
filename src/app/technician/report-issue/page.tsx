'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { getManagerRecipients } from '@/lib/services';
import { createNotification } from '@/lib/notifications';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import TechnicianBottomNav from '@/components/TechnicianBottomNav';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';

const ISSUE_TYPES = ['معدة معطلة', 'مشكلة بعينة', 'مشكلة بالموقع', 'أخرى'];

export default function TechnicianReportIssuePage() {
  const router = useRouter();
  const { employee } = useAuthStore();
  const [type, setType] = useState('');
  const [reference, setReference] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) { toast.error('اختر نوع البلاغ'); return; }
    if (!details.trim()) { toast.error('اكتب تفاصيل البلاغ'); return; }
    setSubmitting(true);
    try {
      const recipients = await getManagerRecipients();
      if (recipients.length === 0) {
        toast.error('لا يوجد مدير/إداري لإرسال البلاغ إليه. تواصل هاتفيًا.');
        setSubmitting(false);
        return;
      }
      await Promise.all(
        recipients.map((manager) =>
          createNotification({
            type: 'بلاغ_مشكلة',
            message: `بلاغ من ${employee?.name} (${type}${reference ? ` - ${reference}` : ''}): ${details.trim()}`,
            employeeId: manager.$id,
            employeeName: manager.name,
          })
        )
      );
      setSent(true);
      toast.success('تم إرسال البلاغ للإدارة');
    } catch (err: unknown) {
      toast.error('خطأ في الإرسال: ' + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
        <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
          <h1 className="text-lg font-bold">بلاغ عن مشكلة</h1>
        </header>
        <main className="p-4">
          <Card className="text-center py-8 space-y-4">
            <CheckCircle2 size={64} className="mx-auto text-success" />
            <h2 className="text-2xl font-bold text-text-primary">تم إرسال البلاغ</h2>
            <p className="text-text-secondary">اطلعت عليه الإدارة وسيتم التعامل معه (نوع: {type}).</p>
            <button
              onClick={() => router.push('/technician/dashboard')}
              className="mx-auto bg-primary text-white px-8 py-3 rounded-xl font-bold hover:from-primary-dark hover:to-primary"
            >
              العودة إلى مهامي
            </button>
          </Card>
        </main>
        <TechnicianBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dim pb-20" dir="rtl">
      <header className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <button onClick={() => router.back()} className="text-white"><ArrowRight size={24} /></button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <AlertTriangle size={20} /> بلاغ عن مشكلة
        </h1>
      </header>

      <main className="p-4">
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-warning-bg border border-warning/20 text-sm p-3 rounded-xl text-warning">
              يُرسل البلاغ مباشرة إلى المديرين والإداريين. أضِف أكبر قدر من التفاصيل.
            </div>

            <SelectField label="نوع البلاغ" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">اختر النوع</option>
              {ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectField>

            <TextField
              label="المرجع (معدة / عينة / مركبة — اختياري)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: الضاغط الهيدروليكي، عينة LAB-2026-CON-00012"
            />

            <TextAreaField
              label="تفاصيل المشكلة"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              required
              placeholder="صف المشكلة بالتفصيل..."
            />

            <SubmitButton loading={submitting} loadingText="جارٍ الإرسال..." className="w-full text-lg">
              إرسال البلاغ
            </SubmitButton>
          </form>
        </Card>
      </main>

      <TechnicianBottomNav />
    </div>
  );
}