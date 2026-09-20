'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/Card';
import ConfirmModal from '@/components/ConfirmModal';
import {
  Download,
  HardDrive,
  Loader2,
  Upload,
  AlertTriangle,
  Eye,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ALL_COLLECTIONS } from '@/lib/backup-catalog';

// =============== دوال التشفير ===============
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  const safeSalt = new Uint8Array(salt);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: safeSalt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};

const encryptBlob = async (blob: Blob, password: string): Promise<Blob> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = await blob.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const header = new Uint8Array(salt.length + iv.length);
  header.set(salt, 0); header.set(iv, salt.length);
  const body = new Uint8Array(ciphertext);
  const combined = new Uint8Array(header.length + body.length);
  combined.set(header, 0); combined.set(body, header.length);
  return new Blob([combined]);
};

const decryptBlob = async (blob: Blob, password: string): Promise<Blob> => {
  const buffer = await blob.arrayBuffer();
  const salt = new Uint8Array(buffer.slice(0, 16));
  const iv = new Uint8Array(buffer.slice(16, 28));
  const ciphertext = new Uint8Array(buffer.slice(28));
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Blob([plaintext]);
};

// =============== مكون إعادة تعيين النظام ===============
// الحذف الفعلي يتم الآن عبر مسار خادمي بمفتاح API (api/admin/backup/reset)
// وليس من المتصفح مباشرة.
const RESET_PHRASE = 'حذف كل البيانات';

function ResetSystemButton() {
  const [step, setStep] = useState<'hidden' | 'confirm' | 'input'>('hidden');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (inputText !== RESET_PHRASE) { toast.error('العبارة المدخلة غير صحيحة'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backup/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase: inputText }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        deletedDocuments?: number;
        deletedFiles?: number;
      } | null;
      if (!res.ok) throw new Error(data?.error || 'فشل في حذف البيانات');
      toast.success(`تم حذف جميع البيانات (${data?.deletedDocuments ?? 0} مستند و ${data?.deletedFiles ?? 0} ملف)`);
      setStep('hidden'); setInputText('');
    } catch (err: unknown) { toast.error('فشل في حذف البيانات: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setLoading(false); }
  };

  if (step === 'hidden') return <button onClick={() => setStep('confirm')} className="bg-danger-solid text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-danger-dark"><Trash2 size={20} /> حذف جميع البيانات</button>;
  if (step === 'confirm') return (
    <div className="space-y-3">
      <p className="text-danger font-bold">هل أنت متأكد؟ هذه العملية لا يمكن التراجع عنها.</p>
      <div className="flex justify-center gap-3">
        <button onClick={() => setStep('input')} className="bg-danger-solid text-white px-4 py-2 rounded hover:bg-danger-dark">نعم، متابعة</button>
        <button onClick={() => setStep('hidden')} className="bg-border text-text-primary px-4 py-2 rounded hover:bg-surface-muted">إلغاء</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-danger font-bold">اكتب <span className="bg-border px-1 rounded">{RESET_PHRASE}</span> للتأكيد:</p>
      <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="border border-border p-2 rounded-xl bg-surface w-48 text-center" placeholder={RESET_PHRASE} dir="rtl" />
      <br />
      <button onClick={handleReset} disabled={loading || inputText !== RESET_PHRASE} className="bg-danger-solid text-white px-6 py-2 rounded hover:bg-danger-dark disabled:opacity-50">{loading ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}</button>
      <button onClick={() => { setStep('hidden'); setInputText(''); }} className="bg-border text-text-primary px-4 py-2 rounded hover:bg-surface-muted mr-2">إلغاء</button>
    </div>
  );
}

