'use client';

import React from 'react';

const VALUE_SIZE = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
} as const;

const TONES = {
  neutral: { bg: 'bg-concrete-50', icon: 'text-petrol' },
  petrol: { bg: 'bg-petrol-soft', icon: 'text-petrol' },
  danger: { bg: 'bg-danger-bg', icon: 'text-danger' },
  warning: { bg: 'bg-warning-bg', icon: 'text-warning' },
  success: { bg: 'bg-success-bg', icon: 'text-success' },
} as const;

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  bgColor?: string;
  iconColor?: string;
  centered?: boolean;
  valueClass?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: keyof typeof TONES;
}

export default function StatCard({
  title,
  value,
  icon,
  bgColor,
  iconColor,
  centered = false,
  valueClass = '',
  size = 'lg',
  tone = 'neutral',
}: StatCardProps) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
  const toneColors = TONES[tone];
  const resolvedBg = bgColor ?? toneColors.bg;
  const resolvedIcon = iconColor ?? toneColors.icon;
  if (centered) {
    return (
      <div className={`${resolvedBg} p-4 rounded-xl shadow-sm border border-concrete-200 text-center`}>
        <p className={`${VALUE_SIZE[size]} font-bold ${valueClass}`}>{formattedValue}</p>
        <p className="text-sm">{title}</p>
      </div>
    );
  }
  return (
    <div className={`${resolvedBg} rounded-xl p-4 shadow-sm border border-concrete-200 hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-concrete-500 text-sm">{title}</span>
        {icon && <div className={`p-2 rounded-full bg-white shadow-sm ${resolvedIcon}`}>{icon}</div>}
      </div>
      <p className={`${VALUE_SIZE[size]} font-bold text-concrete-800 ${valueClass}`}>{formattedValue}</p>
    </div>
  );
}
