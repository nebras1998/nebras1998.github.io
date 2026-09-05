'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listSamples, createSample } from '@/lib/services/samples';
import { listProjects } from '@/lib/services/projects';
import { listEmployees } from '@/lib/services/employees';
import { listSampleTypes, listStandardTests } from '@/lib/services/sample-types';
import { createTest } from '@/lib/services/tests';
import { Query } from '@/lib/services';
import type { Project, Employee } from '@/types';
import type { SampleType, StandardTest } from '@/lib/services';
import { generateTestNumber } from '@/lib/helpers';
import AuthGuard from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import FormCard from '@/components/FormCard';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { toast } from 'sonner';

export default function NewSamplePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [technicians, setTechnicians] = useState<Employee[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [standardTests, setStandardTests] = useState<StandardTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedTypeCode, setSelectedTypeCode] = useState('GEN');

  const [formData, setFormData] = useState({
    sampleNumber: '',
    type: 'خرسانة',
    projectId: '',
    clientId: '',
    status: 'تم الاستلام',
    samplingDate: '',
    preparationDate: '',
    deliveryDate: '',
    samplerId: '',
    preparerId: '',
    transporterId: '',
    test7DaysDate: '',
    test28DaysDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [generatingNumber, setGeneratingNumber] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [projRes, techRes, typesRes] = await Promise.all([
          listProjects([Query.limit(200)]),
          listEmployees([
            Query.equal('role', 'فني'),
            Query.equal('status', 'يعمل'),
            Query.limit(100),
          ]),
          listSampleTypes([Query.limit(100)]),
        ]);
        setProjects(projRes.documents);
        setTechnicians(techRes.documents);
        setSampleTypes(typesRes.documents);
      } catch {
        toast.error('فشل تحميل البيانات الأساسية');
      }
    })();
  }, []);

  useEffect(() => {
    if (formData.type) {
      (async () => {
        setGeneratingNumber(true);
        const selectedType = sampleTypes.find(t => t.name === formData.type);
        const code = selectedType?.code || 'GEN';
        setSelectedTypeCode(code);

        const currentYear = new Date().getFullYear();
        const prefix = `LAB-${currentYear}-${code}-`;

        let nextNumber = 1;
        try {
          const response = await listSamples([
            Query.startsWith('sampleNumber', prefix),
            Query.orderDesc('sampleNumber'),
            Query.limit(1),
          ]);
          if (response.documents.length > 0) {
            const lastNumber = response.documents[0].sampleNumber.split('-').pop();
            if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
          }
        } catch {}

        let isUnique = false;
        let newNumber = '';
        while (!isUnique) {
          const padded = String(nextNumber).padStart(5, '0');
          newNumber = `${prefix}${padded}`;
          try {
            const check = await listSamples([
              Query.equal('sampleNumber', newNumber),
              Query.limit(1),
            ]);
            if (check.documents.length === 0) isUnique = true;
            else nextNumber++;
          } catch { isUnique = true; }
        }

        setFormData((prev) => ({ ...prev, sampleNumber: newNumber }));
        if (selectedType) {
          const res = await listStandardTests([
            Query.equal('sampleTypeId', selectedType.$id),
            Query.limit(50),
          ]);
          setStandardTests(res.documents);
        } else {
          setStandardTests([]);
        }
        setSelectedTests([]);
        setGeneratingNumber(false);
      })();
    }
  }, [formData.type, sampleTypes]);

  const updateTestDates = useCallback((type: string, samplingDate: string) => {
    if (type === 'خرسانة' && samplingDate) {
      const d = new Date(samplingDate);
      const d7 = new Date(d); d7.setDate(d7.getDate() + 7);
      const d28 = new Date(d); d28.setDate(d28.getDate() + 28);
      return { test7DaysDate: d7.toISOString().split('T')[0], test28DaysDate: d28.toISOString().split('T')[0] };
    } else if (type !== 'خرسانة') {
      return { test7DaysDate: '', test28DaysDate: '' };
    }
    return {};
  }, []);

  const toggleTestSelection = (testId: string) => {
    setSelectedTests(prev =>
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'projectId') {
        const project = projects.find((p) => p.$id === value);
        newData.clientId = project?.clientId || '';
      }
      if (name === 'samplingDate' || name === 'type') {
        const dates = updateTestDates(name === 'type' ? value : prev.type, name === 'samplingDate' ? value : prev.samplingDate);
        Object.assign(newData, dates);
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let sample = null;
      let sampleNumberStr = formData.sampleNumber;
      let sampleAttempts = 0;
      while (!sample && sampleAttempts < 10) {
        try {
          sample = await createSample(sampleNumberStr, { ...formData, sampleNumber: sampleNumberStr });
        } catch (err: unknown) {
          const appwriteErr = err as { code?: number };
          if (appwriteErr.code === 409) {
            sampleAttempts++;
            const currentYear = new Date().getFullYear();
            const selectedType = sampleTypes.find(t => t.name === formData.type);
            const code = selectedType?.code || 'GEN';
            const lastNum = parseInt(sampleNumberStr.split('-').pop() || '0', 10);
            sampleNumberStr = `LAB-${currentYear}-${code}-${String(lastNum + 1).padStart(5, '0')}`;
          } else {
            throw err;
          }
        }
      }

      if (!sample) {
        throw new Error('تعذر توليد رقم عينة فريد بعد عدة محاولات.');
      }

      if (selectedTests.length > 0) {
        for (const testId of selectedTests) {
          const stdTest = standardTests.find(t => t.$id === testId);
          if (stdTest) {
            let testCreated = null;
            let testNumberStr = await generateTestNumber(selectedTypeCode);
            let testAttempts = 0;
            while (!testCreated && testAttempts < 10) {
              try {
                testCreated = await createTest(testNumberStr, {
                  testNumber: testNumberStr,
                  testName: stdTest.name,
                  sampleId: sample.$id,
                  projectId: formData.projectId,
                  clientId: formData.clientId,
                  status: 'قيد الانتظار',
                  unit: stdTest.unit || '',
                  specification: stdTest.specification || '',
                  assignedTo: formData.samplerId || formData.preparerId || '',
                  notes: '',
                });
              } catch (err: unknown) {
                const appwriteErr = err as { code?: number };
                if (appwriteErr.code === 409) {
                  testAttempts++;
                  const currentYear = new Date().getFullYear();
                  const lastNum = parseInt(testNumberStr.split('-').pop() || '0', 10);
                  testNumberStr = `TST-${currentYear}-${selectedTypeCode}-${String(lastNum + 1).padStart(5, '0')}`;
                } else {
                  throw err;
                }
              }
            }
          }
        }
      }
      toast.success('تم إضافة العينة والفحوصات بنجاح');
      router.push('/dashboard/samples');
    } catch (err: unknown) {
      toast.error('خطأ في إضافة العينة: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  };

  const selectedProject = projects.find((p) => p.$id === formData.projectId);

  return (
    <AuthGuard>
      <DashboardLayout>
        <FormCard title="إضافة عينة جديدة" maxWidth="max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="نوع العينة" name="type" value={formData.type} onChange={handleChange} required>
                <option value="">اختر النوع</option>
                {sampleTypes.map((t) => (
                  <option key={t.$id} value={t.name}>{t.name}</option>
                ))}
              </SelectField>
              <div>
                <TextField label="رقم العينة" value={formData.sampleNumber} readOnly inputClassName="bg-surface-muted font-mono" />
                {generatingNumber && <p className="text-sm text-text-muted">جارٍ توليد الرقم...</p>}
              </div>
            </div>

            <SelectField label="المشروع" name="projectId" value={formData.projectId} onChange={handleChange} required>
              <option value="">اختر المشروع</option>
              {projects.map((p) => (<option key={p.$id} value={p.$id}>{p.name}</option>))}
            </SelectField>

            <TextField label="العميل" value={selectedProject ? (selectedProject.clientId || 'غير معروف') : ''} readOnly inputClassName="bg-surface-muted text-text-muted" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField type="date" label="تاريخ أخذ العينة" name="samplingDate" value={formData.samplingDate} onChange={handleChange} />
              <TextField type="date" label="تاريخ تحضير العينة" name="preparationDate" value={formData.preparationDate} onChange={handleChange} />
              <TextField type="date" label="تاريخ إحضار العينة للمختبر" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} />
            </div>

            {formData.type === 'خرسانة' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary-50 p-4 rounded-lg">
                <TextField type="date" label="تاريخ فحص 7 أيام (تلقائي)" name="test7DaysDate" value={formData.test7DaysDate} onChange={handleChange} />
                <TextField type="date" label="تاريخ فحص 28 يوم (تلقائي)" name="test28DaysDate" value={formData.test28DaysDate} onChange={handleChange} />
              </div>
            )}

            {standardTests.length > 0 && (
              <div className="bg-success-bg p-4 rounded-lg">
                <h3 className="font-bold mb-2 text-success">الفحوصات المطلوبة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {standardTests.map((test) => (
                    <label key={test.$id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test.$id)}
                        onChange={() => toggleTestSelection(test.$id)}
                      />
                      {test.name} {test.specification ? `(${test.specification})` : ''}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {standardTests.length === 0 && (
              <div className="bg-surface-dim p-4 rounded-lg text-sm text-text-muted">
                لا توجد فحوصات قياسية معرّفة لهذا النوع.{' '}
                <Link href="/dashboard/catalog" className="text-primary font-medium hover:underline">
                  إدارة كتالوج الفحوصات
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField label="فني أخذ العينة" name="samplerId" value={formData.samplerId} onChange={handleChange}>
                <option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}
              </SelectField>
              <SelectField label="فني تحضير العينة" name="preparerId" value={formData.preparerId} onChange={handleChange}>
                <option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}
              </SelectField>
              <SelectField label="فني إحضار العينة" name="transporterId" value={formData.transporterId} onChange={handleChange}>
                <option value="">اختر الفني</option>{technicians.map((t) => (<option key={t.$id} value={t.$id}>{t.name}</option>))}
              </SelectField>
            </div>

            <SelectField label="الحالة" name="status" value={formData.status} onChange={handleChange} required>
              <option value="تم الاستلام">تم الاستلام</option><option value="تحت الفحص">تحت الفحص</option><option value="منجز">منجز</option><option value="مرفوض">مرفوض</option>
            </SelectField>

            <TextAreaField label="ملاحظات" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
            <SubmitButton loading={loading} className="w-full">حفظ العينة والفحوصات</SubmitButton>
          </form>
        </FormCard>
      </DashboardLayout>
    </AuthGuard>
  );
}
