import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { Toaster } from 'sonner'; // <-- استيراد Toaster

export const metadata: Metadata = {
  title: "مختبر LIMS",
  description: "منصة إدارة المختبر الهندسي",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-left" /> {/* <-- إضافة Toaster */}
      </body>
    </html>
  );
}