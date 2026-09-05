// src/app/api/reports/verify/route.ts
// Public, read-only verification endpoint for approved reports.
// A QR code printed on an approved report encodes the report number + the
// report's SHA-256 lock hash. Anyone (no login) may call this endpoint to confirm
// that a report bearing those credentials genuinely exists and has not been
// tampered with since approval.
//
// Security model:
//  - Read-only: never writes, and only exposes the fields needed to verify.
//  - The hash is a SHA-256 of the snapshot + number + reviewedAt, so a forged or
//    altered report cannot reproduce it without the original locked payload.
//  - Best-effort per-IP rate limiting (same approach as the portal booking route).

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import { DATABASE_ID, REPORTS_COLLECTION_ID } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (rateLimitMap.size >= 500) {
    for (const [key, entry] of rateLimitMap) {
      if (entry.expiresAt <= now) rateLimitMap.delete(key);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.expiresAt <= now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

const HASH_RE = /^[0-9a-fA-F]{64}$/;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'طلبات كثيرة. حاول لاحقًا.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const hash = (searchParams.get('hash') || '').trim();
  const reportNumber = (searchParams.get('no') || '').trim();

  if (!HASH_RE.test(hash)) {
    return NextResponse.json({ error: 'بصمة غير صالحة' }, { status: 400 });
  }
  if (!reportNumber || reportNumber.length > 100) {
    return NextResponse.json({ error: 'رقم التقرير غير صالح' }, { status: 400 });
  }

  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'التحقق غير متاح حاليًا' },
      { status: 503 }
    );
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setKey(apiKey);
    const databases = new Databases(client);

    const res = await databases.listDocuments(DATABASE_ID, REPORTS_COLLECTION_ID, [
      Query.equal('reportNumber', reportNumber),
      Query.limit(10),
      Query.select(['reportNumber', 'status', 'reportHash', 'reviewedAt', 'reviewedBy', '$createdAt', 'testId']),
    ]);

    const match = res.documents.find(
      (d) => (d as { reportHash?: string }).reportHash === hash
    );

    if (!match) {
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    return NextResponse.json({
      verified: true,
      reportNumber: (match as { reportNumber?: string }).reportNumber,
      testId: (match as { testId?: string }).testId,
      status: (match as { status?: string }).status,
      reviewedAt: (match as { reviewedAt?: string }).reviewedAt,
      reviewedBy: (match as { reviewedBy?: string }).reviewedBy,
    });
  } catch (err) {
    console.error('[verify] فشل التحقق:', err);
    return NextResponse.json({ error: 'تعذر التحقق من التقرير' }, { status: 500 });
  }
}
