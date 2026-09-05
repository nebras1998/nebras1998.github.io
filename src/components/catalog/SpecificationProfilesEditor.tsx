'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import TextField from '@/components/TextField';
import ConfirmModal from '@/components/ConfirmModal';
import type { ResultFieldDef, SpecificationProfile, TestLimit, TestResultType } from '@/lib/test-config';
import { initialLimits, numOrUndef } from './limit-utils';
import referenceStandardsData from '@/data/reference-standards.json';

interface ReferenceStandard {
  testNameHint: string;
  category: string;
  body: string;
  ref: string;
  unit: string;
  limits: { min: number; max: number } | null;
}

const referenceStandards = referenceStandardsData.standards as ReferenceStandard[];

const NO_LIMIT_NOTE =
  '⚠️ لا توجد حدود قبول معيارية لهذا الفحص — حدود القبول تعتمد على مواصفة التصميم الخاصة بكل مشروع، يرجى إدخالها يدويًا حسب متطلبات المشروع الحالي.';

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Scores how closely a library entry's testNameHint matches the current
// StandardTest name so the most relevant entries float to the top.
const rankScore = (testName: string, hint: string): number => {
  const t = norm(testName);
  const h = norm(hint);
  if (!t) return 0;
  if (h === t) return 5;
  if (h.includes(t)) return 4;
  if (t.includes(h)) return 3;
  const tTokens = t.split(' ').filter((w) => w.length > 1);
  const hTokens = h.split(' ').filter((w) => w.length > 1);
  const shared = tTokens.filter((w) => hTokens.includes(w)).length;
  return shared > 0 ? 1 + Math.min(shared, 2) : 0;
};

