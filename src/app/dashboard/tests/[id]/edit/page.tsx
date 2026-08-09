'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Sample } from '@/types';
import type { StandardTest } from '@/lib/services';
import type { Employee } from '@/types';
import { getTest, updateTest } from '@/lib/services/tests';
import { listSamples } from '@/lib/services/samples';
import { listEmployees } from '@/lib/services/employees';
import { listSampleTypes, listStandardTests } from '@/lib/services/sample-types';
import { deleteFile, createFile, getFileViewUrl } from '@/lib/services/files';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import TableSkeleton from '@/components/TableSkeleton';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import Breadcrumb from '@/components/Breadcrumb';

import { toast } from 'sonner';

import { FileDown, X, Plus } from 'lucide-react';
import {
  getTestResultType,
  parseResultFields,
  parseSpecificationProfiles,
  parseAppliedStandard,
  serializeResultFields,
  serializeAppliedStandard,
  evaluateCompliance,
  type ResultFieldDef,
  type SpecificationProfile,
  type TestResultType,
} from '@/lib/test-config';

export default function EditTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;

  const [samples, setSamples] = useState<Sample[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [standardTests, setStandardTests] = useState<StandardTest[]>([]);

  const [formData, setFormData] = useState({
    testName: '', sampleId: '', projectId: '', clientId: '', status: 'قيد الانتظار',
    result: '', unit: '', specification: '', assignedTo: '', notes: '', reportFileId: '',
    completedAt: '', resultType: '',
  });

  const [age7Results, setAge7Results] = useState<string[]>([]);
  const [age28Results, setAge28Results] = useState<string[]>([]);
  const [test7Date, setTest7Date] = useState('');
  const [test28Date, setTest28Date] = useState('');

  const [cubeResults, setCubeResults] = useState<string[]>([]);

  // --- نتائج متعددة الحقول (multi_field) ---
  const [resultFields, setResultFields] = useState<ResultFieldDef[]>([]);
  const [resultFieldsValues, setResultFieldsValues] = useState<Record<string, string>>({});

  // --- معايير المواصفات والمعيار المطبق ---
  const [specProfiles, setSpecProfiles] = useState<SpecificationProfile[]>([]);
  const [selectedProfileName, setSelectedProfileName] = useState('');
  const [appliedStandard, setAppliedStandard] = useState<SpecificationProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resultType: TestResultType = getTestResultType(formData.testName, formData.resultType);
  const isDualAge = resultType === 'dual_age';
  const isMultiResult = resultType === 'multi_no_age';
  const isMultiField = resultType === 'multi_field';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [test, samplesRes, employeesRes] = await Promise.all([
          getTest(testId),
          listSamples([Query.limit(200)]),
          listEmployees([Query.equal('status', 'يعمل'), Query.limit(200)]),
        ]);
        setFormData({
          testName: test.testName, sampleId: test.sampleId || '', projectId: test.projectId || '', clientId: test.clientId || '',
          status: test.status, result: test.result || '', unit: test.unit || '', specification: test.specification || '',
          assignedTo: test.assignedTo || '', notes: test.notes || '', reportFileId: test.reportFileId || '',
          completedAt: test.completedAt || '', resultType: test.resultType || '',
        });
        setSamples(samplesRes.documents);
        setEmployees(employeesRes.documents);

        // استعادة نتائج الأعمار
        if (test.result7Days) { try { setAge7Results(JSON.parse(test.result7Days).map(String)); } catch { setAge7Results(['', '', '']); } } else setAge7Results(['', '', '']);
        if (test.result28Days) { try { setAge28Results(JSON.parse(test.result28Days).map(String)); } catch { setAge28Results(['', '', '']); } } else setAge28Results(['', '', '']);
        setTest7Date(test.test7Date || '');
        setTest28Date(test.test28Date || '');

        if (test.results) { try { setCubeResults(JSON.parse(test.results).map(String)); } catch { setCubeResults([]); } }

        // تعبئة حقول multi_field والمواصفة المطبقة
        setResultFields(parseResultFields(test.resultFields));
        setAppliedStandard(parseAppliedStandard(test.appliedStandard));
        if (test.resultFieldsValues) {
          try { setResultFieldsValues(JSON.parse(test.resultFieldsValues)); } catch { setResultFieldsValues({}); }
        }

        if (test.reportFileId) setExistingFileUrl(getFileViewUrl(test.reportFileId));

        if (test.sampleId) {
          const sample = samplesRes.documents.find((s: Sample) => s.$id === test.sampleId);
          if (sample) {
            const typeRes = await listSampleTypes([Query.equal('name', sample.type), Query.limit(1)]);
            if (typeRes.documents.length > 0) {
              const testsRes = await listStandardTests([Query.equal('sampleTypeId', typeRes.documents[0].$id), Query.limit(50)]);
              setStandardTests(testsRes.documents);
              const matched = testsRes.documents.find((t: StandardTest) => t.name === test.testName);
              const profiles = matched ? parseSpecificationProfiles(matched.specificationProfiles) : [];
              const applied = parseAppliedStandard(test.appliedStandard);
              if (applied && !profiles.some((p) => p.name === applied.name)) profiles.unshift(applied);
              setSpecProfiles(profiles);
              if (applied) setSelectedProfileName(applied.name);
            }
          }
        }
      } catch (err: unknown) { toast.error('خطأ في جلب بيانات الفحص: ' + (err instanceof Error ? err.message : String(err))); } finally { setLoading(false); }
    };
    fetchData();
  }, [testId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTestSelect = (test: StandardTest) => {
    setFormData((prev) => ({
      ...prev,
      testName: test.name,
      resultType: test.resultType || '',
      specification: test.specification || '',
      unit: test.unit || '',
    }));
    setResultFields(parseResultFields(test.resultFields));
    setSpecProfiles(parseSpecificationProfiles(test.specificationProfiles));
    setSelectedProfileName('');
    setAppliedStandard(null);
    setCubeResults([]);
    setResultFieldsValues({});
  };

  const handleProfileSelect = (name: string) => {
    setSelectedProfileName(name);
    const profile = specProfiles.find((p) => p.name === name);
    setAppliedStandard(profile ?? null);
    if (profile) {
      setFormData((prev) => ({ ...prev, specification: profile.specification || '', unit: profile.unit || '' }));
    }
  };

  const updateResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => setter((prev: string[]) => { const n = [...prev]; n[index] = value; return n; });
  const addResult = (setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((prev: string[]) => [...prev, '']);
  const removeResult = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => setter((prev: string[]) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  const calcAvg = (vals: string[]) => {
    // filter blank cells before numeric conversion — Number('') === 0 would otherwise
    // silently pull the average down
    const nums = vals.filter((v) => v.trim() !== '').map(Number).filter((n) => !isNaN(n));
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); };
  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return formData.reportFileId;
    setUploading(true);
    try {
      if (formData.reportFileId) { try { await deleteFile(formData.reportFileId); } catch {} }
      const result = await createFile(selectedFile);
      return result.$id;
      } catch (err: unknown) { toast.error('فشل رفع الملف: ' + (err instanceof Error ? err.message : String(err))); return null; } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const newFileId = await uploadFile();
      if (newFileId === null && selectedFile) { setSaving(false); return; }
      const payload: Record<string, unknown> = { ...formData, reportFileId: newFileId || formData.reportFileId };
      payload.resultType = resultType;
      if (resultFields.length > 0) payload.resultFields = serializeResultFields(resultFields);
      if (appliedStandard) payload.appliedStandard = serializeAppliedStandard(appliedStandard);

      let compliance: 'مطابق' | 'غير مطابق' | undefined;

      if (isDualAge) {
        const valid7 = age7Results.filter((r) => r.trim() !== '');
        const valid28 = age28Results.filter((r) => r.trim() !== '');
        payload.result7Days = JSON.stringify(valid7.map(Number));
        payload.result28Days = JSON.stringify(valid28.map(Number));
        payload.average7Days = parseFloat(calcAvg(age7Results) || '0');
        payload.average28Days = parseFloat(calcAvg(age28Results) || '0');
        payload.test7Date = test7Date;
        payload.test28Date = test28Date;
        payload.result = '';
        if (age7Results.some((r) => r.trim() !== '') || age28Results.some((r) => r.trim() !== '')) {
          compliance = evaluateCompliance('dual_age', appliedStandard, {
            average7Days: payload.average7Days as number,
            average28Days: payload.average28Days as number,
          });
        }
      } else if (isMultiField) {
        const cleanValues: Record<string, string> = {};
        for (const f of resultFields) {
          const v = (resultFieldsValues[f.key] || '').trim();
          if (v) cleanValues[f.key] = v;
        }
        payload.resultFieldsValues = JSON.stringify(cleanValues);
        payload.results = '';
        payload.result = '';
        if (Object.keys(cleanValues).length > 0) {
          compliance = evaluateCompliance('multi_field', appliedStandard, { resultFieldsValues: cleanValues });
        }
      } else if (isMultiResult) {
        const valid = cubeResults.filter(r => r.trim() !== '');
        if (!valid.length) { toast.error('أدخل نتيجة واحدة على الأقل'); setSaving(false); return; }
        payload.results = JSON.stringify(valid.map(Number));
        payload.averageResult = parseFloat(calcAvg(valid) || '0');
        payload.result = '';
        compliance = evaluateCompliance('multi_no_age', appliedStandard, { averageResult: payload.averageResult as number });
      } else {
        if (formData.result.trim() !== '') {
          compliance = evaluateCompliance('single', appliedStandard, { result: formData.result });
        }
      }

      if (compliance) payload.complianceStatus = compliance;

      await updateTest(testId, payload);
      toast.success('تم تحديث الفحص بنجاح');
      router.push('/dashboard/tests');
    } catch (err: unknown) { toast.error('خطأ في التحديث: ' + (err instanceof Error ? err.message : String(err))); setSaving(false); }
  };

  if (loading) return <AuthGuard><DashboardLayout><TableSkeleton rows={6} cols={3} /></DashboardLayout></AuthGuard>;

  return (
    <AuthGuard><DashboardLayout>
      <div className="max-w-3xl mx-auto mb-4">
        <Breadcrumb items={[{ href: '/dashboard/tests', label: 'الفحوصات' }, { label: 'تعديل الفحص' }]} />
      </div>
      <FormCard title="تعديل الفحص" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="العينة" name="sampleId" value={formData.sampleId} onChange={handleChange} required>
            <option value="">اختر العينة</option>
            {samples.map(s => <option key={s.$id} value={s.$id}>{s.sampleNumber} ({s.type})</option>)}
          </SelectField>

          {standardTests.length > 0 && (
            <div className="bg-success-bg p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-success">تغيير الفحص القياسي</h3>
              <div className="flex flex-wrap gap-2">
                {standardTests.map(test => (
                  <button type="button" key={test.$id} onClick={() => handleTestSelect(test)}
                    className={`px-3 py-1 rounded border text-sm ${formData.testName === test.name ? 'bg-petrol text-white' : 'bg-white hover:bg-concrete-100'}`}>
                    {test.name} {test.specification ? `(${test.specification})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {specProfiles.length > 0 && (
            <SelectField label="المعيار المطبق" name="appliedStandardName" value={selectedProfileName} onChange={(e) => handleProfileSelect(e.target.value)}>
              <option value="">بدون معيار محدد</option>
              {specProfiles.map((p) => (
                <option key={p.name} value={p.name}>{p.name}{p.specification ? ` (${p.specification})` : ''}</option>
              ))}
            </SelectField>
          )}

          <TextField label="اسم الفحص" name="testName" value={formData.testName} onChange={handleChange} required />

          {/* ========== فحص مقاومة الضغط ========== */}
          {isDualAge && (
            <div className="space-y-4">
              <div className="bg-petrol-soft p-4 rounded-lg">
                <h3 className="font-bold text-petrol mb-2">نتائج عمر 7 أيام</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <TextField type="date" id="age7-test-date" label="تاريخ الفحص" value={test7Date} onChange={e => setTest7Date(e.target.value)} />
                  <TextField id="age7-unit" label="الوحدة" value={formData.unit} readOnly inputClassName="bg-concrete-100" />
                </div>
                <div className="space-y-2">
                  {age7Results.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm w-16">مكعب {idx + 1}</span>
                      <input type="number" step="0.01" value={val} onChange={e => updateResult(setAge7Results, idx, e.target.value)} className="flex-1 border border-concrete-200 p-2 rounded-xl bg-concrete-0" />
                      {age7Results.length > 1 && <button type="button" onClick={() => removeResult(setAge7Results, idx)} className="text-danger"><X size={16} /></button>}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addResult(setAge7Results)} className="mt-2 text-petrol text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
                <div className="mt-2 font-bold text-success">المتوسط: {calcAvg(age7Results)}</div>
              </div>
              <div className="bg-petrol-soft p-4 rounded-lg">
                <h3 className="font-bold text-petrol mb-2">نتائج عمر 28 يوم</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <TextField type="date" id="age28-test-date" label="تاريخ الفحص" value={test28Date} onChange={e => setTest28Date(e.target.value)} />
                  <TextField id="age28-unit" label="الوحدة" value={formData.unit} readOnly inputClassName="bg-concrete-100" />
                </div>
                <div className="space-y-2">
                  {age28Results.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm w-16">مكعب {idx + 1}</span>
                      <input type="number" step="0.01" value={val} onChange={e => updateResult(setAge28Results, idx, e.target.value)} className="flex-1 border border-concrete-200 p-2 rounded-xl bg-concrete-0" />
                      {age28Results.length > 1 && <button type="button" onClick={() => removeResult(setAge28Results, idx)} className="text-danger"><X size={16} /></button>}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addResult(setAge28Results)} className="mt-2 text-petrol text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
                <div className="mt-2 font-bold text-success">المتوسط: {calcAvg(age28Results)}</div>
              </div>
            </div>
          )}

          {/* ========== فحوصات متعددة المكعبات ========== */}
          {isMultiResult && (
            <div className="bg-petrol-soft p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-petrol">نتائج المكعبات</h3>
                <button type="button" onClick={() => addResult(setCubeResults)} className="text-petrol hover:underline text-sm flex items-center gap-1"><Plus size={14} /> إضافة مكعب</button>
              </div>
              {cubeResults.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm text-concrete-500 w-20">مكعب {idx + 1}</span>
                  <input type="number" step="0.01" value={val} onChange={e => updateResult(setCubeResults, idx, e.target.value)} className="flex-1 border border-concrete-200 p-2 rounded-xl bg-concrete-0" placeholder="0" />
                  <span className="text-sm">{formData.unit || '-'}</span>
                  {cubeResults.length > 1 && <button type="button" onClick={() => removeResult(setCubeResults, idx)} className="text-danger"><X size={16} /></button>}
                </div>
              ))}
              <div className="font-bold text-success">المتوسط: {calcAvg(cubeResults)}</div>
            </div>
          )}

          {/* ========== فحوصات متعددة الحقول (multi_field) ========== */}
          {isMultiField && (
            <div className="bg-petrol-soft p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-petrol">نتائج الفحص</h3>
              {resultFields.length === 0 ? (
                <p className="text-sm text-concrete-500">لم تُعرّف حقول نتائج لهذا الفحص.</p>
              ) : (
                resultFields.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="text-sm text-concrete-500 w-24 shrink-0">{f.label}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={resultFieldsValues[f.key] || ''}
                      onChange={(e) => setResultFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="flex-1 border border-concrete-200 p-2 rounded-xl bg-concrete-0"
                      placeholder="0"
                    />
                    <span className="text-sm">{f.unit || formData.unit || '-'}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========== فحوصات عادية ========== */}
          {!isDualAge && !isMultiResult && !isMultiField && (
            <div className="grid grid-cols-2 gap-4">
              <TextField label="النتيجة" name="result" value={formData.result} onChange={handleChange} />
              <TextField label="الوحدة" name="unit" value={formData.unit} onChange={handleChange} />
            </div>
          )}

          <TextField label="المواصفة المرجعية" name="specification" value={formData.specification} onChange={handleChange} />
          <TextField type="date" label="تاريخ النتيجة (عام)" name="completedAt" value={formData.completedAt} onChange={handleChange} />
          <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required>
            <option value="قيد الانتظار">قيد الانتظار</option><option value="تحت الفحص">تحت الفحص</option><option value="مكتمل">مكتمل</option><option value="مرفوض">مرفوض</option>
          </SelectField>
          <SelectField label="المسؤول عن الفحص" name="assignedTo" value={formData.assignedTo} onChange={handleChange}>
            <option value="">بدون مسؤول</option>
            {employees.map(emp => <option key={emp.$id} value={emp.$id}>{emp.name} ({emp.jobTitle})</option>)}
          </SelectField>
          <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />

          <div className="border-t pt-4">
            <h3 className="font-bold mb-2">تقرير الفحص (PDF)</h3>
            {existingFileUrl && (
              <div className="mb-2 flex items-center gap-2">
                <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-petrol hover:underline flex items-center gap-1"><FileDown size={16} /> التقرير الحالي</a>
                <button type="button" onClick={async () => {
                  if (formData.reportFileId) { try { await deleteFile(formData.reportFileId); toast.success('تم حذف الملف'); } catch (err: unknown) { toast.error('فشل حذف الملف: ' + (err instanceof Error ? err.message : String(err))); } }
                  setExistingFileUrl(null); setFormData({...formData, reportFileId: ''}); setSelectedFile(null);
                }} className="text-danger"><X size={16} /></button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileSelect} className="border border-concrete-200 p-2 rounded-xl bg-concrete-0" />
              {selectedFile && <span className="text-sm text-concrete-500">{selectedFile.name}</span>}
            </div>
            {uploading && <p className="text-sm text-petrol mt-1">جارٍ رفع الملف...</p>}
          </div>

          <SubmitButton loading={saving} disabled={uploading} className="w-full">حفظ التعديلات</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}