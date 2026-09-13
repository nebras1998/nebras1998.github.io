import type { NextConfig } from "next";

// هيدرات أمان تُعالج على كل الاستجابات. تُفصَّل لبيئة التطوير لأن Next dev
// يحتاج ws: للـ HMR، و stable نشر الإنتاج يضيف HSTS فقط (أصل HTTPS).
const APPWRITE_ORIGIN = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  ? new URL(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT).origin
  : "https://fra.cloud.appwrite.io";

const isProd = process.env.NODE_ENV === "production";

function buildCsp(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: ${APPWRITE_ORIGIN}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${APPWRITE_ORIGIN} wss: ws: https://fonts.googleapis.com https://fonts.gstatic.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: buildCsp() },
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