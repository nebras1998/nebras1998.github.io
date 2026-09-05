'use client';

import { Inbox } from 'lucide-react';

export default function EmptyData({
  icon: Icon = Inbox,
  title = 'لا توجد بيانات',
  description,
  action,
  className = '',
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 text-center animate-fade-in ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center">
        <Icon size={32} className="text-text-muted" />
      </div>
      <div>
        <p className="text-text-secondary font-semibold">{title}</p>
        {description && <p className="text-sm text-text-muted mt-1 max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
