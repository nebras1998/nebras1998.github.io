'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Sample } from '@/types';
import type { StandardTest } from '@/lib/services';
import type { Employee } from '@/types';
import { listSamples } from '@/lib/services/samples';
import { listEmployees } from '@/lib/services/employees';
import { createTest } from '@/lib/services/tests';
import { listSampleTypes, listStandardTests, type SampleType } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';

import { toast } from 'sonner';

import { generateTestNumber } from '@/lib/helpers';
import { notifyTestAssignment } from '@/lib/notifications';
import TestResultRowsEditor, { calcAvg } from '@/components/tests/TestResultRowsEditor';
import {
  getTestResultType,
  parseResultFields,
  parseSpecificationProfiles,
  serializeResultFields,
  serializeAppliedStandard,
  evaluateCompliance,
  type ResultFieldDef,
  type SpecificationProfile,
  type TestResultType,
} from '@/lib/test-config';

export default function NewTestPage() {
  const router = useRouter();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [standardTests, setStandardTests] = useState<StandardTest[]>([]);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // --- بيانات الفحص الأساسية ---
  const [formData, setFormData] = useState({
    testNumber: '',
    testName: '',
    sampleId: '',
    projectId: '',
    clientId: '',
    status: 'قيد الانتظار',
    result: '',
    unit: '',
    specification: '',
    assignedTo: '',
    notes: '',
    resultType: '',
  });

  // --- نتائج الأعمار (للخرسانة) ---
  const [age7Results, setAge7Results] = useState<string[]>(['', '', '']);
  const [age28Results, setAge28Results] = useState<string[]>(['', '', '']);
  const [test7Date, setTest7Date] = useState('');
  const [test28Date, setTest28Date] = useState('');

  // --- نتائج متعددة (للقلب الخرساني) ---
  const [cubeResults, setCubeResults] = useState<string[]>(['', '', '']);

  // --- نتائج متعددة الحقول (multi_field) ---
  const [resultFields, setResultFields] = useState<ResultFieldDef[]>([]);
  const [resultFieldsValues, setResultFieldsValues] = useState<Record<string, string>>({});

  // --- معايير المواصفات المتاحة والمعيار المطبق ---
  const [specProfiles, setSpecProfiles] = useState<SpecificationProfile[]>([]);
  const [selectedProfileName, setSelectedProfileName] = useState('');
  const [appliedStandard, setAppliedStandard] = useState<SpecificationProfile | null>(null);

  const [loading, setLoading] = useState(false);

  const resultType: TestResultType = getTestResultType(formData.testName, formData.resultType);
  const isDualAge = resultType === 'dual_age';
  const isMultiResult = resultType === 'multi_no_age';
  const isMultiField = resultType === 'multi_field';

  useEffect(() => {
    (async () => {
      try {
        const [samplesRes, employeesRes] = await Promise.all([
          listSamples([Query.orderDesc('$createdAt'), Query.limit(200)]),
          listEmployees([Query.equal('status', 'يعمل'), Query.limit(200)]),
        ]);
        setSamples(samplesRes.documents);
        setEmployees(employeesRes.documents);
      } catch { toast.error('فشل تحميل البيانات'); }
    })();
  }, []);

  // عند اختيار عينة، نحدد المشروع/العميل ونقترح التواريخ
  useEffect(() => {
    (async () => {
      if (!formData.sampleId) {
        setSelectedSample(null);
        setStandardTests([]);
        return;
      }
      const sample = samples.find((s) => s.$id === formData.sampleId);
      setSelectedSample(sample ?? null);
      if (!sample) return;
      setFormData((prev) => ({ ...prev, projectId: sample.projectId ?? '', clientId: sample.clientId ?? '', testName: '', resultType: '' }));
      setResultFields([]);
      setSpecProfiles([]);
      setSelectedProfileName('');
      setAppliedStandard(null);
      if (sample.samplingDate) {
        const d = new Date(sample.samplingDate);
        const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
        const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
        setTest7Date(d7.toISOString().split('T')[0]);
        setTest28Date(d28.toISOString().split('T')[0]);
      }
      const typeRes = await listSampleTypes([Query.equal('name', sample.type), Query.limit(1)]);
      if (typeRes.documents.length > 0) {
        const typeDoc = typeRes.documents[0] as SampleType;
        const code = (typeDoc.code as string) || 'GEN';
        const newNumber = await generateTestNumber(code);
        setFormData((prev) => ({ ...prev, testNumber: newNumber }));
        const testsRes = await listStandardTests([
          Query.equal('sampleTypeId', typeDoc.$id as string),
          Query.limit(50),
        ]);
        setStandardTests(testsRes.documents);
      }
    })();
  }, [formData.sampleId, samples]);

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
    setCubeResults(['', '', '']);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { ...formData };
      payload.resultType = resultType;
      if (resultFields.length > 0) payload.resultFields = serializeResultFields(resultFields);
      if (appliedStandard) payload.appliedStandard = serializeAppliedStandard(appliedStandard);

      let compliance: 'مطابق' | 'غير مطابق' | undefined;

      if (isDualAge) {
        // فحص مقاومة الضغط
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
        // فحوصات متعددة الحقول
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
        // فحوصات متعددة المكعبات (القلب الخرساني)
        const valid = cubeResults.filter(r => r.trim() !== '');
        if (!valid.length) { toast.error('أدخل نتيجة واحدة على الأقل'); setLoading(false); return; }
        payload.results = JSON.stringify(valid.map(Number));
        payload.averageResult = parseFloat(calcAvg(valid) || '0');
        payload.result = '';
        compliance = evaluateCompliance('multi_no_age', appliedStandard, { averageResult: payload.averageResult as number });
      } else {
        // فحوصات عادية
        payload.result = formData.result;
        if (formData.result.trim() !== '') {
          compliance = evaluateCompliance('single', appliedStandard, { result: formData.result });
        }
      }

      if (compliance) payload.complianceStatus = compliance;

      let isSuccess = false;
      let nextNumberStr = formData.testNumber;
      let attempts = 0;
      while (!isSuccess && attempts < 10) {
        try {
          payload.testNumber = nextNumberStr;
          await createTest(nextNumberStr, payload);
          isSuccess = true;
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'code' in err && (err as Record<string, unknown>).code === 409) {
            attempts++;
            if (selectedSample) {
              const res = await listSampleTypes([Query.equal('name', selectedSample.type), Query.limit(1)]);
              if (res.documents.length > 0) {
                const typeDoc = res.documents[0];
                const code = typeDoc.code || 'GEN';
                const lastNum = parseInt(nextNumberStr.split('-').pop() || '0', 10);
                nextNumberStr = `TST-${new Date().getFullYear()}-${code}-${String(lastNum + 1).padStart(5, '0')}`;
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
      if (isSuccess) {
        if (payload.assignedTo) {
          const technician = employees.find((emp) => emp.$id === payload.assignedTo);
          try {
            await notifyTestAssignment({
              testId: (payload.testNumber as string) || '',
              testName: payload.testName as string,
              technicianId: payload.assignedTo as string,
              technicianName: technician?.name || '',
            });
          } catch (err: unknown) {
            toast.warning('تم حفظ الفحص لكن فشل إرسال إشعار للفني: ' + (err instanceof Error ? err.message : String(err)));
          }
        }
        toast.success('تم إضافة الفحص بنجاح');
        router.push('/dashboard/tests');
      } else {
        throw new Error('تعذر توليد رقم فحص فريد بعد عدة محاولات.');
      }
    } catch (err: unknown) {
      toast.error('خطأ: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  return (
    <AuthGuard><DashboardLayout>
      <FormCard title="إضافة فحص جديد" maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="رقم الفحص" value={formData.testNumber} readOnly inputClassName="bg-surface-muted font-mono" />
          <SelectField label="العينة" name="sampleId" value={formData.sampleId} onChange={handleChange} required>
            <option value="">اختر العينة</option>
            {samples.map((s) => (<option key={s.$id} value={s.$id}>{s.sampleNumber} ({s.type})</option>))}
          </SelectField>

          {standardTests.length > 0 && (
            <div className="bg-success-bg p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-success">الفحوصات القياسية</h3>
              <div className="flex flex-wrap gap-2">
                {standardTests.map((test) => (
                  <button type="button" key={test.$id} onClick={() => handleTestSelect(test)}
                    className={`px-3 py-1 rounded border text-sm ${formData.testName === test.name ? 'bg-primary text-white' : 'bg-white hover:bg-surface-muted'}`}>
                    {test.name} {test.specification ? `(${test.specification})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {specProfiles.length > 0 && (
            <SelectField label="المعيار المطبق" name="appliedStandardName" value={selectedProfileName} onChange={(e) => handleProfileSelect(e.target.value)}>
              <option value="">بدون معيار محدد</option>
              {specProfiles.map((p, idx) => (
                <option key={`${p.name}-${idx}`} value={p.name}>{p.name}{p.specification ? ` (${p.specification})` : ''}</option>
              ))}
            </SelectField>
          )}

          <TextField label="اسم الفحص" name="testName" value={formData.testName} onChange={handleChange} required />

          {/* ========== نتائج الفحص حسب النوع ========== */}
          <TestResultRowsEditor
            resultType={resultType}
            unit={formData.unit}
            age7Results={age7Results}
            age28Results={age28Results}
            test7Date={test7Date}
            test28Date={test28Date}
            onAge7ResultsChange={(v) => setAge7Results(v)}
            onAge28ResultsChange={(v) => setAge28Results(v)}
            onTest7DateChange={(v) => setTest7Date(v)}
            onTest28DateChange={(v) => setTest28Date(v)}
            cubeResults={cubeResults}
            onCubeResultsChange={(v) => setCubeResults(v)}
            resultFields={resultFields}
            resultFieldsValues={resultFieldsValues}
            onResultFieldsValuesChange={(v) => setResultFieldsValues(v)}
          />

          {/* ========== فحوصات عادية ========== */}
          {!isDualAge && !isMultiResult && !isMultiField && (
            <div className="grid grid-cols-2 gap-4">
              <TextField label="النتيجة" name="result" value={formData.result} onChange={handleChange} />
              <TextField label="الوحدة" name="unit" value={formData.unit} onChange={handleChange} />
            </div>
          )}

          <TextField label="المواصفة المرجعية" name="specification" value={formData.specification} onChange={handleChange} />
          <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required>
            <option value="قيد الانتظار">قيد الانتظار</option><option value="تحت الفحص">تحت الفحص</option><option value="مكتمل">مكتمل</option><option value="مرفوض">مرفوض</option>
          </SelectField>
          <SelectField label="المسؤول عن الفحص" name="assignedTo" value={formData.assignedTo} onChange={handleChange}>
            <option value="">بدون مسؤول</option>
            {employees.map((emp) => (<option key={emp.$id} value={emp.$id}>{emp.name} ({emp.jobTitle})</option>))}
          </SelectField>
          <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
          <SubmitButton loading={loading} className="w-full">حفظ الفحص</SubmitButton>
        </form>
      </FormCard>
    </DashboardLayout></AuthGuard>
  );
}