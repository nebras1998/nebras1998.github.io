'use client';

import { useState } from 'react';
import { databases, storage } from '@/lib/appwrite';
import {
  DATABASE_ID,
  REPORTS_BUCKET_ID,
  CLIENTS_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  TESTS_COLLECTION_ID,
  INVOICES_COLLECTION_ID,
  PAYMENTS_COLLECTION_ID,
  SERVICES_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  ATTENDANCE_COLLECTION_ID,
  LEAVE_REQUESTS_COLLECTION_ID,
  OVERTIME_COLLECTION_ID,
  VEHICLES_COLLECTION_ID,
  VEHICLE_TRIPS_COLLECTION_ID,
  EXPENSES_COLLECTION_ID,
  EQUIPMENT_COLLECTION_ID,
  BOOKINGS_COLLECTION_ID,
  SAMPLE_TYPES_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
  NOTIFICATIONS_COLLECTION_ID,
} from '@/lib/constants';
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
import { ID, Query } from 'appwrite';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

// قائمة شاملة بجميع المجموعات الموجودة في النظام حالياً
const ALL_COLLECTIONS = [
  { id: CLIENTS_COLLECTION_ID, name: 'العملاء' },
  { id: PROJECTS_COLLECTION_ID, name: 'المشاريع' },
  { id: SAMPLES_COLLECTION_ID, name: 'العينات' },
  { id: TESTS_COLLECTION_ID, name: 'الفحوصات' },
  { id: INVOICES_COLLECTION_ID, name: 'الفواتير' },
  { id: PAYMENTS_COLLECTION_ID, name: 'المدفوعات' },
  { id: SERVICES_COLLECTION_ID, name: 'الخدمات' },
  { id: EMPLOYEES_COLLECTION_ID, name: 'الموظفون' },
  { id: ATTENDANCE_COLLECTION_ID, name: 'الحضور' },
  { id: LEAVE_REQUESTS_COLLECTION_ID, name: 'طلبات الإجازة' },
  { id: OVERTIME_COLLECTION_ID, name: 'العمل الإضافي' },
  { id: VEHICLES_COLLECTION_ID, name: 'المركبات' },
  { id: VEHICLE_TRIPS_COLLECTION_ID, name: 'رحلات المركبات' },
  { id: EXPENSES_COLLECTION_ID, name: 'المصروفات' },
  { id: EQUIPMENT_COLLECTION_ID, name: 'الأجهزة' },
  { id: BOOKINGS_COLLECTION_ID, name: 'الحجوزات' },
  { id: SAMPLE_TYPES_COLLECTION_ID, name: 'أنواع العينات' },
  { id: STANDARD_TESTS_COLLECTION_ID, name: 'الفحوصات القياسية' },
  { id: NOTIFICATIONS_COLLECTION_ID, name: 'التنبيهات' },
];

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

