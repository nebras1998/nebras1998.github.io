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
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">المركبات</h1>
        <Link href="/dashboard/vehicles/new" className="bg-gradient-to-l from-primary to-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center gap-2"><Plus size={18} /> إضافة مركبة</Link>
      </div>
      <div className="mb-5 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" placeholder="ابحث عن مركبة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-border bg-surface p-3 pr-10 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200" />
      </div>
      {loading ? <TableSkeleton rows={4} cols={6} /> : (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr className="bg-surface-dim border-b border-border"><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم اللوحة</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الماركة</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الموديل</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">النوع</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th><th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الإجراءات</th></tr></thead>
            <tbody>
              {filteredVehicles.length === 0 ? <tr><td colSpan={6}><EmptyData title="لا توجد مركبات" className="py-8" /></td></tr> :
                filteredVehicles.map((v: Vehicle) => (
                  <tr key={v.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                    <td className="p-4 font-mono text-text-primary text-sm">{v.plateNumber}</td>
                    <td className="p-4 text-text-secondary text-sm">{v.brand || '-'}</td>
                    <td className="p-4 text-text-secondary text-sm">{v.model || '-'}</td>
                    <td className="p-4 text-text-secondary text-sm">{v.type || '-'}</td>
                    <td className="p-4"><Badge status={v.status} /></td>
                    <td className="p-4 flex gap-1">
                      <Link href={`/dashboard/vehicles/${v.$id}`} className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"><Eye size={15} /> عرض</Link>
                      <Link href={`/dashboard/vehicles/${v.$id}/edit`} className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"><Edit size={15} /> تعديل</Link>
                      <button onClick={() => openDeleteModal(v.$id, v.plateNumber)} className="inline-flex items-center gap-1 text-danger hover:text-danger-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-danger-bg"><Trash2 size={15} /> حذف</button>
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