'use client';

import { useState } from 'react';
import type { SampleType } from '@/lib/services/sample-types';
import TextField from '@/components/TextField';
import SelectField from '@/components/SelectField';
import TextAreaField from '@/components/TextAreaField';
import SubmitButton from '@/components/SubmitButton';
import { formatDateAr } from '@/lib/helpers';

export interface QuickAddFormValues {
  clientName: string;
  clientPhone: string;
  sampleType: string;
  projectName: string;
  notes: string;
}

const EMPTY_FORM: QuickAddFormValues = { clientName: '', clientPhone: '', sampleType: '', projectName: '', notes: '' };

export default function QuickAddBooking({
  date,
  sampleTypes,
  submitting,
  onClose,
  onSubmit,
}: {
  date: string;
  sampleTypes: SampleType[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (form: QuickAddFormValues, date: string) => void;
}) {
  const [form, setForm] = useState<QuickAddFormValues>(EMPTY_FORM);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">حجز جديد - {formatDateAr(date)}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form, date); }} className="space-y-3">
          <TextField
            name="clientName"
            label="اسم العميل"
            value={form.clientName}
            onChange={e => setForm({ ...form, clientName: e.target.value })}
            placeholder="اسم العميل"
            required
          />
          <TextField
            name="clientPhone"
            label="الهاتف"
            value={form.clientPhone}
            onChange={e => setForm({ ...form, clientPhone: e.target.value })}
            placeholder="الهاتف"
            required
          />
          <SelectField
            name="sampleType"
            label="نوع العينة"
            value={form.sampleType}
            onChange={e => setForm({ ...form, sampleType: e.target.value })}
            required
          >
            <option value="">نوع العينة</option>
            {sampleTypes.map(t => (
              <option key={t.$id} value={t.name}>{t.name}</option>
            ))}
          </SelectField>
          <TextField
            name="projectName"
            label="اسم المشروع"
            value={form.projectName}
            onChange={e => setForm({ ...form, projectName: e.target.value })}
            placeholder="اسم المشروع (اختياري)"
          />
          <TextAreaField
            name="notes"
            label="ملاحظات"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="ملاحظات"
            rows={2}
          />
          <div className="flex gap-2">
            <SubmitButton loading={submitting} className="flex-1">حفظ</SubmitButton>
            <button type="button" onClick={onClose} className="flex-1 bg-border text-text-primary py-2 rounded-lg font-bold">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}