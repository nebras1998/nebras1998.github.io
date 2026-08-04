'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import type { Client } from '@/types';
import type { Project } from '@/types';
import type { StandardTest, SampleType } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import { listClients } from '@/lib/services/clients';
import { listProjects } from '@/lib/services/projects';
import { listSampleTypes, listStandardTests } from '@/lib/services/sample-types';
import { listInvoices, createInvoice } from '@/lib/services/invoices';
import { toast } from 'sonner';
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
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tests, setTests] = useState<StandardTest[]>([]);
  const [typeMap, setTypeMap] = useState<Record<string, string>>({});

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

  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
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
      const res = await listInvoices([
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
          listClients([Query.limit(200)]),
          listProjects([Query.limit(200)]),
          listStandardTests([Query.limit(500)]),
          listSampleTypes([Query.limit(100)]),
        ]);
        setClients(cliRes.documents);
        setProjects(projRes.documents);
        setTests(testsRes.documents);

        const map: Record<string, string> = {};
        typesRes.documents.forEach((type: SampleType) => {
          map[type.$id] = type.name;
        });
        setTypeMap(map);
      } catch {
        toast.error('فشل تحميل البيانات');
      }
    })();
  }, []);

  const groupedTests = () => {
    const groups: Record<string, StandardTest[]> = {};
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
      let isSuccess = false;
      let nextNumberStr = await generateInvoiceNumber();
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          await createInvoice(nextNumberStr, {
            invoiceNumber: nextNumberStr,
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
          isSuccess = true;
    } catch (err: unknown) {
      const appwriteErr = err as { code?: number; message?: string };
      if (appwriteErr.code === 409) {
            attempts++;
            const year = new Date().getFullYear();
            const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
            nextNumberStr = `INV-${year}-${String(lastNum + 1).padStart(4, '0')}`;
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        toast.success('تم إنشاء الفاتورة بنجاح');
        router.push('/dashboard/finance/invoices');
      } else {
        throw new Error('تعذر توليد رقم فاتورة فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="إنشاء فاتورة جديدة" maxWidth="max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="العميل" value={clientId} onChange={e => setClientId(e.target.value)} required>
                <option value="">اختر العميل</option>
                {clients.map(c => <option key={c.$id} value={c.$id}>{c.name}</option>)}
              </SelectField>
              <SelectField label="المشروع (اختياري)" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">بدون مشروع</option>
                {projects.map(p => <option key={p.$id} value={p.$id}>{p.name}</option>)}
              </SelectField>
              <TextField label="تاريخ الإصدار" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
              <TextField label="تاريخ الاستحقاق" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-lg">البنود</h2>
                <button type="button" onClick={addItem} className="bg-petrol text-white px-3 py-1 rounded flex items-center gap-1">
                  <Plus size={16} /> إضافة بند
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-concrete-500 text-sm">لا توجد بنود. اضغط &ldquo;إضافة بند&rdquo;.</p>
              ) : (
                <div className="overflow-x-auto border rounded">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-concrete-50">
                        <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الفحص (الخدمة)</th>
                        <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الكمية</th>
                        <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">السعر</th>
                        <th className="p-3 text-right text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الإجمالي</th>
                        <th className="p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3">
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
                          <td className="p-3">
                            <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-20 border p-1 rounded" />
                          </td>
                          <td className="p-3">{item.price.toFixed(2)} ₪</td>
                          <td className="p-3 font-bold">{item.total.toFixed(2)} ₪</td>
                          <td className="p-3">
                            <button type="button" onClick={() => removeItem(idx)} className="text-danger"><X size={16} /></button>
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

            <TextAreaField label="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

            <SubmitButton loading={loading} className="w-full">إنشاء الفاتورة</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
