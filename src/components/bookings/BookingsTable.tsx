'use client';

import { Check, X, RefreshCcw, Trash2 } from 'lucide-react';
import type { Booking } from '@/types';
import EmptyData from '@/components/EmptyData';
import Badge from '@/components/Badge';
import { formatDateAr } from '@/lib/helpers';

export default function BookingsTable({
  bookings,
  onAccept,
  onChangeStatus,
  onDelete,
}: {
  bookings: Booking[];
  onAccept: (booking: Booking) => void;
  onChangeStatus: (id: string, newStatus: string) => void;
  onDelete: (id: string, number: string) => void;
}) {
  return (
    <div className="overflow-x-auto print:shadow-none print:rounded-none">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-dim border-b border-border">
            <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">رقم الحجز</th>
            <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">العميل</th>
            <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">نوع العينة</th>
            <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">التاريخ المفضل</th>
            <th className="text-right p-4 text-sm font-semibold text-text-secondary sticky top-0 z-10 bg-surface-dim">الحالة</th>
            <th className="text-right p-3 text-sm font-semibold sticky top-0 z-10 bg-surface-dim print:hidden">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr><td colSpan={6}><EmptyData title="لا توجد حجوزات" className="py-8" /></td></tr>
          ) : (
            bookings.map(b => (
              <tr key={b.$id} className="border-b border-border/50 hover:bg-primary-50 transition-colors">
                <td className="p-3 font-mono">{b.bookingNumber}</td>
                <td className="p-3">{b.clientName}</td>
                <td className="p-3">{b.sampleType}</td>
                <td className="p-3">{formatDateAr(b.preferredDate)}</td>
                <td className="p-3">
                  <Badge status={b.status} />
                </td>
                <td className="p-3 flex flex-wrap gap-1 print:hidden">
                  {b.status !== 'مقبول' && (
                    <button onClick={() => (b.status === 'معلق' ? onAccept(b) : onChangeStatus(b.$id, 'مقبول'))} className="text-primary hover:text-primary-dark font-medium text-sm transition-colors px-2 py-1 rounded-lg hover:bg-primary-50 flex items-center gap-1 text-sm"><Check size={14} /> قبول</button>
                  )}
                  {b.status !== 'مرفوض' && (
                    <button onClick={() => onChangeStatus(b.$id, 'مرفوض')} className="text-danger hover:underline flex items-center gap-1 text-sm"><X size={14} /> رفض</button>
                  )}
                  {b.status !== 'معلق' && (
                    <button onClick={() => onChangeStatus(b.$id, 'معلق')} className="text-warning hover:underline flex items-center gap-1 text-sm"><RefreshCcw size={14} /> إعادة للمعلق</button>
                  )}
                  <button onClick={() => onDelete(b.$id, b.bookingNumber)} className="text-danger hover:underline flex items-center gap-1 text-sm"><Trash2 size={14} /> حذف</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}