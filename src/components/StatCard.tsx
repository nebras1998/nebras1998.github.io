'use client';

import React from 'react';

const VALUE_SIZE = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
} as const;

const TONES = {
  neutral: { bg: 'bg-surface-dim', accent: 'bg-border-strong', icon: 'text-primary' },
  petrol: { bg: 'bg-primary-50', accent: 'bg-primary', icon: 'text-primary' },
  danger: { bg: 'bg-danger-bg', accent: 'bg-danger-solid', icon: 'text-danger' },
  warning: { bg: 'bg-warning-bg', accent: 'bg-warning-solid', icon: 'text-warning' },
  success: { bg: 'bg-success-bg', accent: 'bg-success-solid', icon: 'text-success' },
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
  trend?: { value: number; label?: string };
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
  trend,
}: StatCardProps) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
  const toneColors = TONES[tone];
  const resolvedBg = bgColor ?? toneColors.bg;
  const resolvedIcon = iconColor ?? toneColors.icon;

  if (centered) {
    return (
      <div className={`${resolvedBg} p-5 rounded-2xl border border-border shadow-sm text-center animate-fade-in`}>
        <p className={`${VALUE_SIZE[size]} font-bold text-text-primary ${valueClass}`}>{formattedValue}</p>
        <p className="text-sm text-text-secondary mt-1">{title}</p>
      </div>
    );
  }

  return (
    <div className={`${resolvedBg} rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 p-5 relative overflow-hidden animate-fade-in`}>
      <div className={`absolute top-0 right-0 w-1 h-full ${toneColors.accent} rounded-l-full`} />
      <div className="pr-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-secondary text-sm font-medium">{title}</span>
          {icon && <div className={`p-2.5 rounded-xl bg-white shadow-sm ${resolvedIcon}`}>{icon}</div>}
        </div>
        <p className={`${VALUE_SIZE[size]} font-bold text-text-primary ${valueClass}`}>{formattedValue}</p>
        {trend && (
          <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? 'text-success' : 'text-danger'}`}>
            <span>{trend.value >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            {trend.label && <span className="text-text-muted font-normal">{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
