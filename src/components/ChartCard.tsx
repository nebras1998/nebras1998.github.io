'use client';

import React from 'react';
import Card from '@/components/Card';

export default function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="animate-fade-in">
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2 tracking-tight">{icon}{title}</h2>
      {children}
    </Card>
  );
}
