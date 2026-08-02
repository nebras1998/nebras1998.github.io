'use client';

import React from 'react';
import Card from '@/components/Card';

export default function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">{icon}{title}</h2>
      {children}
    </Card>
  );
}
