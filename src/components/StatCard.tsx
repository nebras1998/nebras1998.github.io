'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  bgColor?: string;
  iconColor?: string;
  centered?: boolean;
  valueClass?: string;
}

export default function StatCard({ title, value, icon, bgColor = 'bg-concrete-50', iconColor = 'text-petrol', centered = false, valueClass = '' }: StatCardProps) {
  if (centered) {
    return (
      <div className={`${bgColor} p-4 rounded-xl shadow-sm border border-concrete-200 text-center`}>
        <p className={`text-lg font-bold ${valueClass}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-sm">{title}</p>
      </div>
    );
  }
  return (
    <div className={`${bgColor} rounded-xl p-4 shadow-sm border border-concrete-200 hover:shadow-md transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-concrete-500 text-sm">{title}</span>
        {icon && <div className={`p-2 rounded-full bg-white shadow-sm ${iconColor}`}>{icon}</div>}
      </div>
      <p className={`text-2xl font-bold text-concrete-800 ${valueClass}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}
