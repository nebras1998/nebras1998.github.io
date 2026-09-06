'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

const FIELD_CLASS =
  'w-full border border-border bg-surface p-3 rounded-xl text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:shadow-[0_0_0_3px_rgba(26,82,118,0.1)] transition-all duration-200';

export default function TextField({
  label,
  required,
  id,
  className = '',
  inputClassName = '',
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; inputClassName?: string; trailing?: ReactNode }) {
  const inputId = id || (label ? `text-field-${label.replace(/\s+/g, '-')}` : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block mb-1.5 text-text-primary font-semibold text-sm">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {trailing ? (
        <div className="relative" dir={props.dir}>
          <input
            id={inputId}
            required={required}
            className={`${FIELD_CLASS} ${trailing ? 'pe-12' : ''} ${inputClassName}`}
            {...props}
          />
          <div className="absolute inset-y-0 end-3 flex items-center">{trailing}</div>
        </div>
      ) : (
        <input id={inputId} required={required} className={`${FIELD_CLASS} ${inputClassName}`} {...props} />
      )}
    </div>
  );
}
