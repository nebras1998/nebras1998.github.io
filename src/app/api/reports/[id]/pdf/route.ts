// src/app/api/reports/[id]/pdf/route.ts
// Server-side route that finalizes a report:
// 1) loads the Report (draft) + active template via the user's session,
// 2) renders the A4 RTL HTML (Arabic) and converts it to PDF via Puppeteer,
// 3) uploads the PDF to Appwrite Storage,
// 4) computes the SHA-256 lock hash and persists the approval on the report.
// Returns { pdfFileId, reportHash, reviewedAt }.

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { existsSync } from 'fs';
import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';
import { createHash } from 'node:crypto';
import QRCode from 'qrcode';
import {
  DATABASE_ID,
  REPORTS_COLLECTION_ID,
  REPORT_TEMPLATES_COLLECTION_ID,
  REPORTS_BUCKET_ID,
  EMPLOYEES_COLLECTION_ID,
} from '@/lib/constants';
import type { Report, ReportTemplate, ReportSnapshot } from '@/types';
import { buildReportHtml } from '@/lib/report-pdf';
import { parseReportSnapshot } from '@/lib/report-snapshot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXECUTABLE_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter((p): p is string => !!p);

function resolveExecutablePath(): string | null {
  for (const candidate of EXECUTABLE_CANDIDATES) {
    try {
      if (existsSync(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function buildSessionCookie(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter((c) => c.name.startsWith('a_session_'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

function createServerClient(sessionCookie: string): { account: Account; databases: Databases; storage: Storage } {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setCookie(sessionCookie);
  return { account: new Account(client), databases: new Databases(client), storage: new Storage(client) };
}

// Resolve the approver's display name from the authenticated Appwrite session
// instead of trusting a client-supplied value. Prefers the linked Employee
// record, falling back to the Appwrite account's name, then its email.
async function resolveApprover(account: Account, databases: Databases): Promise<string> {
  const user = await account.get();
  try {
    const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
      Query.equal('email', user.email),
      Query.limit(1),
      Query.select(['name']),
    ]);
    const empName = (empRes.documents[0]?.name as string | undefined)?.trim();
    if (empName) return empName;
  } catch {
    // fall through to account-level info
  }
  const accountName = (user.name as string | undefined)?.trim();
  if (accountName) return accountName;
  return user.email;
}

async function fetchLogoDataUrl(storage: Storage, fileId: string, sessionCookie: string): Promise<string | null> {
  try {
    const url = storage.getFileDownload(REPORTS_BUCKET_ID, fileId);
    const res = await fetch(url, { headers: { cookie: sessionCookie } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const sessionCookie = buildSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { id: reportId } = await context.params;
  const client_ = createServerClient(sessionCookie);

  let reviewedBy = '';
  try {
    reviewedBy = await resolveApprover(client_.account, client_.databases);
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 401) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    console.error('فشل تحديد المعتمِد من الجلسة:', err);
    return NextResponse.json({ error: 'تعذر تحديد اسم المعتمِد من الجلسة' }, { status: 500 });
  }

  if (!reviewedBy) {
    return NextResponse.json({ error: 'تعذر تحديد اسم المعتمِد من الجلسة' }, { status: 400 });
  }

  const { databases, storage } = client_;

  try {
    let report: Report;
    try {
      report = (await databases.getDocument(DATABASE_ID, REPORTS_COLLECTION_ID, reportId)) as unknown as Report;
    } catch {
      return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });
    }

    if (report.status === 'معتمد') {
      return NextResponse.json({ error: 'التقرير مُعتمد ومُقفل بالفعل. لا يمكن إعادة إنشاء PDF له.' }, { status: 409 });
    }
    if (report.status !== 'مسودة') {
      return NextResponse.json({ error: 'حالة التقرير غير صالحة للاعتماد' }, { status: 400 });
    }

    const snapshot = parseReportSnapshot(report.snapshotData);
    if (!snapshot) {
      return NextResponse.json({ error: 'بيانات التقرير (snapshot) تالفة' }, { status: 500 });
    }

    const templateRes = await databases.listDocuments(DATABASE_ID, REPORT_TEMPLATES_COLLECTION_ID, [Query.limit(1)]);
    const template = (templateRes.documents[0] as unknown as ReportTemplate | undefined) ?? null;

    const logoDataUrl = template?.logoFileId ? await fetchLogoDataUrl(storage, template.logoFileId, sessionCookie) : null;

    // Compute the lock hash first so the same value is both stored and embedded
    // in the verification QR (the QR must encode the final, locked hash).
    const reviewedAt = new Date().toISOString();
    const snapshotObj = snapshot as ReportSnapshot;
    const reportHash = createHash('sha256')
      .update(JSON.stringify(snapshotObj) + report.reportNumber + reviewedAt)
      .digest('hex');

    // QR verification payload (deterministic, no server state needed at scan time).
    let qrDataUrl: string | null = null;
    if (template?.showQrCode) {
      try {
        const origin = request.headers.get('origin') || new URL(request.url).origin;
        const verifyUrl = `${origin}/reports/verify?hash=${reportHash}&no=${encodeURIComponent(report.reportNumber)}`;
        qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 180, margin: 1, errorCorrectionLevel: 'M' });
      } catch (err) {
        console.error('فشل توليد QR:', err);
        qrDataUrl = null;
      }
    }

    const html = buildReportHtml({
      report,
      snapshot,
      template,
      logoDataUrl,
      reviewedBy,
      reviewedAt,
      qrDataUrl,
      showQr: Boolean(template?.showQrCode),
    });

    const executablePath = resolveExecutablePath();
    if (!executablePath) {
      return NextResponse.json(
        { error: 'لم يتم العثور على متصفح Chrome/Edge لتوليد الـ PDF. ثبّت Chrome أو اضبط PUPPETEER_EXECUTABLE_PATH.' },
        { status: 500 }
      );
    }

    let pdfBuffer: Buffer;
    const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
      pdfBuffer = (await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      })) as Buffer;
    } finally {
      await browser.close();
    }

    const pdfBytes = new Uint8Array(pdfBuffer.byteLength);
    pdfBytes.set(pdfBuffer);
    const uploaded = await storage.createFile(
      REPORTS_BUCKET_ID,
      ID.unique(),
      new File([pdfBytes], `report-${report.reportNumber}.pdf`, { type: 'application/pdf' })
    );

    const reviewedAt2 = reviewedAt; // (kept serialization simple; see update below)
    await databases.updateDocument(DATABASE_ID, REPORTS_COLLECTION_ID, reportId, {
      status: 'معتمد',
      reviewedBy,
      reviewedAt,
      pdfFileId: uploaded.$id,
      reportHash,
    });

    void reviewedAt2;
    return NextResponse.json({ pdfFileId: uploaded.$id, reportHash, reviewedAt, reviewedBy });
  } catch (err) {
    console.error('خطأ في توليد PDF التقرير:', err);
    const code = (err as { code?: number } | null)?.code;
    if (code === 401) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    return NextResponse.json({ error: 'فشل توليد PDF التقرير' }, { status: 500 });
  }
}
