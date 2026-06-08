'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import { DATABASE_ID, VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; plate: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION_ID, [Query.orderAsc('plateNumber')]);
      setVehicles(res.documents);
      setFiltered(res.documents);
    } catch (err: any) {
      toast.error('فشل تحميل المركبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  useEffect(() => {
    if (!searchTerm.trim()) setFiltered(vehicles);
    else {
      const term = searchTerm.toLowerCase();
      setFiltered(vehicles.filter(v => v.plateNumber?.toLowerCase().includes(term) || v.brand?.toLowerCase().includes(term)));
    }
  }, [searchTerm, vehicles]);

  const openDeleteModal = (id: string, plate: string) => { setDeleteTarget({ id, plate }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, VEHICLES_COLLECTION_ID, deleteTarget.id);
      setVehicles(prev => prev.filter(v => v.$id !== deleteTarget.id));
      toast.success('تم حذف المركبة بنجاح');
    } catch (err: any) { toast.error('خطأ: ' + err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">المركبات</h1>
        <Link href="/dashboard/vehicles/new" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"><Plus size={18} /> إضافة مركبة</Link>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="ابحث عن مركبة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 pr-10 rounded" />
      </div>
      {loading ? <TableSkeleton rows={4} cols={6} /> : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="bg-gray-50 border-b"><th className="text-right p-3">رقم اللوحة</th><th className="text-right p-3">الماركة</th><th className="text-right p-3">الموديل</th><th className="text-right p-3">النوع</th><th className="text-right p-3">الحالة</th><th className="text-right p-3">الإجراءات</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={6} className="text-center p-4 text-gray-500">لا توجد مركبات</td></tr> :
                filtered.map(v => (
                  <tr key={v.$id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{v.plateNumber}</td>
                    <td className="p-3">{v.brand || '-'}</td>
                    <td className="p-3">{v.model || '-'}</td>
                    <td className="p-3">{v.type || '-'}</td>
                    <td className="p-3">{v.status}</td>
                    <td className="p-3 flex gap-2">
                      <Link href={`/dashboard/vehicles/${v.$id}`} className="text-green-600 hover:underline flex items-center gap-1"><Eye size={16} /> عرض</Link>
                      <Link href={`/dashboard/vehicles/${v.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                      <button onClick={() => openDeleteModal(v.$id, v.plateNumber)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف المركبة "${deleteTarget?.plate}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}