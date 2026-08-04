'use client';

import type { SelectHTMLAttributes } from 'react';

const FIELD_CLASS =
  'w-full border border-concrete-200 p-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-petrol transition-colors bg-concrete-0';

export default function SelectField({
  label,
  required,
  id,
  children,
  className = '',
  selectClassName = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; selectClassName?: string }) {
  const selectId = id || (label ? `select-field-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block mb-1.5 text-concrete-800 font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <select id={selectId} required={required} className={`${FIELD_CLASS} ${selectClassName}`} {...props}>
        {children}
      </select>
    </div>
  );
}
