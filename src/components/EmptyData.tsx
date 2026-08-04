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
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-concrete-100 flex items-center justify-center">
        <Icon size={28} className="text-concrete-500" />
      </div>
      <p className="text-concrete-500 font-medium">{title}</p>
      {description && <p className="text-sm text-concrete-500 max-w-sm">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
