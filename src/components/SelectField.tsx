'use client';

import type { SelectHTMLAttributes } from 'react';

const FIELD_CLASS =
  'w-full border border-border bg-surface p-3 rounded-xl text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:shadow-[0_0_0_3px_rgba(26,82,118,0.1)] transition-all duration-200 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2012%2012%27%3E%3Cpath%20fill%3D%27%236c757d%27%20d%3D%27M6%208L1%203h10z%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[position:left_12px_center] bg-no-repeat pl-8';

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
        <label htmlFor={selectId} className="block mb-1.5 text-text-primary font-semibold text-sm">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <select id={selectId} required={required} className={`${FIELD_CLASS} ${selectClassName}`} {...props}>
        {children}
      </select>
    </div>
  );
}
