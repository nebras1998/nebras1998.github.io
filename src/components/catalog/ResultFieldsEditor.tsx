'use client';

import { Plus, X } from 'lucide-react';
import TextField from '@/components/TextField';
import type { ResultFieldDef } from '@/lib/test-config';

// Keys are normalized on input: lowercase + snake_case, no spaces or symbols.
const toKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]/g, '_');

export default function ResultFieldsEditor({
  fields,
  onChange,
}: {
  fields: ResultFieldDef[];
  onChange: (fields: ResultFieldDef[]) => void;
}) {
  const update = (i: number, patch: Partial<ResultFieldDef>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const add = () => onChange([...fields, { key: '', label: '', unit: '' }]);

  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));

  const keys = fields.map((f) => f.key.trim()).filter(Boolean);
  const duplicateKey = keys.find((k) => keys.filter((x) => x === k).length > 1);

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-text-muted">
          أضف حقول النتائج لهذا الفحص. المفتاح (key) يتحول تلقائيًا إلى snake_case بدون مسافات، ويجب أن يكون فريدًا.
        </p>
      )}
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end border border-border/50 rounded-lg p-2">
          <TextField
            label="المفتاح (key)"
            value={f.key}
            dir="ltr"
            inputClassName="font-mono text-sm"
            onChange={(e) => update(i, { key: toKey(e.target.value) })}
            placeholder="slump"
          />
          <TextField label="التسمية" value={f.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="نسبة الهبوط" />
          <TextField label="الوحدة" value={f.unit || ''} onChange={(e) => update(i, { unit: e.target.value })} dir="ltr" inputClassName="text-sm" placeholder="cm" />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-danger p-2 hover:bg-danger-bg rounded-lg"
            title="حذف الحقل"
          >
            <X size={18} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-primary text-sm flex items-center gap-1 hover:underline">
        <Plus size={14} /> إضافة حقل
      </button>
      {duplicateKey && (
        <p className="text-sm text-danger">المفتاح «{duplicateKey}» مكرر — يجب أن تكون المفاتيح فريدة.</p>
      )}
    </div>
  );
}
