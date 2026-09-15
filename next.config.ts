import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// هيدرات الحماية تُعالَج على كل الاستجابات. تُفصَّل لبيئة التطوير لأن Next dev
// يحتاج ws: للـ HMR، و stable نشر الإنتاج يضيف HSTS فقط (أصل HTTPS).
//
// ملاحظة أمنية: تُولَّد ترويسة Content-Security-Policy بنمط nonce ديناميكي لكل
// طلب داخل src/proxy.ts (لأن Next يقرأ الـ nonce من CSP وقت العرض ليطبّقه على
// سكربتاته المضمّنة self.__next_f). لا يجب ضبط CSP ثابت هنا لأنه يتجاوز ترويسة
// الـ nonce التي يكتبها الـ proxy.

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // HSTS يُفعَّل فقط في الإنتاج ويشترط تسليم حركة عبر HTTPS خلف نهاية TLS.
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // تُضبط من متغيرات بيئة Netlify: SENTRY_ORG و SENTRY_PROJECT
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // يُمرَّر سرّيًا من لوحة Netlify لرفع Sourcemaps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // يُوجّه أحداث المتصفح عبر نفق أول-المصدر (same-origin) داخل الخادم حتى لا
  // تحجبها CSP الصارمة في src/proxy.ts (connect-src 'self') ولا مانعات
  // الإعلانات. الخادم يستقبلها ويرسلها إلى Sentry ingestion.
  tunnelRoute: "/sentry-tunnel",

  // فقط سجل عمليات الرفع أثناء البناء في CI/Netlify
  silent: !process.env.CI,

  // sourcemaps تُحذف بعد رفعها تلقائيًا (الافتراضي) لتقليل حجم البناء
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});