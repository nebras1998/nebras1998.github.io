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
} from '@/lib/constants';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
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
];

// =============== دوال التشفير ===============
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  // نسخ salt إلى Uint8Array جديد يضمن توافق النوع مع BufferSource
  const safeSalt = new Uint8Array(salt);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: safeSalt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptBlob = async (blob: Blob, password: string): Promise<Blob> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = await blob.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  const header = new Uint8Array(salt.length + iv.length);
  header.set(salt, 0);
  header.set(iv, salt.length);
  const body = new Uint8Array(ciphertext);
  const combined = new Uint8Array(header.length + body.length);
  combined.set(header, 0);
  combined.set(body, header.length);
  return new Blob([combined]);
};

const decryptBlob = async (blob: Blob, password: string): Promise<Blob> => {
  const buffer = await blob.arrayBuffer();
  const salt = new Uint8Array(buffer.slice(0, 16));
  const iv = new Uint8Array(buffer.slice(16, 28));
  const ciphertext = new Uint8Array(buffer.slice(28));
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new Blob([plaintext]);
};

// =============== دوال مساعدة ===============
const deleteAllDocumentsWithSDK = async (collectionId: string) => {
  try {
    let hasMore = true;
    while (hasMore) {
      const res = await databases.listDocuments(DATABASE_ID, collectionId, [Query.limit(100)]);
      if (res.documents.length === 0) hasMore = false;
      else for (const doc of res.documents) await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
    }
  } catch (err) {
    console.warn(`تعذر حذف مستندات المجموعة ${collectionId}:`, err);
    throw err;
  }
};

