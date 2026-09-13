// اختبار أوّلي خفيف (Smoke Test) للصفحات العامة قبل أي اختبار ضغط أثقل.
// الهدف: التأكد أن الخادم يستجيب بشكل صحيح تحت حمل بسيط جداً قبل تكبير الحمل.
//
// تشغيل:
//   k6 run 01-smoke-public-pages.js -e BASE_URL=http://localhost:3000

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 3,           // 3 مستخدمين افتراضيين فقط
  duration: '30s',  // لمدة 30 ثانية
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% من الطلبات يجب أن تستجيب خلال 1.5 ثانية
    http_req_failed: ['rate<0.01'],    // أقل من 1% أخطاء مسموحة
  },
};

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/technician/login',
  '/portal/book',
];

export default function () {
  for (const path of PUBLIC_PATHS) {
    const res = http.get(`${BASE_URL}${path}`);
    check(res, {
      [`${path} -> status 200`]: (r) => r.status === 200,
      [`${path} -> فيه محتوى`]: (r) => r.body && r.body.length > 0,
    });
    sleep(0.5);
  }
}