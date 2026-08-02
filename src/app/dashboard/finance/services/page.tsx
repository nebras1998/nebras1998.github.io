'use client';

import { useEffect, useState } from 'react';
import type { SampleType, StandardTest } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import { listSampleTypes, listStandardTests, updateStandardTest } from '@/lib/services/sample-types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';
import { Edit, Save, X } from 'lucide-react';

export default function ServicesPage() {
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [testsByType, setTestsByType] = useState<Record<string, StandardTest[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<{ testId: string; price: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const typesRes = await listSampleTypes([Query.limit(100)]);
        const types = typesRes.documents;

        const allTests: Record<string, StandardTest[]> = {};
        for (const type of types) {
          const testsRes = await listStandardTests([
            Query.equal('sampleTypeId', type.$id),
            Query.limit(50),
          ]);
          allTests[type.$id] = testsRes.documents;
        }

        setSampleTypes(types);
        setTestsByType(allTests);
      } catch {
        toast.error('فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const startEditing = (testId: string, currentPrice: number) => {
    setEditingPrice({ testId, price: String(currentPrice || 0) });
  };

  const cancelEditing = () => {
    setEditingPrice(null);
  };

  const savePrice = async (testId: string) => {
    if (!editingPrice || editingPrice.testId !== testId) return;
    try {
      const newPrice = parseFloat(editingPrice.price) || 0;
      await updateStandardTest(testId, { price: newPrice });
      toast.success('تم تحديث السعر');
      setTestsByType(prev => {
        const updated = { ...prev };
        for (const typeId in updated) {
          updated[typeId] = updated[typeId].map(test =>
            test.$id === testId ? { ...test, price: newPrice } : test
          );
        }
        return updated;
      });
      setEditingPrice(null);
    } catch (err: unknown) {
      toast.error('فشل تحديث السعر: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">الخدمات والأسعار</h1>
          {loading ? (
            <p className="text-center text-concrete-500">جارٍ تحميل البيانات...</p>
          ) : (
            <div className="space-y-6">
              {sampleTypes.map(type => {
                const tests = testsByType[type.$id] || [];
                if (tests.length === 0) return null;
                return (
                  <div key={type.$id} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-concrete-50 px-4 py-3 border-b font-bold text-lg">
                      {type.name}
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-concrete-50 border-b text-sm">
                          <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الفحص</th>
                          <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المواصفة</th>
                          <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الوحدة</th>
                          <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">السعر (₪)</th>
                          <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">تعديل السعر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map(test => (
                          <tr key={test.$id} className="border-b hover:bg-concrete-50">
                            <td className="p-3">{test.name}</td>
                            <td className="p-3 text-sm">{test.specification || '-'}</td>
                            <td className="p-3 text-sm">{test.unit || '-'}</td>
                            <td className="p-3 font-bold text-success">
                              {(test.price || 0).toFixed(2)} ₪
                            </td>
                            <td className="p-3">
                              {editingPrice?.testId === test.$id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingPrice?.price || ''}
                                    onChange={(e) => {
                                      if (editingPrice) {
                                        setEditingPrice({ testId: editingPrice.testId, price: e.target.value });
                                      }
                                    }}
                                    className="w-24 border p-1 rounded text-sm"
                                    autoFocus
                                  />
                                  <button onClick={() => savePrice(test.$id)} className="text-petrol hover:text-success" title="حفظ">
                                    <Save size={18} />
                                  </button>
                                  <button onClick={cancelEditing} className="text-danger hover:text-danger" title="إلغاء">
                                    <X size={18} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => startEditing(test.$id, test.price || 0)} className="text-petrol hover:underline flex items-center gap-1 text-sm">
                                  <Edit size={14} /> تعديل
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {Object.values(testsByType).every(arr => arr.length === 0) && (
                <p className="text-center text-concrete-500">لا توجد خدمات حتى الآن. قم بإدخال أنواع العينات والفحوصات أولاً.</p>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
