'use client';

import { Plus, X } from 'lucide-react';
import TextField from '@/components/TextField';
import type { ResultFieldDef, TestResultType } from '@/lib/test-config';

export const calcAvg = (vals: string[]) => {
  // filter blank cells before numeric conversion — Number('') === 0 would otherwise
  // silently pull the average down
  const nums = vals.filter((v) => v.trim() !== '').map(Number).filter((n) => !isNaN(n));
  return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '';
};

export interface TestResultRowsEditorProps {
  resultType: TestResultType;
  unit: string;
  age7Results: string[];
  age28Results: string[];
  test7Date: string;
  test28Date: string;
  onAge7ResultsChange: (values: string[]) => void;
  onAge28ResultsChange: (values: string[]) => void;
  onTest7DateChange: (value: string) => void;
  onTest28DateChange: (value: string) => void;
  cubeResults: string[];
  onCubeResultsChange: (values: string[]) => void;
  resultFields: ResultFieldDef[];
  resultFieldsValues: Record<string, string>;
  onResultFieldsValuesChange: (values: Record<string, string>) => void;
}

function AgePanel({
  title,
  date,
  onDateChange,
  values,
  onChange,
  unit,
}: {
  title: string;
  date: string;
  onDateChange: (value: string) => void;
  values: string[];
  onChange: (values: string[]) => void;
  unit: string;
}) {
  return (
    <div className="bg-primary-50 p-4 rounded-lg">
      <h3 className="font-bold text-primary mb-2">{title}</h3>
      <div className="mb-3">
        <TextField label="تاريخ الفحص" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
      </div>
      <div className="space-y-2">
        {values.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-sm w-16 shrink-0">مكعب {idx + 1}</span>
            <input
              type="number"
              step="0.01"
              value={val}
              onChange={(e) => {
                const next = [...values];
                next[idx] = e.target.value;
                onChange(next);
              }}
              className="flex-1 border border-border p-2 rounded-xl bg-surface"
              placeholder="0"
            />
            <span className="text-sm">{unit || '-'}</span>
            {values.length > 1 && (
              <button type="button" onClick={() => onChange(values.filter((_, i) => i !== idx))} className="text-danger"><X size={16} /></button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...values, ''])} className="mt-2 text-primary text-sm flex items-center gap-1">
        <Plus size={14} /> إضافة مكعب
      </button>
      <div className="mt-2 font-bold text-success">المتوسط: {calcAvg(values)}</div>
    </div>
  );
}

export default function TestResultRowsEditor({
  resultType,
  unit,
  age7Results,
  age28Results,
  test7Date,
  test28Date,
  onAge7ResultsChange,
  onAge28ResultsChange,
  onTest7DateChange,
  onTest28DateChange,
  cubeResults,
  onCubeResultsChange,
  resultFields,
  resultFieldsValues,
  onResultFieldsValuesChange,
}: TestResultRowsEditorProps) {
  const isDualAge = resultType === 'dual_age';
  const isMultiResult = resultType === 'multi_no_age';
  const isMultiField = resultType === 'multi_field';

  return (
    <>
      {isDualAge && (
        <div className="space-y-4">
          <AgePanel title="نتائج عمر 7 أيام" date={test7Date} onDateChange={onTest7DateChange} values={age7Results} onChange={onAge7ResultsChange} unit={unit} />
          <AgePanel title="نتائج عمر 28 يوم" date={test28Date} onDateChange={onTest28DateChange} values={age28Results} onChange={onAge28ResultsChange} unit={unit} />
        </div>
      )}

      {isMultiResult && (
        <div className="bg-primary-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-primary">نتائج المكعبات</h3>
            <button type="button" onClick={() => onCubeResultsChange([...cubeResults, ''])} className="text-primary hover:text-primary-dark font-medium transition-colors text-sm flex items-center gap-1">
              <Plus size={14} /> إضافة مكعب
            </button>
          </div>
          {cubeResults.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-sm text-text-muted w-20 shrink-0">مكعب {idx + 1}</span>
              <input
                type="number"
                step="0.01"
                value={val}
                onChange={(e) => {
                  const next = [...cubeResults];
                  next[idx] = e.target.value;
                  onCubeResultsChange(next);
                }}
                className="flex-1 border border-border p-2 rounded-xl bg-surface"
                placeholder="0"
              />
              <span className="text-sm">{unit || '-'}</span>
              {cubeResults.length > 1 && (
                <button type="button" onClick={() => onCubeResultsChange(cubeResults.filter((_, i) => i !== idx))} className="text-danger"><X size={16} /></button>
              )}
            </div>
          ))}
          <div className="font-bold text-success">المتوسط: {calcAvg(cubeResults)}</div>
        </div>
      )}

      {isMultiField && (
        <div className="bg-primary-50 p-4 rounded-lg space-y-3">
          <h3 className="font-bold text-primary">نتائج الفحص</h3>
          {resultFields.length === 0 ? (
            <p className="text-sm text-text-muted">لم تُعرّف حقول نتائج لهذا الفحص.</p>
          ) : (
            resultFields.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="text-sm text-text-muted w-24 shrink-0">{f.label}</span>
                <input
                  type="number"
                  step="0.01"
                  value={resultFieldsValues[f.key] || ''}
                  onChange={(e) => onResultFieldsValuesChange({ ...resultFieldsValues, [f.key]: e.target.value })}
                  className="flex-1 border border-border p-2 rounded-xl bg-surface"
                  placeholder="0"
                />
                <span className="text-sm">{f.unit || unit || '-'}</span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}