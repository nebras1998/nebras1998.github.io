'use client';

import { useState, useEffect } from 'react';
import { ID } from 'appwrite';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import SubmitButton from '@/components/SubmitButton';
import TableSkeleton from '@/components/TableSkeleton';
import ResultFieldsEditor from '@/components/catalog/ResultFieldsEditor';
import SpecificationProfilesEditor from '@/components/catalog/SpecificationProfilesEditor';
import { listSampleTypes, createStandardTest, updateStandardTest } from '@/lib/services/sample-types';
import type { SampleType, StandardTest } from '@/lib/services/sample-types';
import { Query } from '@/lib/services';
import {
  RESULT_TYPE_LABELS,
  parseResultFields,
  parseSpecificationProfiles,
  serializeResultFields,
  serializeSpecificationProfiles,
  type ResultFieldDef,
  type SpecificationProfile,
  type TestResultType,
} from '@/lib/test-config';
import { adaptLimits, normalizeProfileLimits } from '@/components/catalog/limit-utils';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';

const RESULT_TYPE_HINTS: Record<TestResultType, string> = {
  single: 'نتيجة رقمية واحدة تُدخل مباشرة في حقل النتيجة.',
  dual_age: 'نتيجتان لعمرين: 7 أيام و 28 يومًا (كما في مكعبات الخرسانة).',
  multi_no_age: 'نتائج متعددة (مكعبات) دون أعمار، ويُحسب المتوسط تلقائيًا.',
  multi_field: 'حقول نتائج مخصصة متعددة تُعرّفها أنت مع حدود مطابقة لكل حقل.',
};

