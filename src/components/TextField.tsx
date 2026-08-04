'use client';

import type { InputHTMLAttributes } from 'react';

const FIELD_CLASS =
  'w-full border border-concrete-200 p-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-petrol transition-colors bg-concrete-0';

export default function TextField({
  label,
  required,
  id,
  className = '',
  inputClassName = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; inputClassName?: string }) {
  const inputId = id || (label ? `text-field-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block mb-1.5 text-concrete-800 font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <input id={inputId} required={required} className={`${FIELD_CLASS} ${inputClassName}`} {...props} />
    </div>
  );
}
