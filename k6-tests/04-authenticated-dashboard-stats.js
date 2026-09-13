// اختبار GET /api/dashboard-stats — نقطة تتطلب جلسة مسجّل دخول بدور مدير/إداري
// (src/app/api/dashboard-stats/route.ts يتحقق من كوكي a_session_* + الدور من Appwrite).
//
// هذه النقطة ليست عامة، لذا يوجد طريقتان لتزويد k6 بجلسة صالحة:
//
// === الطريقة أ (الأسهل والأضمن): الصق كوكي جلسة حقيقية يدوياً ===
// 1. سجّل الدخول يدوياً في المتصفح على بيئة الاختبار (staging).
// 2. افتح أدوات المطوّر -> Application/Storage -> Cookies -> ابحث عن كوكي اسمه
//    يبدأ بـ a_session_ وانسخ (الاسم=القيمة) كاملة.
// 3. شغّل:
//    k6 run 04-authenticated-dashboard-stats.js \
//      -e BASE_URL=http://localhost:3000 \
//      -e SESSION_COOKIE="a_session_xxxxx=yyyyyyyyy"
//
// === الطريقة ب (تلقائية، تجريبية): تسجيل دخول مباشر عبر REST API الخاص بـ Appwrite ===
// تحتاج فيها APPWRITE_ENDPOINT/PROJECT_ID/TEST_EMAIL/TEST_PASSWORD. قد تحتاج تعديل
// اسم الكوكي المُنشأ يدوياً بحسب نسخة Appwrite لديكم (راجع التعليق أسفل login()).
//    k6 run 04-authenticated-dashboard-stats.js \
//      -e BASE_URL=http://localhost:3000 \
//      -e APPWRITE_ENDPOINT=https://your-endpoint/v1 \
//      -e APPWRITE_PROJECT_ID=your_project_id \
//      -e TEST_EMAIL=manager@example.com \
//      -e TEST_PASSWORD=your_test_password

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const APPWRITE_ENDPOINT = __ENV.APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = __ENV.APPWRITE_PROJECT_ID;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;
const MANUAL_COOKIE = __ENV.SESSION_COOKIE; // e.g. "a_session_abc123=eyJ..."

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

// تسجيل دخول تجريبي عبر REST مباشرة — يُنفَّذ في setup() مرة واحدة قبل بدء الـ VUs
// (k6 لا يسمح بـ HTTP في init context أعلى الملف؛ هذه مرحلة تهيئة فقط).
export function setup() {
  if (MANUAL_COOKIE) return { sessionCookie: MANUAL_COOKIE };
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      'زوّد إما SESSION_COOKIE جاهزة، أو كل من APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID/TEST_EMAIL/TEST_PASSWORD'
    );
  }

  const res = http.post(
    `${APPWRITE_ENDPOINT}/account/sessions/email`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        // Appwrite Cloud (v2.0+) لا يُسلّم كوكي الجلسة في الاستجابة إلا عند وصول الطلب
        // بترويسات تُعرّفه كـ Web SDK (وإلا يعيد secret فارغاً وبدون Set-Cookie).
        // هذا يعيد إنتاج التوقيع الفعلي لـ appwrite Web SDK 25.x.
        'X-Appwrite-Response-Format': '2.0.0',
        'X-Appwrite-SDK-Name': 'Web',
        'X-Appwrite-SDK-Language': 'javascript',
        'X-Appwrite-SDK-Version': '25.2.0',
      },
    }
  );

  if (res.status >= 300) {
    throw new Error(`فشل تسجيل الدخول عبر Appwrite REST: ${res.status} - ${res.body}`);
  }

  // Appwrite Cloud يُسلّم الجلسة عبر ترويسة Set-Cookie في استجابة تسجيل الدخول نفسه
  // (a_session_<projectId> ونسخة _legacy)، ولا يقبل الكوكي المبني يدوياً من body.secret
  // (يُعيد 401 عند محاولة /account). لذا نلتقط قيمة الكوكي من الترويسة مباشرة.
  return { sessionCookie: buildSessionCookie(res) };
}

// استخراج كوكي الجلسة الرئيسي a_session_<projectId>=<value> من استجابة Appwrite.
function buildSessionCookie(res) {
  const name = `a_session_${APPWRITE_PROJECT_ID}`;
  const jarVal = (res.cookies[name] || [])[0]?.value;
  if (jarVal) return `${name}=${jarVal}`;
  const raw = res.headers['Set-Cookie'] ?? res.headers['set-cookie'];
  if (raw) {
    const joined = Array.isArray(raw) ? raw.join('; ') : String(raw);
    const m = joined.match(new RegExp(`${name}=([^;]+)`));
    if (m) return `${name}=${m[1]}`;
  }
  throw new Error('تعذر التقاط كوكي الجلسة من استجابة تسجيل الدخول (Set-Cookie)');
}

export default function (data) {
  const sessionCookie = data.sessionCookie;
  const res = http.get(`${BASE_URL}/api/dashboard-stats`, {
    headers: { Cookie: sessionCookie },
  });

  check(res, {
    'مصرَّح (200) وليس 401/403': (r) => r.status === 200,
  });

  if (res.status === 401 || res.status === 403) {
    console.error(
      `فشل التفويض (${res.status}) — تحقق من صلاحية الكوكي/الدور. استخدم SESSION_COOKIE يدوياً كحل أضمن.`
    );
  }

  sleep(1);
}