const deleteAllFiles = async () => {
  try {
    const filesRes = await storage.listFiles(REPORTS_BUCKET_ID);
    for (const file of filesRes.files) await storage.deleteFile(REPORTS_BUCKET_ID, file.$id);
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
    if (inputText !== 'حذف كل البيانات') {
      toast.error('العبارة المدخلة غير صحيحة');
      return;
    }
    setLoading(true);
    try {
      // حذف جميع المستندات من كل مجموعة
      for (const col of ALL_COLLECTIONS) {
        await deleteAllDocumentsWithSDK(col.id);
      }
      // حذف جميع الملفات
      await deleteAllFiles();
      toast.success('تم حذف جميع البيانات بنجاح');
      setStep('hidden');
      setInputText('');
    } catch (err: any) {
      toast.error('فشل في حذف البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'hidden') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-red-700"
      >
        <Trash2 size={20} />
        حذف جميع البيانات
      </button>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-3">
        <p className="text-red-600 font-bold">هل أنت متأكد؟ هذه العملية لا يمكن التراجع عنها.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setStep('input')}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            نعم، متابعة
          </button>
          <button
            onClick={() => setStep('hidden')}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-red-600 font-bold">
        اكتب <span className="bg-gray-200 px-1 rounded">حذف كل البيانات</span> للتأكيد:
      </p>
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="border p-2 rounded w-48 text-center"
        placeholder="حذف كل البيانات"
        dir="rtl"
      />
      <br />
      <button
        onClick={handleReset}
        disabled={loading || inputText !== 'حذف كل البيانات'}
        className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
      </button>
      <button
        onClick={() => { setStep('hidden'); setInputText(''); }}
        className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 mr-2"
      >
        إلغاء
      </button>
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

  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [restoreFiles, setRestoreFiles] = useState(true);

  // =============== النسخ الاحتياطي ===============
  const handleBackup = async () => {
    setBackupLoading(true);
    setBackupPercent(0);
    setBackupProgress('جارٍ التحضير...');
    const zip = new JSZip();

    try {
      const totalCollections = ALL_COLLECTIONS.length;
      for (let i = 0; i < totalCollections; i++) {
        const col = ALL_COLLECTIONS[i];
        const percent = Math.round(((i + 1) / totalCollections) * 80);
        setBackupPercent(percent);
        setBackupProgress(`تصدير مجموعة: ${col.name}...`);
        const folder = zip.folder(`database/${col.name}`);
        if (!folder) continue;

        try {
          const docsRes = await fetch(
            `${ENDPOINT}/databases/${DATABASE_ID}/collections/${col.id}/documents?limit=5000`,
            { headers: { 'X-Appwrite-Project': PROJECT_ID } }
          );
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            if (docsData.documents?.length > 0) {
              folder.file('documents.json', JSON.stringify(docsData.documents, null, 2));
            }
          }
        } catch (err) {
          console.warn(`تعذر تصدير ${col.name}:`, err);
        }
      }

      setBackupProgress('جلب الملفات من التخزين...');
      setBackupPercent(85);
      try {
        const filesRes = await storage.listFiles(REPORTS_BUCKET_ID);
        if (filesRes.files.length > 0) {
          const storageFolder = zip.folder('storage/reports');
          if (storageFolder) {
            for (const file of filesRes.files) {
              setBackupProgress(`تنزيل: ${file.name}`);
              const fileUrl = storage.getFileDownload(REPORTS_BUCKET_ID, file.$id);
              const blob = await (await fetch(fileUrl.toString())).blob();
              storageFolder.file(file.name, blob);
            }
          }
        }
      } catch (err) {
        console.warn('تعذر جلب ملفات التخزين:', err);
      }

      setBackupProgress('جارٍ ضغط الملفات...');
      setBackupPercent(95);
      let content: Blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      if (backupEncrypt && backupPassword) {
        content = await encryptBlob(content, backupPassword);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = backupEncrypt ? 'zip.enc' : 'zip';
      saveAs(content, `backup-${timestamp}.${extension}`);
      setBackupPercent(100);
      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
    } catch (err: any) {
      toast.error('فشل النسخ الاحتياطي: ' + err.message);
    } finally {
      setBackupLoading(false);
      setBackupProgress('');
      setBackupPercent(0);
    }
  };

  // =============== معاينة الملف ===============
  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error('الرجاء اختيار ملف ZIP');
      return;
    }
    setPreviewLoading(true);
    try {
      let fileBlob: Blob = selectedFile;
      if (selectedFile.name.endsWith('.enc') && restorePassword) {
        fileBlob = await decryptBlob(selectedFile, restorePassword);
      }

      const zip = await JSZip.loadAsync(fileBlob);
      const collectionsSummary: { name: string; count: number }[] = [];
      let filesCount = 0;

      for (const col of ALL_COLLECTIONS) {
        // استبعاد مجموعة النسخ الاحتياطي من المعاينة
        if (col.name === 'النسخ الاحتياطي') continue;
        const folder = zip.folder(`database/${col.name}`);
        if (!folder) continue;
        const jsonFile = folder.file('documents.json');
        if (jsonFile) {
          const jsonData = await jsonFile.async('text');
          try {
            const docs = JSON.parse(jsonData);
            collectionsSummary.push({ name: col.name, count: docs.length });
          } catch {}
        }
      }

      const storageFolder = zip.folder('storage/reports');
      if (storageFolder) {
        filesCount = Object.keys(storageFolder.files).length;
      }

      setPreviewData({ collections: collectionsSummary, filesCount });
      setSelectedCollections(new Set(collectionsSummary.map(c => c.name)));
      setRestoreFiles(filesCount > 0);
    } catch (err: any) {
      toast.error('فشل معاينة الملف: ' + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleCollectionSelection = (name: string) => {
    const newSet = new Set(selectedCollections);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedCollections(newSet);
  };

  // =============== استعادة انتقائية ===============
  const handleRestoreSelected = async () => {
    if (!selectedFile) return;
    if (!confirm('سيتم حذف البيانات المحددة واستبدالها بالمحتوى من الملف. استمرار؟')) return;

    setRestoreLoading(true);
    setRestorePercent(0);
    setRestoreProgress('جارٍ التحضير...');
    try {
      let fileBlob: Blob = selectedFile;
      if (selectedFile.name.endsWith('.enc') && restorePassword) {
        fileBlob = await decryptBlob(selectedFile, restorePassword);
      }

      const zip = await JSZip.loadAsync(fileBlob);

      if (restoreFiles) {
        setRestoreProgress('حذف الملفات القديمة...');
        await deleteAllFiles();
      }

      const selectedArray = Array.from(selectedCollections);
      const totalSteps = selectedArray.length + (restoreFiles ? 1 : 0);
      let currentStep = 0;

      for (const colName of selectedArray) {
        // استبعاد مجموعة النسخ الاحتياطي من الاستعادة
        if (colName === 'النسخ الاحتياطي') continue;
        const col = ALL_COLLECTIONS.find(c => c.name === colName);
        if (!col) continue;

        currentStep++;
        const percent = Math.round((currentStep / totalSteps) * 100);
        setRestorePercent(percent);
        setRestoreProgress(`استعادة مجموعة: ${col.name}...`);

        const folder = zip.folder(`database/${col.name}`);
        if (!folder) continue;

        const jsonFile = folder.file('documents.json');
        if (!jsonFile) continue;

        const jsonData = await jsonFile.async('text');
        const documents = JSON.parse(jsonData);

        await deleteAllDocumentsWithSDK(col.id);

        for (const doc of documents) {
          const cleanDoc = { ...doc };
          delete cleanDoc.$id;
          delete cleanDoc.$createdAt;
          delete cleanDoc.$updatedAt;
          delete cleanDoc.$permissions;
          delete cleanDoc.$databaseId;
          delete cleanDoc.$collectionId;

          try {
            await databases.createDocument(DATABASE_ID, col.id, ID.unique(), cleanDoc);
          } catch (err) {
            console.warn(`فشل إدراج مستند في ${col.name}:`, err);
          }
        }
      }

      if (restoreFiles) {
        currentStep++;
        setRestorePercent(Math.round((currentStep / totalSteps) * 100));
        setRestoreProgress('استعادة الملفات إلى التخزين...');
        const storageFolder = zip.folder('storage/reports');
        if (storageFolder) {
          const files = storageFolder.file(/.*/);
          for (const file of files) {
            const blob = await file.async('blob');
            const actualFile = new File([blob], file.name);
            await storage.createFile(REPORTS_BUCKET_ID, ID.unique(), actualFile);
          }
        }
      }

      setRestorePercent(100);
      toast.success('تم استعادة البيانات المحددة بنجاح');
    } catch (err: any) {
      toast.error('فشل الاستعادة: ' + err.message);
    } finally {
      setRestoreLoading(false);
      setRestoreProgress('');
      setRestorePercent(0);
    }
  };

  // =============== واجهة المستخدم ===============
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-8">
          {/* النسخ الاحتياطي */}
          <div className="bg-white p-8 rounded-xl shadow text-center">
            <HardDrive size={48} className="mx-auto text-indigo-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">النسخ الاحتياطي</h1>
            <p className="text-gray-500 mb-4">
              قم بتنزيل نسخة كاملة من جميع بيانات النظام (قواعد البيانات والملفات) على جهازك.
            </p>

            <div className="mb-4 flex flex-col items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={backupEncrypt}
                  onChange={(e) => setBackupEncrypt(e.target.checked)}
                />
                تشفير الملف بكلمة مرور
              </label>
              {backupEncrypt && (
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="border p-2 rounded w-48"
                  required
                />
              )}
            </div>

            {backupLoading && (
              <div className="mb-4 space-y-1">
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{backupProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${backupPercent}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={handleBackup}
              disabled={backupLoading || (backupEncrypt && !backupPassword)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-indigo-700 disabled:opacity-50"
            >
              <Download size={20} />
              {backupLoading ? 'جارٍ إنشاء النسخة...' : 'إنشاء نسخة احتياطية'}
            </button>
          </div>

          {/* استعادة النسخة الاحتياطية */}
          <div className="bg-white p-8 rounded-xl shadow border-2 border-dashed border-amber-300">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">استعادة النسخة الاحتياطية</h2>
            <p className="text-gray-500 mb-4">
              ارفع ملف ZIP (أو .enc) الذي قمت بتنزيله مسبقًا لاستعادة جميع البيانات أو جزء منها.
            </p>
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              تحذير: سيتم حذف البيانات الحالية في المجموعات المحددة واستبدالها بمحتويات الملف.
            </div>

            <div className="flex flex-col items-center gap-2 mb-4">
              <input
                type="file"
                accept=".zip,.enc"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="block"
                disabled={restoreLoading}
              />
              {selectedFile?.name?.endsWith('.enc') && (
                <input
                  type="password"
                  placeholder="كلمة مرور فك التشفير"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  className="border p-2 rounded w-48"
                />
              )}
              <button
                onClick={handlePreview}
                disabled={previewLoading || !selectedFile}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
              >
                <Eye size={16} /> معاينة المحتويات
              </button>
            </div>

            {previewData && (
              <div className="mb-4 bg-gray-50 p-4 rounded-lg text-right">
                <h3 className="font-bold mb-2">محتويات النسخة</h3>
                <p className="text-sm text-gray-600">عدد الملفات: {previewData.filesCount}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {previewData.collections.map((c: any) => (
                    <label key={c.name} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCollections.has(c.name)}
                        onChange={() => toggleCollectionSelection(c.name)}
                      />
                      {c.name} ({c.count} مستند)
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-3 text-sm">
                  <input
                    type="checkbox"
                    checked={restoreFiles}
                    onChange={(e) => setRestoreFiles(e.target.checked)}
                    disabled={previewData.filesCount === 0}
                  />
                  استعادة الملفات ({previewData.filesCount})
                </label>
              </div>
            )}

            {restoreLoading && (
              <div className="mb-4 space-y-1">
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{restoreProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-600 h-2 rounded-full transition-all" style={{ width: `${restorePercent}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={handleRestoreSelected}
              disabled={restoreLoading || !previewData || selectedCollections.size === 0}
              className="bg-amber-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto hover:bg-amber-700 disabled:opacity-50"
            >
              <Upload size={20} />
              {restoreLoading ? 'جارٍ الاستعادة...' : 'استعادة المحدد'}
            </button>
          </div>

          {/* إعادة تعيين النظام */}
          <div className="bg-white p-8 rounded-xl shadow border-2 border-red-300 text-center">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-red-700">إعادة تعيين النظام</h2>
            <p className="text-gray-600 mb-4">
              سيؤدي هذا الإجراء إلى حذف جميع البيانات والملفات بشكل كامل ولا يمكن التراجع عنه.
              تأكد من عمل نسخة احتياطية قبل المتابعة.
            </p>
            <ResetSystemButton />
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}