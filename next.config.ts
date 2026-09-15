import type { NextConfig } from "next";

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

export default nextConfig;