export default function StandardTestEditor({
  mode,
  initial,
  fixedSampleTypeId,
  onSaved,
}: {
  mode: 'new' | 'edit';
  initial?: StandardTest | null;
  fixedSampleTypeId?: string;
  onSaved: () => void;
}) {
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    sampleTypeId: fixedSampleTypeId || '',
    duration: '',
    standard: '',
    specification: '',
    unit: '',
    price: '',
  });
  const [resultType, setResultType] = useState<TestResultType>('single');
  const [resultFields, setResultFields] = useState<ResultFieldDef[]>([]);
  const [profiles, setProfiles] = useState<SpecificationProfile[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await listSampleTypes([Query.limit(100)]);
        setSampleTypes(res.documents);
      } catch {
        toast.error('فشل تحميل أنواع العينات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (initial) {
        setForm({
          name: initial.name || '',
          sampleTypeId: fixedSampleTypeId || initial.sampleTypeId || '',
          duration: initial.duration || '',
          standard: initial.standard || '',
          specification: initial.specification || '',
          unit: initial.unit || '',
          price: initial.price != null ? String(initial.price) : '',
        });
        const type = (initial.resultType || 'single') as TestResultType;
        const fields = parseResultFields(initial.resultFields);
        setResultType(type);
        setResultFields(fields);
        setProfiles(parseSpecificationProfiles(initial.specificationProfiles).map((p) => normalizeProfileLimits(type, p, fields)));
      } else if (fixedSampleTypeId) {
        setForm((prev) => ({ ...prev, sampleTypeId: fixedSampleTypeId }));
      }
    })();
  }, [initial, fixedSampleTypeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleResultTypeChange = (value: string) => {
    const type = value as TestResultType;
    setResultType(type);
    setProfiles((prev) => prev.map((p) => normalizeProfileLimits(type, p, resultFields)));
  };

  const handleResultFieldsChange = (fields: ResultFieldDef[]) => {
    setResultFields(fields);
    if (resultType === 'multi_field') {
      setProfiles((prev) => prev.map((p) => ({ ...p, limits: adaptLimits('multi_field', p.limits, fields) })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.sampleTypeId) {
        toast.error('اختر نوع العينة');
        setSaving(false);
        return;
      }

      if (resultType === 'multi_field') {
        const keys = resultFields.map((f) => f.key.trim()).filter(Boolean);
        if (resultFields.length === 0) {
          toast.error('أضف حقل نتيجة واحدًا على الأقل لفحص متعدد الحقول');
          setSaving(false);
          return;
        }
        if (keys.length !== resultFields.length) {
          toast.error('كل حقل نتيجة يتطلب مفتاحًا (key)');
          setSaving(false);
          return;
        }
        if (new Set(keys).size !== keys.length) {
          toast.error('مفاتيح حقول النتائج يجب أن تكون فريدة');
          setSaving(false);
          return;
        }
      }

      if (profiles.some((p) => !p.name.trim())) {
        toast.error('كل مواصفة تحتاج اسمًا');
        setSaving(false);
        return;
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        sampleTypeId: form.sampleTypeId,
        resultType,
        resultFields: serializeResultFields(resultFields),
        specificationProfiles: serializeSpecificationProfiles(profiles),
      };
      if (form.duration.trim()) payload.duration = form.duration.trim();
      if (form.standard.trim()) payload.standard = form.standard.trim();
      if (form.specification.trim()) payload.specification = form.specification.trim();
      if (form.unit.trim()) payload.unit = form.unit.trim();
      if (form.price !== '') payload.price = Number(form.price);

      if (mode === 'edit' && initial) {
        await updateStandardTest(initial.$id, payload);
      } else {
        await createStandardTest(ID.unique(), payload);
      }

      toast.success(mode === 'edit' ? 'تم تحديث الفحص القياسي' : 'تمت إضافة الفحص القياسي');
      onSaved();
    } catch (err: unknown) {
      toast.error('خطأ في الحفظ: ' + (err instanceof Error ? err.message : String(err)));
      setSaving(false);
    }
  };

  if (loading) return <TableSkeleton rows={6} cols={2} />;

  const previewFields = resultFields.filter((f) => f.key.trim());
  const previewProfiles = profiles.filter((p) => p.name.trim());

  return (
    <FormCard title={mode === 'edit' ? 'تعديل الفحص القياسي' : 'إضافة فحص قياسي جديد'} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 4.1 الحقول الأساسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField label="اسم الفحص" name="name" value={form.name} onChange={handleChange} required placeholder="فحص مقاومة الضغط" />
          <SelectField
            label="نوع العينة"
            name="sampleTypeId"
            value={form.sampleTypeId}
            onChange={handleChange}
            required
            disabled={mode === 'new' && !!fixedSampleTypeId}
          >
            <option value="">اختر نوع العينة</option>
            {sampleTypes.map((t) => (
              <option key={t.$id} value={t.$id}>{t.name}</option>
            ))}
          </SelectField>
          <TextField label="المدة" name="duration" value={form.duration} onChange={handleChange} placeholder="مثال: 28 يوم" />
          <TextField label="المرجع المعياري" name="standard" value={form.standard} onChange={handleChange} placeholder="مثال: ASTM C39" />
          <TextField label="المواصفة الافتراضية" name="specification" value={form.specification} onChange={handleChange} />
          <TextField label="الوحدة الافتراضية" name="unit" value={form.unit} onChange={handleChange} placeholder="مثال: kg/cm2" />
          <TextField label="السعر (₪)" name="price" type="number" step="0.01" value={form.price} onChange={handleChange} />
        </div>

        {/* 4.2 نوع النتيجة */}
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">نوع النتيجة</h3>
          <SelectField
            label="كيف يُدخل الفني النتيجة؟"
            value={resultType}
            onChange={(e) => handleResultTypeChange(e.target.value)}
            required
          >
            {(Object.keys(RESULT_TYPE_LABELS) as TestResultType[]).map((k) => (
              <option key={k} value={k}>{RESULT_TYPE_LABELS[k]}</option>
            ))}
          </SelectField>
          <p className="mt-1 text-sm text-concrete-500">{RESULT_TYPE_HINTS[resultType]}</p>
        </div>

        {/* 4.3 حقول النتائج (multi_field فقط) */}
        {resultType === 'multi_field' && (
          <div className="border-t pt-4">
            <h3 className="font-bold mb-2">حقول النتائج</h3>
            <ResultFieldsEditor fields={resultFields} onChange={handleResultFieldsChange} />
          </div>
        )}

        {/* 4.4 معايير المواصفات */}
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">معايير المواصفات</h3>
          <SpecificationProfilesEditor profiles={profiles} resultType={resultType} resultFields={resultFields} standardTestName={form.name} onChange={setProfiles} />
        </div>

        {/* 4.5 معاينة حية */}
        {(previewFields.length > 0 || previewProfiles.length > 0 || resultType) && (
          <div className="border-t pt-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Eye size={16} /> معاينة تعريف الفحص
            </h3>
            <div className="bg-concrete-50 rounded-lg p-4 text-sm space-y-1">
              <p>
                <span className="text-concrete-500">نوع النتيجة:</span>{' '}
                {RESULT_TYPE_LABELS[resultType]}
              </p>
              {resultType === 'multi_field' && previewFields.length > 0 && (
                <p>
                  <span className="text-concrete-500">الحقول:</span>{' '}
                  {previewFields.map((f) => `${f.label}${f.unit ? ` (${f.unit})` : ''}`).join('، ')}
                </p>
              )}
              {previewProfiles.length > 0 && (
                <p>
                  <span className="text-concrete-500">المواصفات:</span>{' '}
                  {previewProfiles.map((p) => `${p.name}${p.specification ? ` (${p.specification})` : ''}`).join('، ')}
                </p>
              )}
            </div>
          </div>
        )}

        <SubmitButton loading={saving} className="w-full">
          {mode === 'edit' ? 'حفظ التعديلات' : 'إضافة الفحص'}
        </SubmitButton>
      </form>
    </FormCard>
  );
}
