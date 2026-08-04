'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Equipment } from '@/types';
import { listEquipment, deleteEquipment } from '@/lib/services/equipment';
import { Query } from '@/lib/services';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import Badge from '@/components/Badge';
import TableSkeleton from '@/components/TableSkeleton';

// دالة لفحص إذا كان التاريخ قريباً (خلال 30 يوماً)
const isNearDate = (dateStr: string) => {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30 && diffDays >= 0;
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const equipmentFiltered = useMemo(() => {
    if (!searchTerm.trim()) return equipment;
    const term = searchTerm.toLowerCase();
    return equipment.filter(e => e.name?.toLowerCase().includes(term) || e.model?.toLowerCase().includes(term));
  }, [searchTerm, equipment]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await listEquipment([Query.orderAsc('name')]);
        setEquipment(res.documents);
      } catch (err: unknown) {
        toast.error('فشل تحميل الأجهزة');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDeleteModal = (id: string, name: string) => { setDeleteTarget({ id, name }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEquipment(deleteTarget.id);
      setEquipment(prev => prev.filter(e => e.$id !== deleteTarget.id));
      toast.success('تم حذف الجهاز بنجاح');
    } catch (err: unknown) { toast.error('خطأ في الحذف: ' + (err instanceof Error ? err.message : String(err))); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">الأجهزة والمعدات</h1>
        <Link href="/dashboard/equipment/new" className="bg-petrol text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-petrol-dark"><Plus size={18} /> إضافة جهاز جديد</Link>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-500" />
        <input type="text" placeholder="ابحث عن جهاز..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-concrete-200 rounded p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-petrol" />
      </div>
      {loading ? <TableSkeleton rows={10} cols={6} /> :
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="bg-concrete-50 border-b">
            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الاسم</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الموديل</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الرقم التسلسلي</th>
            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المعايرة القادمة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الحالة</th><th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجراءات</th>
          </tr></thead>
          <tbody>
            {equipmentFiltered.length === 0 ? <tr><td colSpan={6} className="text-center p-4 text-concrete-500">لا يوجد أجهزة مطابقة</td></tr> :
              equipmentFiltered.map(eq => {
                const nearCalibration = eq.nextCalibrationDate ? isNearDate(eq.nextCalibrationDate) : false;
                return (
                  <tr key={eq.$id} className={`border-b hover:bg-concrete-50 ${nearCalibration ? 'bg-warning-bg' : ''}`}>
                    <td className="p-3 font-bold">{eq.name}</td>
                    <td className="p-3">{eq.model || '-'}</td>
                    <td className="p-3 font-mono text-sm">{eq.serialNumber || '-'}</td>
                    <td className="p-3">
                      {eq.nextCalibrationDate ? (
                        <span className={nearCalibration ? 'text-danger font-bold' : ''}>
                          {eq.nextCalibrationDate}
                          {nearCalibration && <span className="block text-xs text-danger">(قريباً)</span>}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3"><Badge status={eq.status} /></td>
                    <td className="p-3 flex gap-2">
                      <Link href={`/dashboard/equipment/${eq.$id}/edit`} className="text-petrol hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                      <button onClick={() => openDeleteModal(eq.$id, eq.name)} className="text-danger hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>}
      <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message={`هل أنت متأكد من حذف الجهاز "${deleteTarget?.name}"؟`} confirmText="حذف" cancelText="إلغاء" loading={deleting} />
    </DashboardLayout></AuthGuard>
  );
}