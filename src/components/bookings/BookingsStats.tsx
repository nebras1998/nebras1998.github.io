'use client';

import StatCard from '@/components/StatCard';

export interface BookingsStatsData {
  pending: number;
  accepted: number;
  rejected: number;
  today: number;
}

export default function BookingsStats({ stats }: { stats: BookingsStatsData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="معلقة" value={stats.pending} centered bgColor="bg-warning-bg" valueClass="text-warning" />
      <StatCard title="مقبولة" value={stats.accepted} centered bgColor="bg-success-bg" valueClass="text-success" />
      <StatCard title="مرفوضة" value={stats.rejected} centered bgColor="bg-danger-bg" valueClass="text-danger" />
      <StatCard title="اليوم" value={stats.today} centered bgColor="bg-primary-50" valueClass="text-primary" />
    </div>
  );
}