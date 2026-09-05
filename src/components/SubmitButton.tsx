'use client';

import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-gradient-to-l from-primary to-primary-dark text-white hover:from-primary-dark hover:to-primary shadow-sm hover:shadow-md',
  danger: 'bg-gradient-to-l from-danger-solid to-danger-dark text-white hover:from-danger-dark hover:to-danger-solid shadow-sm hover:shadow-md',
  secondary: 'bg-surface border border-border text-text-primary hover:bg-surface-dim hover:border-border-strong',
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
  variant?: 'primary' | 'danger' | 'secondary';
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`${VARIANTS[variant]} py-3 px-6 rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingText}
        </span>
      ) : children}
    </button>
  );
}
