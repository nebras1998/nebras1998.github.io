// src/lib/rate-limit.ts
// عدّاد قسِّ طلبات في الذاكرة مشترك بين نقاط API العامة. يعمل بنفس منطق
// العدّاد السابق لكن بتحليل IP صارم (يرفض القيم المركّبة/المشكوك فيها)
// ودعم مفتاح جلسة للمسارات الحساسة الثقيلة.
//
// حدود معروفة: البوابة في الذاكرة (تُصفَّر عند إعادة تشغيل العملية)، ومع
// تشغيلٍ متعدد العمليات يجب نقل العدّاد لتخزين مشترك (Redis/Appwrite).
// كما لا يمكن الوثوق بهيدر x-forwarded-for/ x-real-ip من المتصفح المباشر؛
// عالج ذلك خلف فرعك الخاص بنبع مُوثوق يتجاهل/يكتب تلك الهيدرات، والمسارات
// الحساسة تَستعمل مفتاح `sessionRateLimitKey(userId)` بدل IP.

import type { NextRequest } from 'next/server';

// تعبير كامل للـ IPv4 وفحص ليّن للـ IPv6 (أحرف hex ونقطتان فقط).
const IPV4_RE_STRICT =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_CHARS_RE = /^[0-9a-fA-F:.]+$/;
const MAX_IP_LEN = 45;

export function isValidIp(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > MAX_IP_LEN) return false;
  if (IPV4_RE_STRICT.test(v)) return true;
  return v.includes(':') && IPV6_CHARS_RE.test(v);
}

// استخراج عنوان IP العميل المدعوم: نمر على x-forwarded-for ونقبل أول قيمة
// صحيحة الشكل فقط (الهيدر من المتصفح المباشر لا يُوثَّق؛ انظر الملاحظة أعلاه)،
// ثم نتراجع إلى x-real-ip ثم إلى "unknown".
export function parseClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    for (const part of forwarded.split(',')) {
      if (isValidIp(part)) return part.trim();
    }
  }
  const real = request.headers.get('x-real-ip');
  if (real && isValidIp(real)) return real.trim();
  return 'unknown';
}

export function rateLimitKey(request: NextRequest, scope: string): string {
  return `ip:${scope}:${parseClientIp(request)}`;
}

export function sessionRateLimitKey(userId: string, scope: string): string {
  return `user:${scope}:${userId}`;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  limited: boolean;
  retryAfterMs: number;
}

const buckets = new Map<string, { count: number; expiresAt: number }>();
const MAX_BUCKETS = 1000;

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, entry] of buckets) {
      if (entry.expiresAt <= now) buckets.delete(k);
    }
  }
  const entry = buckets.get(key);
  if (!entry || entry.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + opts.windowMs });
    return { limited: false, retryAfterMs: 0 };
  }
  entry.count += 1;
  if (entry.count > opts.limit) {
    return { limited: true, retryAfterMs: entry.expiresAt - now };
  }
  return { limited: false, retryAfterMs: 0 };
}