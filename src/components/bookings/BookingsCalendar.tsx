'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { Booking } from '@/types';

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function BookingsCalendar({
  bookings,
  onSelectDay,
}: {
  bookings: Booking[];
  onSelectDay: (dateStr: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => dayjs());
  const startOfMonth = viewDate.startOf('month');
  const endOfMonth = viewDate.endOf('month');
  const startDay = startOfMonth.day();

  const daysInMonth = endOfMonth.date();

  const goToPreviousMonth = () => setViewDate(viewDate.subtract(1, 'month'));
  const goToNextMonth = () => setViewDate(viewDate.add(1, 'month'));
  const goToToday = () => setViewDate(dayjs());

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setViewDate(viewDate.month(newMonth));
  };

  const bookingsByDate: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    if (b.preferredDate) {
      if (!bookingsByDate[b.preferredDate]) bookingsByDate[b.preferredDate] = [];
      bookingsByDate[b.preferredDate].push(b);
    }
  });

  const weeks: React.ReactNode[] = [];
  let days: React.ReactNode[] = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-20 border bg-surface-dim" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = startOfMonth.date(day);
    const dateStr = dateObj.format('YYYY-MM-DD');
    const dayBookings = bookingsByDate[dateStr] || [];
    const isToday = dateObj.isSame(dayjs(), 'day');
    const isWeekend = dateObj.day() === 5 || dateObj.day() === 6;

    days.push(
      <div
        key={day}
        className={`h-20 border p-1 cursor-pointer transition-colors hover:bg-primary-50 relative ${
          isToday ? 'bg-primary-50' : isWeekend ? 'bg-surface-muted' : 'bg-white'
        }`}
        onClick={() => onSelectDay(dateStr)}
      >
        <div className="flex justify-between items-start">
          <span className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
            {day}
          </span>
          {dayBookings.length > 0 && (
            <span className="text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
              {dayBookings.length}
            </span>
          )}
        </div>
        <div className="mt-1 space-y-0.5 overflow-hidden">
          {dayBookings.slice(0, 2).map(b => (
            <div
              key={b.$id}
              className={`text-xs px-1 rounded truncate ${
                b.status === 'مقبول' ? 'bg-success-bg text-success' : b.status === 'مرفوض' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'
              }`}
              title={`${b.clientName} - ${b.sampleType}`}
            >
              {b.clientName}
            </div>
          ))}
          {dayBookings.length > 2 && (
            <div className="text-xs text-text-muted">+{dayBookings.length - 2} المزيد</div>
          )}
        </div>
      </div>
    );

    if (days.length === 7) {
      weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7">{days}</div>);
      days = [];
    }
  }
  if (days.length > 0) {
    const filler: React.ReactNode[] = [];
    for (let i = days.length; i < 7; i++) {
      filler.push(<div key={`empty-end-${i}`} className="h-20 border bg-surface-dim" />);
    }
    weeks.push(<div key={`week-${weeks.length}`} className="grid grid-cols-7">{[...days, ...filler]}</div>);
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-border border">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToToday} className="px-3 py-1 text-sm rounded-lg hover:bg-border border">
            اليوم
          </button>
          <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-border border">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewDate.month()}
            onChange={handleMonthChange}
            className="px-3 py-1 border rounded-lg text-sm font-bold bg-white"
          >
            {ARABIC_MONTHS.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <span className="text-lg font-bold">{viewDate.format('YYYY')}</span>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-surface-muted border-b">
        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(d => (
          <div key={d} className="p-2 text-center font-bold text-sm">{d}</div>
        ))}
      </div>
      {weeks}
    </div>
  );
}