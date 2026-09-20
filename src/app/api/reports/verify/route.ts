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
import { rateLimitKey, checkRateLimit } from '@/lib/rate-limit';
import { parseReportSnapshot } from '@/lib/report-snapshot';
import { computeReportHash } from '@/lib/report-hash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const HASH_RE = /^[0-9a-fA-F]{64}$/;

export async function GET(request: NextRequest) {
  if (checkRateLimit(rateLimitKey(request, 'verify'), { limit: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS }).limited) {
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
      Query.select(['reportNumber', 'status', 'reportHash', 'snapshotData', 'reviewedAt', 'reviewedBy', 'testId', '$createdAt']),
    ]);

    const match = res.documents.find((d) => (d as { reportHash?: string }).reportHash === hash);

    if (!match) {
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    // Tamper check: recompute the lock hash from the report's *current* stored
    // snapshot and review metadata (the same inputs the PDF/approve route used)
    // using the shared computeReportHash helper — a single source of truth. If an
    // attacker edited the snapshot after approval but left reportHash untouched,
    // the recomputed value will no longer match, and verification must fail.
    //
    // (The field equality check above already gates on the raw stored hash; this
    // recomputation also binds the QR-presented hash to the live snapshot payload,
    // so a snapshot-only edit cannot produce a "verified" result.)
    const snapshotData = (match as { snapshotData?: string }).snapshotData;
    let recomputed: string | null = null;
    if (snapshotData) {
      const parsedSnap = parseReportSnapshot(snapshotData);
      if (parsedSnap) {
        recomputed = computeReportHash(
          parsedSnap,
          reportNumber,
          (match as { reviewedAt?: string }).reviewedAt ?? ''
        );
      }
    }

    if (!recomputed || recomputed !== hash) {
      return NextResponse.json({ verified: false, tampered: true }, { status: 200 });
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
