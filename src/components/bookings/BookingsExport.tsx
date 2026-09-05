'use client';

import { Download, Printer } from 'lucide-react';
import type { Booking } from '@/types';

export default function BookingsExport({ bookings }: { bookings: Booking[] }) {
  const exportCSV = () => {
    const headers = ['رقم الحجز', 'العميل', 'الهاتف', 'نوع العينة', 'التاريخ', 'الحالة', 'المصدر'];
    const rows = bookings.map(b => [
      b.bookingNumber,
      b.clientName,
      b.clientPhone || '',
      b.sampleType,
      b.preferredDate || '',
      b.status,
      b.source || '',
    ]);
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `الحجوزات_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printTable = () => {
    window.print();
  };

  return (
    <>
      <button onClick={exportCSV} className="bg-success-bg text-success px-4 py-2 rounded-xl hover:bg-success-bg flex items-center gap-2">
        <Download size={18} /> تصدير CSV
      </button>
      <button onClick={printTable} className="bg-surface-muted text-text-primary px-4 py-2 rounded-xl hover:bg-border flex items-center gap-2">
        <Printer size={18} /> طباعة
      </button>
    </>
  );
}