'use client';

import type { TextareaHTMLAttributes } from 'react';

const FIELD_CLASS =
  'w-full border border-concrete-200 p-3 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-petrol transition-colors bg-concrete-0';

export default function TextAreaField({
  label,
  required,
  id,
  rows = 3,
  className = '',
  textareaClassName = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; textareaClassName?: string }) {
  const textareaId = id || (label ? `textarea-field-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={textareaId} className="block mb-1.5 text-concrete-800 font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <textarea id={textareaId} required={required} rows={rows} className={`${FIELD_CLASS} ${textareaClassName}`} {...props} />
    </div>
  );
}
