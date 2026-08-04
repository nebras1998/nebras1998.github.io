'use client';

import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-petrol text-white hover:bg-petrol-dark',
  danger: 'bg-danger-solid text-white hover:bg-danger-solid',
};

export default function SubmitButton({
  loading = false,
  loadingText = 'جارٍ الحفظ...',
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'danger';
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`${VARIANTS[variant]} py-3 rounded-xl font-bold transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}