// =============== صفحة النسخ الاحتياطي الرئيسية ===============
export default function BackupPage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState('');
  const [backupPercent, setBackupPercent] = useState(0);
  const [backupEncrypt, setBackupEncrypt] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState('');
  const [restorePercent, setRestorePercent] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');

  const [previewData, setPreviewData] = useState<{ collections: { name: string; count: number }[]; filesCount: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [restoreFiles, setRestoreFiles] = useState(true);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);

  // =============== النسخ الاحتياطي ===============
  // التصدير يتم على الخادم (api/admin/backup/export) بمفتاح API ثم يُشَفَّر محليًا عند الطلب.
  const handleBackup = async () => {
    setBackupLoading(true); setBackupPercent(0); setBackupProgress('جارٍ إنشاء النسخة الاحتياطية على الخادم...');
    try {
      const res = await fetch('/api/admin/backup/export', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || 'فشل إنشاء النسخة الاحتياطية');
      }

      setBackupProgress('جارٍ تجهيز الملف...'); setBackupPercent(95);
      let content: Blob = await res.blob();
      if (backupEncrypt && backupPassword) content = await encryptBlob(content, backupPassword);
      saveAs(content, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.${backupEncrypt ? 'zip.enc' : 'zip'}`);
      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
    } catch (err: unknown) { toast.error('فشل النسخ الاحتياطي: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setBackupLoading(false); setBackupProgress(''); setBackupPercent(0); }
  };

  // =============== معاينة ===============
  const handlePreview = async () => {
    if (!selectedFile) return;
    setPreviewLoading(true);
    try {
      let blob: Blob = selectedFile;
      if (selectedFile.name.endsWith('.enc') && restorePassword) blob = await decryptBlob(selectedFile, restorePassword);
      const zip = await JSZip.loadAsync(blob);
      const summary: { name: string; count: number }[] = []; let filesCount = 0;
      for (const col of ALL_COLLECTIONS) {
        const folder = zip.folder(`database/${col.name}`);
        if (folder) {
          const jsonFile = folder.file('documents.json');
          if (jsonFile) {
            const docs = JSON.parse(await jsonFile.async('text'));
            summary.push({ name: col.name, count: docs.length });
          }
        }
      }
      const sf = zip.folder('storage/reports');
      if (sf) filesCount = Object.keys(sf.files).length;
      setPreviewData({ collections: summary, filesCount });
      setSelectedCollections(new Set(summary.map(c => c.name)));
      setRestoreFiles(filesCount > 0);
    } catch (err: unknown) { toast.error('فشل معاينة الملف: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setPreviewLoading(false); }
  };

  const toggleCollectionSelection = (name: string) => {
    const newSet = new Set(selectedCollections);
    if (newSet.has(name)) newSet.delete(name); else newSet.add(name);
    setSelectedCollections(newSet);
  };

  // =============== استعادة انتقائية ===============
  // الاستعادة (الحذف + الإدراج) تتم على الخادم (api/admin/backup/restore) بمفتاح API؛
  // كلمة المرور لفك التشفير تبقى في المتصفح فقط ويُرفع الملف مفكوك التشفير.
  const handleRestoreSelected = async () => {
    if (!selectedFile || selectedCollections.size === 0) return;
    setRestoreLoading(true); setRestorePercent(0); setRestoreProgress('جارٍ التحضير...');
    try {
      let blob: Blob = selectedFile;
      if (selectedFile.name.endsWith('.enc') && restorePassword) blob = await decryptBlob(selectedFile, restorePassword);

      setRestoreProgress('جارٍ الاستعادة على الخادم...'); setRestorePercent(30);
      const form = new FormData();
      form.append('file', new File([blob], 'restore.zip'));
      form.append('collections', JSON.stringify(Array.from(selectedCollections)));
      form.append('restoreFiles', restoreFiles ? 'true' : 'false');

      const res = await fetch('/api/admin/backup/restore', { method: 'POST', body: form });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        errors?: string[];
      } | null;
      if (!res.ok) throw new Error(data?.error || 'فشل الاستعادة');

      setRestorePercent(100);
      toast.success(data?.message || 'تم استعادة البيانات المحددة بنجاح');
      if (data?.errors && data.errors.length > 0) toast.warning(`${data.errors.length} ملاحظات أثناء الاستعادة`);
    } catch (err: unknown) { toast.error('فشل الاستعادة: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setRestoreLoading(false); setRestoreProgress(''); setRestorePercent(0); setRestoreConfirmOpen(false); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* النسخ الاحتياطي */}
        <Card className="text-center">
          <HardDrive size={48} className="mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">النسخ الاحتياطي</h1>
          <p className="text-text-muted mb-4">قم بتنزيل نسخة كاملة من جميع بيانات النظام على جهازك.</p>
          <div className="mb-4 flex flex-col items-center gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={backupEncrypt} onChange={e => setBackupEncrypt(e.target.checked)} /> تشفير الملف بكلمة مرور</label>
            {backupEncrypt && <input type="password" placeholder="كلمة المرور" value={backupPassword} onChange={e => setBackupPassword(e.target.value)} className="border border-border p-2 rounded-xl bg-surface w-48" />}
          </div>
          {backupLoading && <div className="mb-4"><Loader2 size={18} className="animate-spin inline" /> {backupProgress}<div className="w-full bg-border h-2 rounded-full mt-1"><div className="bg-primary h-2 rounded-full" style={{width:`${backupPercent}%`}} /></div></div>}
          <button onClick={handleBackup} disabled={backupLoading || (backupEncrypt && !backupPassword)} className="bg-primary text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:from-primary-dark hover:to-primary disabled:opacity-50"><Download size={20} /> {backupLoading ? 'جارٍ الإنشاء...' : 'إنشاء نسخة احتياطية'}</button>
        </Card>

        {/* استعادة النسخة */}
        <Card className="border-2 border-dashed border-warning">
          <AlertTriangle size={48} className="mx-auto text-warning mb-4" />
          <h2 className="text-2xl font-bold mb-2">استعادة النسخة الاحتياطية</h2>
          <p className="text-text-muted mb-4">ارفع ملف ZIP (أو .enc) لاستعادة البيانات.</p>
          <div className="mb-4 bg-warning-bg border border-warning-bg rounded-lg p-3 text-sm text-warning">تحذير: سيتم حذف البيانات الحالية في المجموعات المحددة.</div>
          <input type="file" accept=".zip,.enc" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="block mx-auto mb-2" />
          {selectedFile?.name?.endsWith('.enc') && <input type="password" placeholder="كلمة مرور فك التشفير" value={restorePassword} onChange={e => setRestorePassword(e.target.value)} className="border border-border p-2 rounded-xl bg-surface w-48 mx-auto mb-2" />}
          <button onClick={handlePreview} disabled={previewLoading || !selectedFile} className="bg-primary text-white px-4 py-2 rounded flex items-center gap-1 mx-auto mb-4 hover:from-primary-dark hover:to-primary"><Eye size={16} /> معاينة المحتويات</button>

          {previewData && (
            <div className="mb-4 bg-surface-dim p-4 rounded-lg text-right">
              <h3 className="font-bold mb-2">محتويات النسخة</h3>
              <p className="text-sm">عدد الملفات: {previewData.filesCount}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {previewData.collections.map((c: { name: string; count: number }) => (
                  <label key={c.name} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedCollections.has(c.name)} onChange={() => toggleCollectionSelection(c.name)} />
                    {c.name} ({c.count})
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 mt-3 text-sm"><input type="checkbox" checked={restoreFiles} onChange={e => setRestoreFiles(e.target.checked)} disabled={previewData.filesCount === 0} /> استعادة الملفات ({previewData.filesCount})</label>
            </div>
          )}

          {restoreLoading && <div className="mb-4"><Loader2 size={18} className="animate-spin inline" /> {restoreProgress}<div className="w-full bg-border h-2 rounded-full mt-1"><div className="bg-warning-solid h-2 rounded-full" style={{width:`${restorePercent}%`}} /></div></div>}
          <button onClick={() => setRestoreConfirmOpen(true)} disabled={restoreLoading || !previewData || selectedCollections.size === 0} className="bg-warning-solid text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-warning-solid disabled:opacity-50"><Upload size={20} /> استعادة المحدد</button>
        </Card>

        {/* إعادة تعيين النظام */}
        <Card className="border-2 border-danger-bg text-center">
          <AlertTriangle size={48} className="mx-auto text-danger mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-danger">إعادة تعيين النظام</h2>
          <p className="text-text-muted mb-4">سيؤدي هذا الإجراء إلى حذف جميع البيانات والملفات بشكل كامل ولا يمكن التراجع عنه.<br />ملاحظة: قوالب الفحوصات القياسية وأنواع العينات وحسابات الموظفين وأدوارهم <span className="text-success font-bold">لن تُحذف</span> — تُحفَظ تلقائياً.</p>
          <ResetSystemButton />
        </Card>
      </div>

      <ConfirmModal
        isOpen={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        onConfirm={handleRestoreSelected}
        title="تأكيد الاستعادة"
        message="سيتم حذف البيانات المحددة واستبدالها بالمحتوى من الملف. استمرار؟"
        confirmText="استعادة"
        cancelText="إلغاء"
        loading={restoreLoading}
      />
    </DashboardLayout></AuthGuard>
  );
}