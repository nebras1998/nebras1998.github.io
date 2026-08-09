'use client';

import { useEffect, useState, useMemo } from 'react';
import { listFiles, deleteFile } from '@/lib/services/files';
import { listTests, updateTest } from '@/lib/services/tests';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import { toast } from 'sonner';
import { Trash2, Search } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';

interface StorageFile {
  $id: string;
  name: string;
  sizeOriginal: number;
  $createdAt: string;
  [key: string]: unknown;
}

export default function FilesPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return files;
    const term = searchTerm.toLowerCase();
    return files.filter((f: StorageFile) => f.name.toLowerCase().includes(term));
  }, [searchTerm, files]);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StorageFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await listFiles();
        setFiles(result.files);
      } catch (err: unknown) {
        toast.error('فشل تحميل الملفات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDeleteModal = (file: StorageFile) => {
    setDeleteTarget(file);
    setDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // 1. حذف الملف من التخزين
      await deleteFile(deleteTarget.$id);

      // 2. البحث عن أي فحص يشير إلى هذا الملف وإزالة الإشارة
      try {
        const testsRes = await listTests([
          // يمكنك إضافة استعلام للبحث عن reportFileId = deleteTarget.$id
        ]);
        for (const test of testsRes.documents) {
          if (test.reportFileId === deleteTarget.$id) {
            await updateTest(test.$id, {
              reportFileId: '',
            });
          }
        }
      } catch (updateErr) {
        console.warn('تعذر تحديث الفحوصات المرتبطة:', updateErr);
      }

      toast.success('تم حذف الملف بنجاح');
      setFiles(prev => prev.filter(f => f.$id !== deleteTarget.$id));
    } catch (err: unknown) {
      toast.error('فشل حذف الملف: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleting(false);
      setDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">إدارة الملفات</h1>
        </div>

        <div className="mb-4 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
          <input
            type="text"
            placeholder="ابحث باسم الملف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-concrete-200 p-2 pr-10 rounded"
          />
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-concrete-50 border-b">
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">اسم الملف</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحجم (KB)</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">تاريخ الرفع</th>
                  <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4}><EmptyData title="لا توجد ملفات" className="py-8" /></td>
                  </tr>
                ) : (
                  filtered.map((file: StorageFile) => (
                    <tr key={file.$id} className="border-b hover:bg-concrete-50">
                      <td className="p-3">{file.name}</td>
                      <td className="p-3">{(file.sizeOriginal / 1024).toFixed(2)}</td>
                      <td className="p-3">{new Date(file.$createdAt).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3">
                        <button
                          onClick={() => openDeleteModal(file)}
                          className="text-danger hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={16} /> حذف
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        )}

        <ConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="تأكيد حذف الملف"
          message={`هل أنت متأكد من حذف الملف "${deleteTarget?.name}"؟ سيتم إزالة الربط مع أي فحص مرتبط.`}
          confirmText="حذف"
          cancelText="إلغاء"
          loading={deleting}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}