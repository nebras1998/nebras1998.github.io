'use client';

import { useEffect, useState, Fragment } from 'react';
import type { SampleType, StandardTest } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import { listSampleTypes, listStandardTests, updateStandardTest } from '@/lib/services/sample-types';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/Card';
import { toast } from 'sonner';
import EmptyData from '@/components/EmptyData';
import TableSkeleton from '@/components/TableSkeleton';
import { Edit, Save, X, Plus, Settings } from 'lucide-react';
import {
  parseResultFields,
  parseSpecificationProfiles,
  serializeResultFields,
  serializeSpecificationProfiles,
  RESULT_TYPE_LABELS,
  type ResultFieldDef,
  type SpecificationProfile,
  type TestLimit,
  type TestResultType,
} from '@/lib/test-config';

type LimitDraft = { key: string; min: string; max: string };
type ProfileDraft = { name: string; specification: string; unit: string; limits: LimitDraft[] };
type ConfigDraft = {
  testId: string;
  resultType: TestResultType;
  resultFields: ResultFieldDef[];
  profiles: ProfileDraft[];
};

export default function ServicesPage() {
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [testsByType, setTestsByType] = useState<Record<string, StandardTest[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingPrice, setEditingPrice] = useState<{ testId: string; price: string } | null>(null);
  const [configDraft, setConfigDraft] = useState<ConfigDraft | null>(null);

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

  // ---------- إعدادات نتائج الفحص القياسي ----------
  const startConfig = (test: StandardTest) => {
    setConfigDraft({
      testId: test.$id,
      resultType: (test.resultType || 'single') as TestResultType,
      resultFields: parseResultFields(test.resultFields),
      profiles: parseSpecificationProfiles(test.specificationProfiles).map(p => ({
        name: p.name,
        specification: p.specification || '',
        unit: p.unit || '',
        limits: p.limits.map(l => ({
          key: l.key || '',
          min: l.min !== undefined ? String(l.min) : '',
          max: l.max !== undefined ? String(l.max) : '',
        })),
      })),
    });
  };

  const saveConfig = async () => {
    if (!configDraft) return;
    try {
      const resultFields = configDraft.resultFields.filter((f) => f.key.trim() && f.label.trim());
      const profiles: SpecificationProfile[] = configDraft.profiles
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          specification: p.specification.trim() || undefined,
          unit: p.unit.trim() || undefined,
          limits: p.limits
            .map((l): TestLimit => {
              const min = parseFloat(l.min);
              const max = parseFloat(l.max);
              return {
                key: l.key.trim() || undefined,
                min: isNaN(min) ? undefined : min,
                max: isNaN(max) ? undefined : max,
              };
            })
            .filter((l) => l.min !== undefined || l.max !== undefined),
        }));
      const resultFieldsJson = serializeResultFields(resultFields);
      const profilesJson = serializeSpecificationProfiles(profiles);
      await updateStandardTest(configDraft.testId, {
        resultType: configDraft.resultType,
        resultFields: resultFieldsJson,
        specificationProfiles: profilesJson,
      });
      toast.success('تم حفظ إعدادات الفحص');
      setTestsByType(prev => {
        const updated = { ...prev };
        for (const typeId in updated) {
          updated[typeId] = updated[typeId].map(t =>
            t.$id === configDraft.testId
              ? { ...t, resultType: configDraft.resultType, resultFields: resultFieldsJson, specificationProfiles: profilesJson }
              : t
          );
        }
        return updated;
      });
      setConfigDraft(null);
    } catch (err: unknown) {
      toast.error('فشل حفظ الإعدادات: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const updateResultField = (idx: number, patch: Partial<ResultFieldDef>) =>
    setConfigDraft(d => (d ? { ...d, resultFields: d.resultFields.map((f, i) => (i === idx ? { ...f, ...patch } : f)) } : d));
  const addResultField = () =>
    setConfigDraft(d => (d ? { ...d, resultFields: [...d.resultFields, { key: '', label: '', unit: '' }] } : d));
  const removeResultField = (idx: number) =>
    setConfigDraft(d => (d ? { ...d, resultFields: d.resultFields.filter((_, i) => i !== idx) } : d));

  const updateProfile = (idx: number, patch: Partial<ProfileDraft>) =>
    setConfigDraft(d => (d ? { ...d, profiles: d.profiles.map((p, i) => (i === idx ? { ...p, ...patch } : p)) } : d));
  const addProfile = () =>
    setConfigDraft(d => (d ? { ...d, profiles: [...d.profiles, { name: '', specification: '', unit: '', limits: [] }] } : d));
  const removeProfile = (idx: number) =>
    setConfigDraft(d => (d ? { ...d, profiles: d.profiles.filter((_, i) => i !== idx) } : d));

  const updateLimit = (pIdx: number, lIdx: number, patch: Partial<LimitDraft>) =>
    setConfigDraft(d =>
      d
        ? {
            ...d,
            profiles: d.profiles.map((p, i) =>
              i === pIdx ? { ...p, limits: p.limits.map((l, j) => (j === lIdx ? { ...l, ...patch } : l)) } : p
            ),
          }
        : d
    );
  const addLimit = (pIdx: number) =>
    setConfigDraft(d =>
      d
        ? { ...d, profiles: d.profiles.map((p, i) => (i === pIdx ? { ...p, limits: [...p.limits, { key: '', min: '', max: '' }] } : p)) }
        : d
    );
  const removeLimit = (pIdx: number, lIdx: number) =>
    setConfigDraft(d =>
      d
        ? { ...d, profiles: d.profiles.map((p, i) => (i === pIdx ? { ...p, limits: p.limits.filter((_, j) => j !== lIdx) } : p)) }
        : d
    );

  const inputCls = 'border border-concrete-200 p-1.5 rounded-lg bg-concrete-0 text-sm w-full';

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">الخدمات والأسعار</h1>
          {loading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : (
            <div className="space-y-6">
              {sampleTypes.map(type => {
                const tests = testsByType[type.$id] || [];
                if (tests.length === 0) return null;
                return (
                  <Card key={type.$id} className="overflow-hidden">
                    <div className="bg-concrete-50 px-4 py-3 border-b font-bold text-lg">
                      {type.name}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-concrete-50 border-b text-sm">
                            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الفحص</th>
                            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">المواصفة</th>
                            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">الوحدة</th>
                            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">السعر (₪)</th>
                            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">تعديل السعر</th>
                            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-concrete-50">إعدادات النتائج</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tests.map(test => (
                            <Fragment key={test.$id}>
                              <tr className="border-b hover:bg-concrete-50">
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
                                        className="w-24 border border-concrete-200 p-2 rounded-xl bg-concrete-0 text-sm"
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
                                <td className="p-3">
                                  <button onClick={() => (configDraft?.testId === test.$id ? setConfigDraft(null) : startConfig(test))} className="text-petrol hover:underline flex items-center gap-1 text-sm">
                                    <Settings size={14} /> {configDraft?.testId === test.$id ? 'إغلاق' : 'تكوين'}
                                  </button>
                                </td>
                              </tr>
                              {configDraft && configDraft.testId === test.$id && (
                                <tr>
                                  <td colSpan={6} className="p-4 bg-petrol-soft">
                                    <div className="space-y-4">
                                      {/* نوع النتيجة */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                          <label className="block text-sm font-bold mb-1">نوع النتيجة</label>
                                          <select
                                            value={configDraft.resultType}
                                            onChange={(e) => setConfigDraft(d => (d ? { ...d, resultType: e.target.value as TestResultType } : d))}
                                            className={inputCls}
                                          >
                                            {(Object.keys(RESULT_TYPE_LABELS) as TestResultType[]).map((k) => (
                                              <option key={k} value={k}>{RESULT_TYPE_LABELS[k]}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      {/* حقول النتائج لـ multi_field */}
                                      {configDraft.resultType === 'multi_field' && (
                                        <div className="bg-white p-3 rounded-xl border">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold text-sm">حقول النتائج</h4>
                                            <button type="button" onClick={addResultField} className="text-petrol text-sm flex items-center gap-1"><Plus size={14} /> إضافة حقل</button>
                                          </div>
                                          {configDraft.resultFields.length === 0 && (
                                            <p className="text-sm text-concrete-500">لا توجد حقول بعد.</p>
                                          )}
                                          <div className="space-y-2">
                                            {configDraft.resultFields.map((f, idx) => (
                                              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                                <div>
                                                  <label className="block text-xs text-concrete-500 mb-0.5">المفتاح (key)</label>
                                                  <input value={f.key} onChange={(e) => updateResultField(idx, { key: e.target.value })} className={inputCls} dir="ltr" placeholder="slump" />
                                                </div>
                                                <div>
                                                  <label className="block text-xs text-concrete-500 mb-0.5">التسمية</label>
                                                  <input value={f.label} onChange={(e) => updateResultField(idx, { label: e.target.value })} className={inputCls} placeholder="نسبة الهبوط" />
                                                </div>
                                                <div className="flex gap-2 items-end">
                                                  <div className="flex-1">
                                                    <label className="block text-xs text-concrete-500 mb-0.5">الوحدة</label>
                                                    <input value={f.unit || ''} onChange={(e) => updateResultField(idx, { unit: e.target.value })} className={inputCls} dir="ltr" placeholder="cm" />
                                                  </div>
                                                  <button type="button" onClick={() => removeResultField(idx)} className="text-danger p-1"><X size={18} /></button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* معايير المواصفات */}
                                      <div className="bg-white p-3 rounded-xl border">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-bold text-sm">معايير المواصفات</h4>
                                          <button type="button" onClick={addProfile} className="text-petrol text-sm flex items-center gap-1"><Plus size={14} /> إضافة معيار</button>
                                        </div>
                                        {configDraft.profiles.length === 0 && (
                                          <p className="text-sm text-concrete-500">لا توجد معايير بعد.</p>
                                        )}
                                        <div className="space-y-3">
                                          {configDraft.profiles.map((p, pIdx) => (
                                            <div key={pIdx} className="border border-concrete-100 rounded-lg p-3">
                                              <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-bold text-xs">معيار {pIdx + 1}</h5>
                                                <button type="button" onClick={() => removeProfile(pIdx)} className="text-danger p-1"><X size={18} /></button>
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div>
                                                  <label className="block text-xs text-concrete-500 mb-0.5">اسم المعيار</label>
                                                  <input value={p.name} onChange={(e) => updateProfile(pIdx, { name: e.target.value })} className={inputCls} placeholder="تصميم C25" />
                                                </div>
                                                <div>
                                                  <label className="block text-xs text-concrete-500 mb-0.5">المواصفة</label>
                                                  <input value={p.specification} onChange={(e) => updateProfile(pIdx, { specification: e.target.value })} className={inputCls} dir="ltr" placeholder="ASTM C39" />
                                                </div>
                                                <div>
                                                  <label className="block text-xs text-concrete-500 mb-0.5">الوحدة</label>
                                                  <input value={p.unit} onChange={(e) => updateProfile(pIdx, { unit: e.target.value })} className={inputCls} dir="ltr" placeholder="kg/cm2" />
                                                </div>
                                              </div>
                                              <div className="mt-2">
                                                <div className="flex items-center justify-between mb-1">
                                                  <label className="text-xs text-concrete-500">الحدود</label>
                                                  <button type="button" onClick={() => addLimit(pIdx)} className="text-petrol text-xs flex items-center gap-1"><Plus size={12} /> إضافة حد</button>
                                                </div>
                                                {p.limits.length === 0 && <p className="text-xs text-concrete-400">لا حدود (يُعرض بدون تقييم).</p>}
                                                <div className="space-y-1.5">
                                                  {p.limits.map((l, lIdx) => (
                                                    <div key={lIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                      <input value={l.key} onChange={(e) => updateLimit(pIdx, lIdx, { key: e.target.value })} className={inputCls} dir="ltr" placeholder="المفتاح (age7/age28 أو حقل)" />
                                                      <input type="number" value={l.min} onChange={(e) => updateLimit(pIdx, lIdx, { min: e.target.value })} className={inputCls} placeholder="الحد الأدنى" />
                                                      <input type="number" value={l.max} onChange={(e) => updateLimit(pIdx, lIdx, { max: e.target.value })} className={inputCls} placeholder="الحد الأعلى" />
                                                      <div className="flex gap-2">
                                                        <button type="button" onClick={() => removeLimit(pIdx, lIdx)} className="text-danger p-1"><X size={16} /></button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex gap-2 justify-end">
                                        <button
                                          onClick={() => setConfigDraft(null)}
                                          className="px-4 py-2 rounded-xl border border-concrete-200 text-sm flex items-center gap-1"
                                        >
                                          <X size={16} /> إلغاء
                                        </button>
                                        <button
                                          onClick={saveConfig}
                                          className="px-4 py-2 rounded-xl bg-petrol text-white text-sm flex items-center gap-1 hover:bg-petrol-dark"
                                        >
                                          <Save size={16} /> حفظ الإعدادات
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
              {Object.values(testsByType).every(arr => arr.length === 0) && (
                <EmptyData title="لا توجد خدمات حتى الآن. قم بإدخال أنواع العينات والفحوصات أولاً." />
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
