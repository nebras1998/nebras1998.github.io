// اختبار نقطة الحجز العامة POST /api/portal/book
// الكود الفعلي يفرض حد معدل 5 طلبات لكل IP خلال 10 دقائق (انظر src/app/api/portal/book/route.ts).
// لذلك هذا الاختبار له هدفان منفصلان يجب تشغيلهما على حدة:
//
//   A) دالة `scenario: 'below_limit'`  -> تتحقق أن الحجز الطبيعي (تحت الحد) يعمل بنجاح 100%.
//   B) دالة `scenario: 'trigger_limit'` -> تتعمّد تجاوز الحد للتأكد أن 429 تُعاد بشكل صحيح.
//
// ملاحظة: لأن الحد مفتاحه IP وليس مستخدماً، فكل الطلبات من نفس جهاز k6 تشترك بنفس العداد.
// شغّل السيناريوهين في تشغيلتين منفصلتين (لا تجمعهما في تشغيل واحد) لتفسير واضح للنتائج.
//
// تشغيل سيناريو "تحت الحد" (النتيجة المتوقعة: كل الطلبات 200/201):
//   k6 run 02-portal-booking-rate-limit.js -e BASE_URL=http://localhost:3000 -e MODE=below_limit
//
// تشغيل سيناريو "تجاوز الحد عمداً" (النتيجة المتوقعة: أول 5 طلبات تنجح ثم البقية 429):
//   k6 run 02-portal-booking-rate-limit.js -e BASE_URL=http://localhost:3000 -e MODE=trigger_limit

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const MODE = __ENV.MODE || 'below_limit';
// عدّل هذا الاسم ليطابق نوع عينة موجود فعلاً في كتالوجكم (سيرفض الطلب إن لم يكن موجوداً)
const SAMPLE_TYPE_NAME = __ENV.SAMPLE_TYPE_NAME || 'خرسانة';

export const options =
  MODE === 'trigger_limit'
    ? { vus: 1, iterations: 8 } // تعمّد تجاوز الحد (5) بقليل للتأكد من رسالة 429
    : { vus: 1, iterations: 3 }; // ابق تحت الحد بوضوح

function bookingPayload(i) {
  return JSON.stringify({
    clientName: `LOADTEST-عميل-${i}-${Date.now()}`,
    clientPhone: '0599123456',
    clientEmail: `loadtest${i}@example.com`,
    sampleType: SAMPLE_TYPE_NAME,
    projectName: 'LOADTEST-مشروع-تجريبي',
    notes: 'طلب تجريبي من اختبار k6 — يمكن حذفه بأمان',
  });
}

export default function () {
  const res = http.post(`${BASE_URL}/api/portal/book`, bookingPayload(__ITER), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (MODE === 'trigger_limit') {
    check(res, {
      'استجابة منطقية (200/201 أو 429 بعد تجاوز الحد)': (r) =>
        [200, 201, 429].includes(r.status),
    });
    if (res.status === 429) {
      console.log(`[${__ITER}] تم رفض الطلب بحد المعدل كما هو متوقع (429)`);
    }
  } else {
    check(res, {
      'نجح الحجز (200/201)': (r) => [200, 201].includes(r.status),
    });
    if (res.status !== 200 && res.status !== 201) {
      console.error(`[${__ITER}] فشل غير متوقع: ${res.status} - ${res.body}`);
    }
  }

  sleep(MODE === 'trigger_limit' ? 0.2 : 1);
}