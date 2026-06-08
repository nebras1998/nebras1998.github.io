import type { Metadata, Viewport } from "next";
import SessionManager from "@/components/SessionManager";

export const metadata: Metadata = {
  title: "تطبيق الفني - مختبرات الشمال الإنشائية",
  description: "تطبيق الفنيين لإدارة المهام والفحوصات",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
};

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionManager timeoutMinutes={30} warningMinutes={5} logoutRedirect="/technician/login" />
      {children}
    </>
  );
}