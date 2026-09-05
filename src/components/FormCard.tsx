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
    <Card className={`mx-auto ${maxWidth} animate-fade-in ${className}`}>
      {title && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          <div className="mt-3 h-0.5 w-12 bg-gradient-to-l from-primary to-accent rounded-full" />
        </div>
      )}
      {children}
    </Card>
  );
}