// Accordion editor for specification profiles. The limit rows are derived from
// the result type: dual_age uses programmatic age7/age28 keys, multi_field
// auto-binds one limit row per result field, single/multi_no_age use one row.
export default function SpecificationProfilesEditor({
  profiles,
  resultType,
  resultFields,
  standardTestName,
  onChange,
}: {
  profiles: SpecificationProfile[];
  resultType: TestResultType;
  resultFields: ResultFieldDef[];
  standardTestName?: string;
  onChange: (profiles: SpecificationProfile[]) => void;
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [noLimitNoteIndices, setNoLimitNoteIndices] = useState<Set<number>>(() => new Set());
  const [pendingDuplicate, setPendingDuplicate] = useState<ReferenceStandard | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const updateProfile = (i: number, patch: Partial<SpecificationProfile>) =>
    onChange(profiles.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const updateLimit = (i: number, li: number, patch: Partial<TestLimit>) =>
    onChange(
      profiles.map((p, idx) =>
        idx === i ? { ...p, limits: p.limits.map((l, lix) => (lix === li ? { ...l, ...patch } : l)) } : p
      )
    );

  const removeProfile = (i: number) => {
    onChange(profiles.filter((_, idx) => idx !== i));
    setNoLimitNoteIndices((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx === i) return;
        next.add(idx > i ? idx - 1 : idx);
      });
      return next;
    });
  };

  // A library entry only carries one verified {min,max} range; map it onto the
  // first slot of whatever rows the result type needs and leave the rest empty.
  const limitsFromRange = (range: { min: number; max: number }): TestLimit[] => {
    const base = initialLimits(resultType, resultFields);
    if (base.length === 0) return base;
    return base.map((l, li) => (li === 0 ? { ...l, min: range.min, max: range.max } : l));
  };

  const addProfile = (entry?: ReferenceStandard) => {
    if (entry) {
      const exists = profiles.some((p) => (p.specification || '').toLowerCase() === entry.ref.toLowerCase());
      if (exists) {
        setPendingDuplicate(entry);
        return;
      }
    }
    const nextIndex = profiles.length;
    const newProfile: SpecificationProfile = entry
      ? {
          name: entry.ref,
          specification: entry.ref,
          unit: entry.unit,
          limits: entry.limits ? limitsFromRange(entry.limits) : initialLimits(resultType, resultFields),
        }
      : { name: '', specification: '', unit: '', limits: initialLimits(resultType, resultFields) };
    onChange([...profiles, newProfile]);
    if (entry && !entry.limits) {
      setNoLimitNoteIndices((prev) => new Set(prev).add(nextIndex));
    }
  };

  const handleDuplicateConfirm = () => {
    if (pendingDuplicate) addProfile(pendingDuplicate);
    setPendingDuplicate(null);
  };

  const handleLibrarySelect = (entry: ReferenceStandard) => {
    setOpen(false);
    setQuery('');
    addProfile(entry);
  };

  const filteredStandards = useMemo(() => {
    const q = norm(query);
    const matches = q
      ? referenceStandards.filter((s) =>
          norm([s.body, s.ref, s.testNameHint, s.category, s.unit].join(' ')).includes(q)
        )
      : referenceStandards;
    const testName = standardTestName || '';
    return [...matches].sort((a, b) => rankScore(testName, b.testNameHint) - rankScore(testName, a.testNameHint));
  }, [query, standardTestName]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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
              <div key={key} className="border border-border/50 rounded-lg p-3">
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
            <p className="text-sm text-text-muted">أضف حقول النتائج أولًا لتحديد حدود المطابقة لكل حقل.</p>
          )}
          {resultFields.map((f, li) => {
            const l = p.limits[li];
            return (
              <div key={f.key} className="border border-border/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">
                  {f.label || f.key} <span className="text-text-muted text-xs font-mono">({f.key})</span>
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
      <div className="border border-border rounded-xl p-3 bg-surface-dim">
        <label className="block mb-1.5 text-text-primary font-medium text-sm">اختر معيارًا من المكتبة</label>
        <div ref={comboboxRef} className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="ابحث: ASTM، AASHTO، رقم المواصفة، أو اسم الفحص"
            className="w-full border border-border bg-white pl-3 pr-9 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          {open && (
            <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
              {filteredStandards.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-text-muted">
                  {query ? 'لا توجد نتائج مطابقة' : 'المكتبة فارغة حاليًا'}
                </p>
              ) : (
                filteredStandards.map((s, idx) => (
                  <button
                    key={`${s.ref}-${idx}`}
                    type="button"
                    onClick={() => handleLibrarySelect(s)}
                    className="w-full text-right px-3 py-2 border-b border-border/50 last:border-b-0 hover:bg-primary-50 transition-colors"
                  >
                    <span className="block text-sm">
                      <span className="font-bold text-primary">{s.body}</span>
                      <span className="mx-1 text-text-muted">—</span>
                      <span className="font-mono text-text-primary">{s.ref}</span>
                      {s.unit && <span className="ml-2 text-xs text-text-muted font-mono">{s.unit}</span>}
                    </span>
                    <span className="block text-xs text-text-muted truncate mt-0.5">{s.testNameHint}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          تُعبأ اسم المواصفة ورقمها ووحدتها تلقائيًا عند الاختيار، ويمكنك تعديلها لاحقًا. للمواصفات غير المتوفرة بالمكتبة
          استخدم «إضافة مواصفة» أدناه.
        </p>
      </div>
      {profiles.length === 0 && (
        <p className="text-sm text-text-muted">
          أضف مواصفات (مثل «تصميم C25») مع حدود المطابقة ليُقيّم الفحص تلقائيًا كـ «مطابق» أو «غير مطابق».
        </p>
      )}
      {profiles.map((p, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className="border border-border rounded-xl overflow-hidden bg-white">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold truncate">{p.name || `المواصفة ${i + 1}`}</span>
                {p.specification && <span className="text-sm text-text-muted truncate">({p.specification})</span>}
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
                  {noLimitNoteIndices.has(i) && (
                    <p className="mt-2 text-xs bg-warning-bg border border-warning text-warning rounded-lg p-2">
                      {NO_LIMIT_NOTE}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => addProfile()} className="text-primary text-sm flex items-center gap-1 hover:underline">
        <Plus size={14} /> إضافة مواصفة
      </button>

      <ConfirmModal
        isOpen={pendingDuplicate !== null}
        onClose={() => setPendingDuplicate(null)}
        onConfirm={handleDuplicateConfirm}
        title="إضافة مواصفة مكررة"
        message="هذا المعيار مضاف مسبقًا، هل تريد إضافته مرة أخرى؟"
        confirmText="إضافة"
        cancelText="إلغاء"
      />
    </div>
  );
}
