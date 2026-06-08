'use client';

import { useEffect, useState } from 'react';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { DATABASE_ID, EXPENSES_COLLECTION_ID, VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import TableSkeleton from '@/components/TableSkeleton';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [expRes, vehRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, EXPENSES_COLLECTION_ID, [Query.orderDesc('date'), Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION_ID, [Query.limit(50)]),
      ]);
      const vMap: Record<string, string> = {};
      vehRes.documents.forEach((v: any) => (vMap[v.$id] = v.plateNumber));
      setVehiclesMap(vMap);
      setExpenses(expRes.documents);
      setFiltered(expRes.documents);
    } catch (err: any) { toast.error('فشل تحميل المصروفات'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let result = expenses;
    if (filterType) result = result.filter(e => e.type === filterType);
    if (filterMonth) result = result.filter(e => e.date?.startsWith(filterMonth));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => e.description?.toLowerCase().includes(term) || e.vendor?.toLowerCase().includes(term) || e.expenseNumber?.toLowerCase().includes(term));
    }
    setFiltered(result);
  }, [searchTerm, filterType, filterMonth, expenses]);

  const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  const openDeleteModal = (id: string) => { setDeleteTarget(id); setModalOpen(true); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await databases.deleteDocument(DATABASE_ID, EXPENSES_COLLECTION_ID, deleteTarget);
      setExpenses(prev => prev.filter(e => e.$id !== deleteTarget));
      toast.success('تم حذف المصروف');
    } catch (err: any) { toast.error('خطأ: ' + err.message); }
    finally { setDeleting(false); setModalOpen(false); setDeleteTarget(null); }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">المصروفات</h1>
          <Link href="/dashboard/finance/expenses/new" className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-1 hover:bg-red-700"><Plus size={18} /> إضافة مصروف</Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1"><Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border p-2 pr-10 rounded" /></div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border p-2 rounded"><option value="">كل الأنواع</option><option value="سولار">سولار</option><option value="صيانة">صيانة</option><option value="شراء مواد">شراء مواد</option><option value="رواتب">رواتب</option><option value="إيجار">إيجار</option><option value="أخرى">أخرى</option></select>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border p-2 rounded" />
        </div>

        {loading ? <TableSkeleton rows={5} cols={7} /> : (
          <>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr className="bg-gray-50 border-b"><th className="text-right p-3">رقم المصروف</th><th className="text-right p-3">النوع</th><th className="text-right p-3">المبلغ</th><th className="text-right p-3">التاريخ</th><th className="text-right p-3">المركبة</th><th className="text-right p-3">البائع</th><th className="text-right p-3">الإجراءات</th></tr></thead>
                <tbody>
                  {filtered.length === 0 ? <tr><td colSpan={7} className="text-center p-4 text-gray-500">لا توجد مصروفات</td></tr> :
                    filtered.map(exp => (
                      <tr key={exp.$id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono">{exp.expenseNumber}</td>
                        <td className="p-3">{exp.type}</td>
                        <td className="p-3 font-bold">{exp.amount?.toFixed(2)} ₪</td>
                        <td className="p-3">{exp.date}</td>
                        <td className="p-3">{vehiclesMap[exp.vehicleId] || '-'}</td>
                        <td className="p-3">{exp.vendor || '-'}</td>
                        <td className="p-3 flex gap-2">
                          <Link href={`/dashboard/finance/expenses/${exp.$id}/edit`} className="text-blue-600 hover:underline flex items-center gap-1"><Edit size={16} /> تعديل</Link>
                          <button onClick={() => openDeleteModal(exp.$id)} className="text-red-600 hover:underline flex items-center gap-1"><Trash2 size={16} /> حذف</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && <div className="text-left text-lg font-bold bg-white p-4 rounded-lg shadow mt-4">إجمالي المصروفات: {totalAmount.toFixed(2)} ₪</div>}
          </>
        )}
        <ConfirmModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={handleDeleteConfirm} title="تأكيد الحذف" message="هل أنت متأكد من حذف هذا المصروف؟" confirmText="حذف" cancelText="إلغاء" loading={deleting} />
      </DashboardLayout>
    </AuthGuard>
  );
}