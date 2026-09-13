// اختبار نقطة التحقق العامة GET /api/reports/verify
// الحد المفروض في الكود: 20 طلباً لكل IP خلال 10 دقائق (src/app/api/reports/verify/route.ts).
//
// مرّر hash و reportNumber حقيقيين (من تقرير معتمد فعلياً في بيئة الاختبار) للحصول على
// verified:true، أو اتركهما افتراضيين لاختبار مسار verified:false / رفض المدخلات فقط.
//
// تشغيل:
//   k6 run 03-reports-verify.js -e BASE_URL=http://localhost:3000 \
//     -e REPORT_HASH=<64-hex-chars> -e REPORT_NUMBER=RPT-2026-000001

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
// hash صالح شكلياً (64 حرف hex) لكنه غير موجود فعلياً -> يختبر مسار verified:false
const REPORT_HASH = __ENV.REPORT_HASH || 'a'.repeat(64);
const REPORT_NUMBER = __ENV.REPORT_NUMBER || 'RPT-0000-000000';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const url = `${BASE_URL}/api/reports/verify?hash=${REPORT_HASH}&no=${encodeURIComponent(REPORT_NUMBER)}`;
  const res = http.get(url);

  check(res, {
    'استجابة منطقية (200 أو 429 عند تجاوز الحد)': (r) => [200, 429].includes(r.status),
  });

  sleep(1);
}