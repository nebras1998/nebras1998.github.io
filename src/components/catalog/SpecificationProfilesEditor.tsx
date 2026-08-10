'use client';

import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import TextField from '@/components/TextField';
import type { ResultFieldDef, SpecificationProfile, TestLimit, TestResultType } from '@/lib/test-config';
import { initialLimits, numOrUndef } from './limit-utils';

// Accordion editor for specification profiles. The limit rows are derived from
// the result type: dual_age uses programmatic age7/age28 keys, multi_field
// auto-binds one limit row per result field, single/multi_no_age use one row.
export default function SpecificationProfilesEditor({
  profiles,
  resultType,
  resultFields,
  onChange,
}: {
  profiles: SpecificationProfile[];
  resultType: TestResultType;
  resultFields: ResultFieldDef[];
  onChange: (profiles: SpecificationProfile[]) => void;
}) {
  const [openIndex, setOpenIndex] = useState(0);

  const updateProfile = (i: number, patch: Partial<SpecificationProfile>) =>
    onChange(profiles.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const updateLimit = (i: number, li: number, patch: Partial<TestLimit>) =>
    onChange(
      profiles.map((p, idx) =>
        idx === i ? { ...p, limits: p.limits.map((l, lix) => (lix === li ? { ...l, ...patch } : l)) } : p
      )
    );

  const addProfile = () =>
    onChange([...profiles, { name: '', specification: '', unit: '', limits: initialLimits(resultType, resultFields) }]);

  const removeProfile = (i: number) => onChange(profiles.filter((_, idx) => idx !== i));

  const limitField = (i: number, li: number, label: string, value: number | undefined, onValue: (v: number | undefined) => void) => (
    <div className="flex-1">
      <TextField
        label={label}
        type="number"
        step="0.01"
        value={value === undefined ? '' : value}
        inputClassName="text-sm"
        onChange={(e) => onValue(numOrUndef(e.target.value))}
      />
    </div>
  );

  const renderLimits = (p: SpecificationProfile, i: number) => {
    if (resultType === 'dual_age') {
      const labels = [
        { key: 'age7', title: 'عمر 7 أيام' },
        { key: 'age28', title: 'عمر 28 يوم' },
      ];
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {labels.map(({ key, title }, li) => {
            const l = p.limits[li];
            return (
              <div key={key} className="border border-concrete-100 rounded-lg p-3">
                <p className="text-sm font-bold mb-2">{title}</p>
                <div className="flex gap-2">
                  {limitField(i, li, 'الحد الأدنى', l?.min, (v) => updateLimit(i, li, { min: v }))}
                  {limitField(i, li, 'الحد الأقصى', l?.max, (v) => updateLimit(i, li, { max: v }))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (resultType === 'multi_field') {
      return (
        <div className="space-y-2">
          {resultFields.length === 0 && (
            <p className="text-sm text-concrete-500">أضف حقول النتائج أولًا لتحديد حدود المطابقة لكل حقل.</p>
          )}
          {resultFields.map((f, li) => {
            const l = p.limits[li];
            return (
              <div key={f.key} className="border border-concrete-100 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">
                  {f.label || f.key} <span className="text-concrete-400 text-xs font-mono">({f.key})</span>
                </p>
                <div className="flex gap-2">
                  {limitField(i, li, 'الحد الأدنى', l?.min, (v) => updateLimit(i, li, { min: v }))}
                  {limitField(i, li, 'الحد الأقصى', l?.max, (v) => updateLimit(i, li, { max: v }))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const l = p.limits[0];
    return (
      <div className="flex gap-2 max-w-md">
        {limitField(i, 0, 'الحد الأدنى', l?.min, (v) => updateLimit(i, 0, { min: v }))}
        {limitField(i, 0, 'الحد الأقصى', l?.max, (v) => updateLimit(i, 0, { max: v }))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {profiles.length === 0 && (
        <p className="text-sm text-concrete-500">
          أضف مواصفات (مثل «تصميم C25») مع حدود المطابقة ليُقيّم الفحص تلقائيًا كـ «مطابق» أو «غير مطابق».
        </p>
      )}
      {profiles.map((p, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border border-concrete-200 rounded-xl overflow-hidden bg-white">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold truncate">{p.name || `المواصفة ${i + 1}`}</span>
                {p.specification && <span className="text-sm text-concrete-500 truncate">({p.specification})</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProfile(i);
                  }}
                  className="text-danger p-1 hover:bg-danger-bg rounded-lg"
                  title="حذف المواصفة"
                >
                  <X size={16} />
                </button>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
            {isOpen && (
              <div className="px-4 py-3 border-t space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <TextField label="اسم المواصفة" value={p.name} onChange={(e) => updateProfile(i, { name: e.target.value })} placeholder="تصميم C25" />
                  <TextField label="رقم المواصفة" value={p.specification || ''} onChange={(e) => updateProfile(i, { specification: e.target.value })} dir="ltr" inputClassName="text-sm" placeholder="ASTM C39" />
                  <TextField label="الوحدة" value={p.unit || ''} onChange={(e) => updateProfile(i, { unit: e.target.value })} dir="ltr" inputClassName="text-sm" placeholder="kg/cm2" />
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-bold text-sm mb-2">حدود المطابقة</h4>
                  {renderLimits(p, i)}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={addProfile} className="text-petrol text-sm flex items-center gap-1 hover:underline">
        <Plus size={14} /> إضافة مواصفة
      </button>
    </div>
  );
}
