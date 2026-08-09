const CATEGORIES: Record<string, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  neutral: 'bg-concrete-100 text-concrete-500',
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
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${pad} ${CATEGORIES[category]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}
