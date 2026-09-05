'use client';

import { useEffect, useRef, useState } from 'react';
import { ID } from 'appwrite';
import { getActiveReportTemplate, createReportTemplate, updateReportTemplate } from '@/lib/services/reports';
import { createFile, deleteFile, getFileViewUrl } from '@/lib/services/files';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import Card from '@/components/Card';
import TextField from '@/components/TextField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import Breadcrumb from '@/components/Breadcrumb';
import TableSkeleton from '@/components/TableSkeleton';
import { toast } from 'sonner';
import { Upload, X, Eye } from 'lucide-react';

const DEFAULT_COLOR = '#0f4c5c';
const DEFAULT_LAB = 'مختبرات الشمال';

const EMPTY_FORM = {
  labName: DEFAULT_LAB,
  labNameEn: '',
  addressLine: '',
  phone: '',
  email: '',
  accreditationText: '',
  footerText: '',
  signatureLabel: 'المدير المسؤول',
  primaryColor: DEFAULT_COLOR,
};

export default function ReportTemplateSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showQrCode, setShowQrCode] = useState(false);
  const [logoFileId, setLogoFileId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const template = await getActiveReportTemplate();
        if (template) {
          setTemplateId(template.$id);
          setForm({
            labName: template.labName || DEFAULT_LAB,
            labNameEn: template.labNameEn || '',
            addressLine: template.addressLine || '',
            phone: template.phone || '',
            email: template.email || '',
            accreditationText: template.accreditationText || '',
            footerText: template.footerText || '',
            signatureLabel: template.signatureLabel || 'المدير المسؤول',
            primaryColor: template.primaryColor || DEFAULT_COLOR,
          });
          setShowQrCode(!!template.showQrCode);
          if (template.logoFileId) {
            setLogoFileId(template.logoFileId);
            setLogoUrl(getFileViewUrl(template.logoFileId));
          }
        }
      } catch {
        toast.error('فشل تحميل إعدادات التقرير');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedLogo(file);
      setLogoUrl(URL.createObjectURL(file));
    }
  };

  const removeLogo = () => {
    setSelectedLogo(null);
    if (logoUrl && !logoFileId) URL.revokeObjectURL(logoUrl);
    setLogoUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const color = form.primaryColor || DEFAULT_COLOR;
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        toast.error('اللون الرئيسي يجب أن يكون بصيغة hex صحيحة مثل #0f4c5c');
        setSaving(false);
        return;
      }

      let newLogoFileId = logoFileId;
      if (selectedLogo) {
        const uploaded = await createFile(selectedLogo);
        newLogoFileId = uploaded.$id;
        if (logoFileId) {
          try { await deleteFile(logoFileId); } catch {}
        }
        setLogoFileId(newLogoFileId);
      }

      const payload: Record<string, unknown> = {
        ...form,
        labName: form.labName.trim(),
        labNameEn: form.labNameEn.trim() || undefined,
        addressLine: form.addressLine.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        accreditationText: form.accreditationText.trim() || undefined,
        footerText: form.footerText.trim() || undefined,
        signatureLabel: form.signatureLabel.trim() || undefined,
        primaryColor: color,
        showQrCode,
        logoFileId: newLogoFileId || undefined,
      };

      if (templateId) {
        await updateReportTemplate(templateId, payload);
      } else {
        const doc = await createReportTemplate(ID.unique(), payload);
        setTemplateId(doc.$id);
      }
      toast.success('تم حفظ إعدادات قالب التقرير');
    } catch (err: unknown) {
      toast.error('خطأ في الحفظ: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const primaryColor = form.primaryColor || DEFAULT_COLOR;

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={8} cols={2} /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Breadcrumb items={[{ label: 'الإعدادات' }, { label: 'قالب التقرير' }]} />

          {/* معاينة حية لرأس التقرير */}
          <Card>
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><Eye size={18} className="text-primary" /> معاينة حية لرأس التقرير</h2>
            <div className="border-2 rounded-xl p-4 space-y-3" style={{ borderColor: primaryColor }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="شعار المختبر" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs text-text-muted" style={{ backgroundColor: `${primaryColor}1a` }}>
                      شعار
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold" style={{ color: primaryColor }}>{form.labName || 'اسم المختبر'}</h3>
                    {form.labNameEn && <p className="text-xs text-text-muted text-left" dir="ltr">{form.labNameEn}</p>}
                    {form.accreditationText && <p className="text-xs text-text-muted">{form.accreditationText}</p>}
                  </div>
                </div>
                <div className="text-center border rounded-lg px-3 py-1.5 flex-shrink-0" style={{ borderColor: primaryColor }}>
                  <p className="text-[10px] text-text-muted">رقم التقرير</p>
                  <p className="font-bold text-sm" style={{ color: primaryColor }} dir="ltr">RPT-2025-000123</p>
                </div>
              </div>
              {(form.addressLine || form.phone || form.email) && (
                <div className="text-xs text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: primaryColor }}>
                  {[form.addressLine, form.phone, form.email].filter(Boolean).join(' • ')}
                </div>
              )}
            </div>
          </Card>

          <FormCard title="قالب التقرير" subtitle="يُطبَّق على جميع التقارير الجديدة. خيار واحد فقط للمختبر في هذه المرحلة.">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="اسم المختبر" name="labName" value={form.labName} onChange={handleChange} required placeholder={DEFAULT_LAB} />
                <TextField label="اسم المختبر (إنجليزي)" name="labNameEn" value={form.labNameEn} onChange={handleChange} dir="ltr" placeholder="North Labs" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="العنوان" name="addressLine" value={form.addressLine} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="الهاتف" name="phone" value={form.phone} onChange={handleChange} dir="ltr" />
                  <TextField label="البريد الإلكتروني" name="email" value={form.email} onChange={handleChange} dir="ltr" />
                </div>
              </div>

              <TextAreaField label="نص الاعتماد / الترخيص" name="accreditationText" value={form.accreditationText} onChange={handleChange} rows={2} placeholder="مثال: مرخصة من وزارة الأشغال العامة رقم..." />

              {/* شعار المختبر */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-2">شعار المختبر</h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-border px-3 py-1 rounded flex items-center gap-1 hover:bg-border">
                    <Upload size={16} /> اختر الشعار
                  </button>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  {logoUrl && (
                    <button type="button" onClick={removeLogo} className="text-danger flex items-center gap-1 text-sm hover:underline">
                      <X size={14} /> إزالة الشعار
                    </button>
                  )}
                  <span className="text-sm text-text-muted">
                    {selectedLogo ? selectedLogo.name : logoFileId ? 'شعار مرفوع حاليًا' : 'لا يوجد شعار'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="نص التذييل (أسفل التقرير)" name="footerText" value={form.footerText} onChange={handleChange} placeholder="مثال: النتائج تخص العينة المفحوصة فقط..." />
                <TextField label="تسمية التوقيع" name="signatureLabel" value={form.signatureLabel} onChange={handleChange} placeholder="المدير المسؤول" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block mb-1.5 text-text-primary font-medium">اللون الرئيسي</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      dir="ltr"
                      className="w-32 border border-border p-2 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={showQrCode} onChange={(e) => setShowQrCode(e.target.checked)} className="w-5 h-5 accent-petrol" />
                  <span className="text-sm text-text-primary">إظهار رمز QR للتحقق (مستقبلي)</span>
                </label>
              </div>

              <SubmitButton loading={saving} className="w-full">
                {templateId ? 'حفظ التعديلات' : 'إنشاء القالب الافتراضي'}
              </SubmitButton>
            </form>
          </FormCard>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
