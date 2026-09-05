const CATEGORIES: Record<string, string> = {
  success: 'bg-success-bg text-success border border-success/20',
  warning: 'bg-warning-bg text-warning border border-warning/20',
  danger: 'bg-danger-bg text-danger border border-danger/20',
  info: 'bg-info-bg text-info border border-info/20',
  neutral: 'bg-surface-muted text-text-secondary border border-border',
};

const SUCCESS = new Set(['مكتمل', 'منجز', 'حاضر', 'موافق', 'مدفوعة', 'مقبول', 'يعمل', 'نشط', 'جاهزة', 'تم الاستلام', 'معتمد', 'مكتملة', 'مطابق']);
const WARNING = new Set(['قيد الانتظار', 'معلق', 'متأخر', 'تحت الفحص', 'صادرة', 'مسودة', 'متأخرة', 'قيد الرحلة']);
const DANGER = new Set(['مرفوض', 'غائب', 'ملغاة', 'ملغى', 'متوقف', 'خارج الخدمة', 'معطل', 'متعطل', 'تالف', 'غير مطابق']);
const INFO = new Set(['إجازة', 'قيد الصيانة', 'مجدولة', 'محجوزة']);

export default function Badge({
  status,
  size = 'md',
}: {
  status?: string;
  size?: 'sm' | 'md';
}) {
  let category = 'neutral';
  if (status) {
    if (SUCCESS.has(status)) category = 'success';
    else if (WARNING.has(status)) category = 'warning';
    else if (DANGER.has(status)) category = 'danger';
    else if (INFO.has(status)) category = 'info';
  }
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const isDanger = category === 'danger';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${pad} ${CATEGORIES[category]}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${isDanger ? 'animate-pulse-dot' : 'opacity-70'}`} />
      {status}
    </span>
  );
}
