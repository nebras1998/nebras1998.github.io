'use client';

import type { ButtonHTMLAttributes } from 'react';

export default function SubmitButton({
  loading = false,
  loadingText = 'جارٍ الحفظ...',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`bg-petrol text-white py-3 rounded-xl font-bold hover:bg-petrol-dark transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}
