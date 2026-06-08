'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { databases } from '@/lib/appwrite';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DATABASE_ID,
  INVOICES_COLLECTION_ID,
  CLIENTS_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
  SAMPLE_TYPES_COLLECTION_ID, // ✅ تمت الإضافة لجلب أنواع العينات
} from '@/lib/constants';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import { Plus, X } from 'lucide-react';

interface InvoiceItem {
  testId: string;
  testName: string;
  unit: string;
  specification: string;
  price: number;
  quantity: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [typeMap, setTypeMap] = useState<Record<string, string>>({}); // ✅ ربط sampleTypeId -> اسم النوع

  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { testId: '', testName: '', unit: '', specification: '', price: 0, quantity: 1, total: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    if (field === 'testId') {
      const test = tests.find(t => t.$id === value);
      if (test) {
        newItems[index].testId = test.$id;
        newItems[index].testName = test.name;
        newItems[index].unit = test.unit || '';
        newItems[index].specification = test.specification || '';
        newItems[index].price = test.price || 0;
        newItems[index].total = (test.price || 0) * newItems[index].quantity;
      }
    } else if (field === 'quantity') {
      newItems[index].quantity = parseFloat(value) || 0;
      newItems[index].total = newItems[index].price * newItems[index].quantity;
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.16;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const generateInvoiceNumber = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, INVOICES_COLLECTION_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(1),
      ]);
      const year = new Date().getFullYear();
      let next = 1;
      if (res.documents.length > 0) {
        const last = res.documents[0].invoiceNumber;
        if (last && last.includes(`INV-${year}-`)) {
          const parts = last.split('-');
          next = parseInt(parts[2]) + 1;
        }
      }
      return `INV-${year}-${String(next).padStart(4, '0')}`;
    } catch {
      return `INV-${new Date().getFullYear()}-0001`;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [cliRes, projRes, testsRes, typesRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, CLIENTS_COLLECTION_ID, [Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, STANDARD_TESTS_COLLECTION_ID, [Query.limit(500)]),
          databases.listDocuments(DATABASE_ID, SAMPLE_TYPES_COLLECTION_ID, [Query.limit(100)]), // ✅ جلب أنواع العينات
        ]);
        setClients(cliRes.documents);
        setProjects(projRes.documents);
        setTests(testsRes.documents);

        // بناء خريطة من معرف النوع إلى اسمه
        const map: Record<string, string> = {};
        typesRes.documents.forEach((type: any) => {
          map[type.$id] = type.name;
        });
        setTypeMap(map);
      } catch (err: any) {
        toast.error('فشل تحميل البيانات');
      }
    })();
  }, []);

  // تجميع الفحوصات حسب نوع العينة لاستخدامها في optgroup
  const groupedTests = () => {
    const groups: Record<string, any[]> = {};
    tests.forEach(test => {
      const typeName = typeMap[test.sampleTypeId] || 'غير مصنف';
      if (!groups[typeName]) groups[typeName] = [];
      groups[typeName].push(test);
    });
    return groups;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('أضف بنداً واحداً على الأقل');
      return;
    }
    setLoading(true);
    try {
      const invoiceNumber = await generateInvoiceNumber();
      await databases.createDocument(DATABASE_ID, INVOICES_COLLECTION_ID, 'unique()', {
        invoiceNumber,
        clientId,
        projectId,
        issueDate,
        dueDate,
        status: 'صادرة',
        items: JSON.stringify(items),
        subtotal,
        tax,
        total,
        paidAmount: 0,
        remainingAmount: total,
        notes,
      });
      toast.success('تم إنشاء الفاتورة بنجاح');
      router.push('/dashboard/finance/invoices');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">إنشاء فاتورة جديدة</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">العميل *</label>
                <select value={clientId} onChange={e => setClientId(e.target.value)} required className="w-full border p-2 rounded">
                  <option value="">اختر العميل</option>
                  {clients.map(c => <option key={c.$id} value={c.$id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1">المشروع (اختياري)</label>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full border p-2 rounded">
                  <option value="">بدون مشروع</option>
                  {projects.map(p => <option key={p.$id} value={p.$id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1">تاريخ الإصدار</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block mb-1">تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border p-2 rounded" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-lg">البنود</h2>
                <button type="button" onClick={addItem} className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1">
                  <Plus size={16} /> إضافة بند
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm">لا توجد بنود. اضغط "إضافة بند".</p>
              ) : (
                <div className="overflow-x-auto border rounded">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-right">الفحص (الخدمة)</th>
                        <th className="p-2 text-right">الكمية</th>
                        <th className="p-2 text-right">السعر</th>
                        <th className="p-2 text-right">الإجمالي</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <select
                              value={item.testId}
                              onChange={e => updateItem(idx, 'testId', e.target.value)}
                              required
                              className="w-full border p-1 rounded text-sm"
                            >
                              <option value="">اختر فحصاً</option>
                              {Object.entries(groupedTests()).map(([typeName, typeTests]) => (
                                <optgroup key={typeName} label={typeName}>
                                  {typeTests.map(test => (
                                    <option key={test.$id} value={test.$id}>
                                      {test.name} ({test.specification || '-'}) - {test.price || 0} ₪
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-20 border p-1 rounded" />
                          </td>
                          <td className="p-2">{item.price.toFixed(2)} ₪</td>
                          <td className="p-2 font-bold">{item.total.toFixed(2)} ₪</td>
                          <td className="p-2">
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-500"><X size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-2 text-left">
              <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="font-bold">{subtotal.toFixed(2)} ₪</span></div>
              <div className="flex justify-between"><span>الضريبة (16%):</span><span>{tax.toFixed(2)} ₪</span></div>
              <div className="flex justify-between text-xl"><span>الإجمالي:</span><span className="font-bold">{total.toFixed(2)} ₪</span></div>
            </div>

            <div>
              <label className="block mb-1">ملاحظات</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border p-2 rounded" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">
              {loading ? 'جارٍ الحفظ...' : 'إنشاء الفاتورة'}
            </button>
          </form>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}