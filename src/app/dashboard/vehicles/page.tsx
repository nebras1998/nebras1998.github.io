'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import EmptyData from '@/components/EmptyData';
import Card from '@/components/Card';
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import type { Vehicle } from '@/lib/services';
import { listVehicles, deleteVehicle } from '@/lib/services/vehicles';
import { Query } from '@/lib/services';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';
import Badge from '@/components/Badge';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; plate: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredVehicles = useMemo(() => {
    if (!searchTerm.trim()) return vehicles;
    const term = searchTerm.toLowerCase();
    return vehicles.filter(v => v.plateNumber?.toLowerCase().includes(term) || v.brand?.toLowerCase().includes(term));
  }, [searchTerm, vehicles]);

  useEffect(() => {
    (async () => {
      try {
        const res = await listVehicles([Query.orderAsc('plateNumber')]);
        setVehicles(res.documents);
      } catch {
        toast.error('فشل تحميل المركبات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDeleteModal = (id: string, plate: string) => { setDeleteTarget({ id, plate }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVehicle(deleteTarget.id);
      setVehicles(prev => prev.filter(v => v.$id !== deleteTarget.id));
      toast.success('تم حذف المركبة بنجاح');
    } catch (err: unknown) { toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">المركبات</h1>
        <Link href="/dashboard/vehicles/new" className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark"><Plus size={18} /> إضافة مركبة</Link>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
        <input type="text" placeholder="ابحث عن مركبة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 pr-10 rounded" />
      </div>
      {loading ? <TableSkeleton rows={4} cols={6} /> : (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="bg-concrete-50 border-b"><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">رقم اللوحة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الماركة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الموديل</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">النوع</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th></tr></thead>
            <tbody>
              {filteredVehicles.length === 0 ? <tr><td colSpan={6}><EmptyData title="لا توجد مركبات" className="py-8" /></td></tr> :
                filteredVehicles.map((v: Vehicle) => (
                  <tr key={v.$id} className="border-b hover:bg-concrete-50">
                    <td className="p-3 font-mono">{v.plateNumber}</td>
                    <td className="p-3">{v.brand || '-'}</td>
                    <td className="p-3">{v.model || '-'}</td>
                    <td className="p-3">{v.type || '-'}</td>
                    <td className="p-3"><Badge status={v.status} /></td>
                    <td className="p-3 flex gap-2">
                      <Link href={`/dashboard/vehicles/${v.$id}`} className="text-petrol hover:underline flex items-center gap-1"><Eye size={16} /> عرض</Link>
                      <Link href={`/dashboard/vehicles/${v.$id}/edit`} className="text-petrol hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                      <button onClick={() => openDeleteModal(v.$id, v.plateNumber)} className="text-danger hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Card>
      )}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف المركبة "${deleteTarget?.plate}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}