// =============== دوال مساعدة ===============
const deleteAllDocumentsWithSDK = async (collectionId: string) => {
  try {
    let hasMore = true;
    while (hasMore) {
      const res = await databases.listDocuments(DATABASE_ID, collectionId, [Query.limit(100)]);
      if (res.documents.length === 0) {
        hasMore = false;
      } else {
        for (const doc of res.documents) {
          try {
            await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
            // تأخير بسيط لتجنب تجاوز حد المعدل
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e) {
            console.warn('فشل حذف مستند:', e);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`تعذر حذف مستندات المجموعة ${collectionId}:`, err);
    throw err;
  }
};

const deleteAllFiles = async () => {
  try {
    const filesRes = await storage.listFiles(REPORTS_BUCKET_ID);
    for (const file of filesRes.files) {
      await storage.deleteFile(REPORTS_BUCKET_ID, file.$id);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (err) {
    console.warn('تعذر حذف ملفات التخزين:', err);
    throw err;
  }
};

// =============== مكون إعادة تعيين النظام ===============
function ResetSystemButton() {
  const [step, setStep] = useState<'hidden' | 'confirm' | 'input'>('hidden');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (inputText !== 'حذف كل البيانات') { toast.error('العبارة المدخلة غير صحيحة'); return; }
    setLoading(true);
    try {
      for (const col of ALL_COLLECTIONS) await deleteAllDocumentsWithSDK(col.id);
      await deleteAllFiles();
      toast.success('تم حذف جميع البيانات بنجاح');
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
        <button onClick={() => setStep('hidden')} className="bg-concrete-200 text-concrete-800 px-4 py-2 rounded hover:bg-concrete-100">إلغاء</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-danger font-bold">اكتب <span className="bg-concrete-200 px-1 rounded">حذف كل البيانات</span> للتأكيد:</p>
      <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="border border-concrete-200 p-2 rounded-xl bg-concrete-0 w-48 text-center" placeholder="حذف كل البيانات" dir="rtl" />
      <br />
      <button onClick={handleReset} disabled={loading || inputText !== 'حذف كل البيانات'} className="bg-danger-solid text-white px-6 py-2 rounded hover:bg-danger-dark disabled:opacity-50">{loading ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}</button>
      <button onClick={() => { setStep('hidden'); setInputText(''); }} className="bg-concrete-200 text-concrete-800 px-4 py-2 rounded hover:bg-concrete-100 mr-2">إلغاء</button>
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
  const handleBackup = async () => {
    setBackupLoading(true); setBackupPercent(0); setBackupProgress('جارٍ التحضير...');
    const zip = new JSZip();
    try {
      const total = ALL_COLLECTIONS.length;
      for (let i = 0; i < total; i++) {
        const col = ALL_COLLECTIONS[i];
        setBackupPercent(Math.round(((i + 1) / total) * 80));
        setBackupProgress(`تصدير: ${col.name}...`);
        const folder = zip.folder(`database/${col.name}`);
        if (!folder) continue;
        try {
          const docsRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${col.id}/documents?limit=5000`, { headers: { 'X-Appwrite-Project': PROJECT_ID } });
          if (docsRes.ok) {
            const data = await docsRes.json();
            if (data.documents?.length > 0) folder.file('documents.json', JSON.stringify(data.documents, null, 2));
          }
        } catch { console.warn(`تعذر تصدير ${col.name}`); }
      }

      setBackupProgress('جلب الملفات من التخزين...'); setBackupPercent(85);
      try {
        const filesRes = await storage.listFiles(REPORTS_BUCKET_ID);
        if (filesRes.files.length > 0) {
          const sf = zip.folder('storage/reports');
          if (sf) for (const file of filesRes.files) {
            const blob = await (await fetch(storage.getFileDownload(REPORTS_BUCKET_ID, file.$id).toString())).blob();
            sf.file(file.name, blob);
          }
        }
      } catch { console.warn('تعذر جلب ملفات التخزين'); }

      setBackupProgress('جارٍ ضغط الملفات...'); setBackupPercent(95);
      let content: Blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
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
        if (col.name === 'النسخ الاحتياطي') continue;
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
  const handleRestoreSelected = async () => {
    if (!selectedFile || selectedCollections.size === 0) return;
    setRestoreLoading(true); setRestorePercent(0); setRestoreProgress('جارٍ التحضير...');
    try {
      let blob: Blob = selectedFile;
      if (selectedFile.name.endsWith('.enc') && restorePassword) blob = await decryptBlob(selectedFile, restorePassword);
      const zip = await JSZip.loadAsync(blob);

      if (restoreFiles) { setRestoreProgress('حذف الملفات القديمة...'); await deleteAllFiles(); }

      const arr = Array.from(selectedCollections);
      const total = arr.length + (restoreFiles ? 1 : 0);
      let step = 0;
      for (const colName of arr) {
        if (colName === 'النسخ الاحتياطي') continue;
        const col = ALL_COLLECTIONS.find(c => c.name === colName);
        if (!col) continue;
        step++; setRestorePercent(Math.round((step / total) * 100));
        setRestoreProgress(`استعادة: ${col.name}...`);
        const folder = zip.folder(`database/${col.name}`);
        if (!folder) continue;
        const jsonFile = folder.file('documents.json');
        if (!jsonFile) continue;
        const documents = JSON.parse(await jsonFile.async('text'));
        await deleteAllDocumentsWithSDK(col.id);
        for (const doc of documents) {
          const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...clean } = doc;
          try {
            await databases.createDocument(DATABASE_ID, col.id, ID.unique(), clean);
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch { console.warn(`فشل إدراج مستند في ${col.name}`); }
        }
      }

      if (restoreFiles) {
        step++; setRestorePercent(Math.round((step / total) * 100));
        setRestoreProgress('استعادة الملفات...');
        const sf = zip.folder('storage/reports');
        if (sf) for (const file of sf.file(/.*/)) {
          const blob = await file.async('blob');
          await storage.createFile(REPORTS_BUCKET_ID, ID.unique(), new File([blob], file.name));
        }
      }
      setRestorePercent(100);
      toast.success('تم استعادة البيانات المحددة بنجاح');
    } catch (err: unknown) { toast.error('فشل الاستعادة: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setRestoreLoading(false); setRestoreProgress(''); setRestorePercent(0); setRestoreConfirmOpen(false); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* النسخ الاحتياطي */}
        <Card className="text-center">
          <HardDrive size={48} className="mx-auto text-petrol mb-4" />
          <h1 className="text-2xl font-bold mb-2">النسخ الاحتياطي</h1>
          <p className="text-concrete-500 mb-4">قم بتنزيل نسخة كاملة من جميع بيانات النظام على جهازك.</p>
          <div className="mb-4 flex flex-col items-center gap-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={backupEncrypt} onChange={e => setBackupEncrypt(e.target.checked)} /> تشفير الملف بكلمة مرور</label>
            {backupEncrypt && <input type="password" placeholder="كلمة المرور" value={backupPassword} onChange={e => setBackupPassword(e.target.value)} className="border border-concrete-200 p-2 rounded-xl bg-concrete-0 w-48" />}
          </div>
          {backupLoading && <div className="mb-4"><Loader2 size={18} className="animate-spin inline" /> {backupProgress}<div className="w-full bg-concrete-200 h-2 rounded-full mt-1"><div className="bg-petrol h-2 rounded-full" style={{width:`${backupPercent}%`}} /></div></div>}
          <button onClick={handleBackup} disabled={backupLoading || (backupEncrypt && !backupPassword)} className="bg-petrol text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-petrol-dark disabled:opacity-50"><Download size={20} /> {backupLoading ? 'جارٍ الإنشاء...' : 'إنشاء نسخة احتياطية'}</button>
        </Card>

        {/* استعادة النسخة */}
        <Card className="border-2 border-dashed border-warning">
          <AlertTriangle size={48} className="mx-auto text-warning mb-4" />
          <h2 className="text-2xl font-bold mb-2">استعادة النسخة الاحتياطية</h2>
          <p className="text-concrete-500 mb-4">ارفع ملف ZIP (أو .enc) لاستعادة البيانات.</p>
          <div className="mb-4 bg-warning-bg border border-warning-bg rounded-lg p-3 text-sm text-warning">تحذير: سيتم حذف البيانات الحالية في المجموعات المحددة.</div>
          <input type="file" accept=".zip,.enc" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="block mx-auto mb-2" />
          {selectedFile?.name?.endsWith('.enc') && <input type="password" placeholder="كلمة مرور فك التشفير" value={restorePassword} onChange={e => setRestorePassword(e.target.value)} className="border border-concrete-200 p-2 rounded-xl bg-concrete-0 w-48 mx-auto mb-2" />}
          <button onClick={handlePreview} disabled={previewLoading || !selectedFile} className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 mx-auto mb-4 hover:bg-petrol-dark"><Eye size={16} /> معاينة المحتويات</button>

          {previewData && (
            <div className="mb-4 bg-concrete-50 p-4 rounded-lg text-right">
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

          {restoreLoading && <div className="mb-4"><Loader2 size={18} className="animate-spin inline" /> {restoreProgress}<div className="w-full bg-concrete-200 h-2 rounded-full mt-1"><div className="bg-warning-solid h-2 rounded-full" style={{width:`${restorePercent}%`}} /></div></div>}
          <button onClick={() => setRestoreConfirmOpen(true)} disabled={restoreLoading || !previewData || selectedCollections.size === 0} className="bg-warning-solid text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-warning-solid disabled:opacity-50"><Upload size={20} /> استعادة المحدد</button>
        </Card>

        {/* إعادة تعيين النظام */}
        <Card className="border-2 border-danger-bg text-center">
          <AlertTriangle size={48} className="mx-auto text-danger mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-danger">إعادة تعيين النظام</h2>
          <p className="text-concrete-500 mb-4">سيؤدي هذا الإجراء إلى حذف جميع البيانات والملفات بشكل كامل ولا يمكن التراجع عنه.</p>
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