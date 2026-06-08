'use client';

import { useEffect, useState } from 'react';
import { databases, storage } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { DATABASE_ID, TESTS_COLLECTION_ID, REPORTS_BUCKET_ID } from '@/lib/constants';
import { toast } from 'sonner';
import { Trash2, Search } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = async () => {
    try {
      const result = await storage.listFiles(REPORTS_BUCKET_ID);
      setFiles(result.files);
      setFiltered(result.files);
    } catch (err: any) {
      toast.error('فشل تحميل الملفات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(files);
    } else {
      const term = searchTerm.toLowerCase();
      setFiltered(files.filter((f: any) => f.name.toLowerCase().includes(term)));
    }
  }, [searchTerm, files]);

  const openDeleteModal = (file: any) => {
    setDeleteTarget(file);
    setDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // 1. حذف الملف من التخزين
      await storage.deleteFile(REPORTS_BUCKET_ID, deleteTarget.$id);

      // 2. البحث عن أي فحص يشير إلى هذا الملف وإزالة الإشارة
      try {
        const testsRes = await databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [
          // يمكنك إضافة استعلام للبحث عن reportFileId = deleteTarget.$id
        ]);
        for (const test of testsRes.documents) {
          if (test.reportFileId === deleteTarget.$id) {
            await databases.updateDocument(DATABASE_ID, TESTS_COLLECTION_ID, test.$id, {
              reportFileId: '',
            });
          }
        }
      } catch (updateErr) {
        console.warn('تعذر تحديث الفحوصات المرتبطة:', updateErr);
      }

      toast.success('تم حذف الملف بنجاح');
      fetchFiles();
    } catch (err: any) {
      toast.error('فشل حذف الملف: ' + err.message);
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
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث باسم الملف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 p-2 pr-10 rounded"
          />
        </div>

        {loading ? (
          <p>جارٍ تحميل الملفات...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-right p-3">اسم الملف</th>
                  <th className="text-right p-3">الحجم (KB)</th>
                  <th className="text-right p-3">تاريخ الرفع</th>
                  <th className="text-right p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500">لا توجد ملفات</td>
                  </tr>
                ) : (
                  filtered.map((file: any) => (
                    <tr key={file.$id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{file.name}</td>
                      <td className="p-3">{(file.sizeOriginal / 1024).toFixed(2)}</td>
                      <td className="p-3">{new Date(file.$createdAt).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3">
                        <button
                          onClick={() => openDeleteModal(file)}
                          className="text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={16} /> حذف
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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