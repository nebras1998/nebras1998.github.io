'use client';

import { Hammer, FlaskRound, Truck } from 'lucide-react';

interface TechStats {
  name: string;
  totalTests: number;
  completed: number;
  pending: number;
  samplesCount: number;
  todaySampled: number;
  todayPrepared: number;
  todayDelivered: number;
  progress: number;
}

export default function TechCard({ tech }: { tech: TechStats }) {
  return (
    <div className="bg-surface-dim rounded-lg p-4 border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-text-primary">{tech.name}</h3>
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold">{tech.totalTests}</div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-text-muted">مكتمل:</span><span className="font-medium text-success">{tech.completed}</span></div>
        <div className="flex justify-between"><span className="text-text-muted">معلق:</span><span className="font-medium text-warning">{tech.pending}</span></div>
        <div className="flex justify-between"><span className="text-text-muted">عينات:</span><span className="font-medium text-primary">{tech.samplesCount}</span></div>
        <div className="border-t pt-2 mt-2">
          <p className="text-xs text-text-muted mb-1">إنجازات اليوم:</p>
          <div className="flex justify-between"><span className="text-text-muted flex items-center gap-1"><Hammer size={12} /> أخذ:</span><span>{tech.todaySampled}</span></div>
          <div className="flex justify-between"><span className="text-text-muted flex items-center gap-1"><FlaskRound size={12} /> تحضير:</span><span>{tech.todayPrepared}</span></div>
          <div className="flex justify-between"><span className="text-text-muted flex items-center gap-1"><Truck size={12} /> إحضار:</span><span>{tech.todayDelivered}</span></div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-text-muted mb-1"><span>نسبة الإنجاز</span><span>{tech.progress}%</span></div>
          <div className="w-full bg-border rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${tech.progress}%` }} /></div>
        </div>
      </div>
    </div>
  );
}
