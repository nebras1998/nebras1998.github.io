'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { DATABASE_ID, EQUIPMENT_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';

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
  const [equipment, setEquipment] = useState<any[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEquipment = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, EQUIPMENT_COLLECTION_ID, [Query.orderAsc('name')]);
      setEquipment(res.documents);
      setFilteredEquipment(res.documents);
    } catch (err: any) {
      toast.error('فشل تحميل الأجهزة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEquipment(); }, []);

  useEffect(() => {
    if (!searchTerm.trim()) setFilteredEquipment(equipment);
    else {
      const term = searchTerm.toLowerCase();
      setFilteredEquipment(equipment.filter(e => e.name?.toLowerCase().includes(term) || e.model?.toLowerCase().includes(term)));
    }
  }, [searchTerm, equipment]);

  const openDeleteModal = (id: string, name: string) => { setDeleteTarget({ id, name }); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, EQUIPMENT_COLLECTION_ID, deleteTarget.id);
      setEquipment(prev => prev.filter(e => e.$id !== deleteTarget.id));
      toast.success('تم حذف الجهاز بنجاح');
    } catch (err: any) { toast.error('خطأ في الحذف: ' + err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard><DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">الأجهزة والمعدات</h1>
        <Link href="/dashboard/equipment/new" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-blue-700"><Plus size={18} /> إضافة جهاز جديد</Link>
      </div>
      <div className="mb-4 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="ابحث عن جهاز..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded p-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      {loading ? <p>جارٍ تحميل البيانات...</p> :
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="bg-gray-50 border-b">
            <th className="text-right p-3">الاسم</th><th className="text-right p-3">الموديل</th><th className="text-right p-3">الرقم التسلسلي</th>
            <th className="text-right p-3">المعايرة القادمة</th><th className="text-right p-3">الحالة</th><th className="text-right p-3">الإجراءات</th>
          </tr></thead>
          <tbody>
            {filteredEquipment.length === 0 ? <tr><td colSpan={6} className="text-center p-4 text-gray-500">لا يوجد أجهزة مطابقة</td></tr> :
              filteredEquipment.map(eq => {
                const nearCalibration = isNearDate(eq.nextCalibrationDate);
                return (
                  <tr key={eq.$id} className={`border-b hover:bg-gray-50 ${nearCalibration ? 'bg-yellow-50' : ''}`}>
                    <td className="p-3 font-bold">{eq.name}</td>
                    <td className="p-3">{eq.model || '-'}</td>
                    <td className="p-3 font-mono text-sm">{eq.serialNumber || '-'}</td>
                    <td className="p-3">
                      {eq.nextCalibrationDate ? (
                        <span className={nearCalibration ? 'text-red-600 font-bold' : ''}>
                          {eq.nextCalibrationDate}
                          {nearCalibration && <span className="block text-xs text-red-500">(قريباً)</span>}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-3">{eq.status}</td>
                    <td className="p-3 flex gap-2">
                      <Link href={`/dashboard/equipment/${eq.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                      <button onClick={() => openDeleteModal(eq.$id, eq.name)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
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