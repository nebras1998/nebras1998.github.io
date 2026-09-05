'use client';

import type { TextareaHTMLAttributes } from 'react';

const FIELD_CLASS =
  'w-full border border-border bg-surface p-3 rounded-xl text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:shadow-[0_0_0_3px_rgba(26,82,118,0.1)] transition-all duration-200 resize-y';

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
        <label htmlFor={textareaId} className="block mb-1.5 text-text-primary font-semibold text-sm">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <textarea id={textareaId} required={required} rows={rows} className={`${FIELD_CLASS} ${textareaClassName}`} {...props} />
    </div>
  );
}
