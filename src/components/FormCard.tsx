'use client';

import Card from '@/components/Card';

export default function FormCard({
  title,
  subtitle,
  maxWidth = 'max-w-2xl',
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`mx-auto ${maxWidth} ${className}`}>
      {title && <h1 className={`text-2xl font-bold ${subtitle ? 'mb-1' : 'mb-6'}`}>{title}</h1>}
      {subtitle && <p className="mb-6 text-sm text-concrete-500">{subtitle}</p>}
      {children}
    </Card>
  );
}
