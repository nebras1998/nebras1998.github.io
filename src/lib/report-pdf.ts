// src/lib/report-pdf.ts
// Server-side builder of the printable A4 report HTML (dir=rtl, Arabic).
// The layout is tailored to the examination via getReportSectionPlan, and the
// applied-standard acceptance limits are rendered per result row.

import type { Report, ReportSnapshot, ReportTemplate } from '@/types';
import {
  getReportSectionPlan,
  hasLimits,
  rowPass,
  complianceLabel,
} from '@/lib/report-sections';

export function escapeHtml(value: unknown): string {
  const s = value == null ? '' : String(value);
  return s.replace(/[&<>"']/g, (c) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c] as string)
  );
}

const DEFAULT_PRIMARY_COLOR = '#0f4c5c';

// Only allow safe CSS color tokens so a malformed/stored value can never
// inject arbitrary CSS into the report. Accepts hex (#rgb/#rrggbb) and
// rgb()/rgba()/hsl()/hsla() functional forms; anything else falls back.
export function sanitizePrimaryColor(value: unknown, fallback = DEFAULT_PRIMARY_COLOR): string {
  const s = value == null ? '' : String(value).trim();
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s;
  if (s.startsWith('rgb') || s.startsWith('hsl')) {
    if (/^(rgba?|hsla?)\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(s)) {
      return s;
    }
  }
  return fallback;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined) return '';
  return String(n);
}

function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch {
    return value.slice(0, 10);
  }
}

export function buildReportHtml(params: {
  report: Report;
  snapshot: ReportSnapshot;
  template: ReportTemplate | null;
  reportHash: string;
  logoDataUrl?: string | null;
  reviewedBy?: string;
  reviewedAt?: string;
  additionalNotes?: string;
  qrDataUrl?: string | null;
  showQr?: boolean;
}): string {
  const { report, snapshot, template, logoDataUrl } = params;
  const showQr = params.showQr === true && !!params.qrDataUrl;
  const qrDataUrl = params.qrDataUrl || null;
  const primary = sanitizePrimaryColor(template?.primaryColor);
  const labName = template?.labName || 'مختبرات الشمال';
  const labNameEn = template?.labNameEn;
  const notes = params.additionalNotes ?? report.additionalNotes ?? '';
  const reviewedBy = params.reviewedBy ?? report.reviewedBy;
  const reviewedAt = params.reviewedAt ?? report.reviewedAt;

  const plan = getReportSectionPlan(snapshot);
  const showLimits = hasLimits(snapshot);

  const metaHtml = plan.metaRows
    .map(
      ([label, value]) => `
        <tr>
          <td class="meta-label">${escapeHtml(label)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  // Result columns: always include standard/value/unit; add acceptance limits
  // columns (+ per-row pass/fail) only when a standard with limits is available.
  const resultHead = `
    <tr>
      <th>البند</th>
      <th>النتيجة</th>
      <th>الوحدة</th>
      ${showLimits ? '<th>الحد الأدنى</th><th>الحد الأقصى</th><th>المطابقة</th>' : ''}
    </tr>`;

  const resultRowsHtml = snapshot.resultRows
    .map((row) => {
      const pass = showLimits ? rowPass(row) : undefined;
      const passHtml =
        pass === true
          ? '<span class="compliance ok">مطابق</span>'
          : pass === false
            ? '<span class="compliance no">غير مطابق</span>'
            : '<span class="muted">—</span>';
      return `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td class="val">${escapeHtml(row.value || '-')}</td>
          <td>${escapeHtml(row.unit || '-')}</td>
          ${showLimits ? `<td>${escapeHtml(formatNumber(row.min) || '—')}</td><td>${escapeHtml(formatNumber(row.max) || '—')}</td><td class="center">${passHtml}</td>` : ''}
        </tr>`;
    })
    .join('');

  const compliance = (() => {
    const label = complianceLabel(snapshot);
    if (label === 'مطابق') return '<span class="compliance ok">مطابق</span>';
    if (label === 'غير مطابق') return '<span class="compliance no">غير مطابق</span>';
    return '<span class="compliance muted">لم يُقيَّم</span>';
  })();

  const contactParts = [template?.addressLine, template?.phone, template?.email].filter(Boolean);

  const methodNote =
    plan.methodNote || snapshot.methodNotes
      ? `  <div class="method-note"><strong>ملاحظة المنهجية:</strong> ${escapeHtml(plan.methodNote || snapshot.methodNotes)}</div>`
      : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    color: #2c2c29;
    font-size: 12px;
    line-height: 1.6;
  }
  .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-bottom: 3px solid ${primary}; padding-bottom: 12px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand .logo { width: 64px; height: 64px; object-fit: contain; }
  .brand h1 { font-size: 20px; color: ${primary}; }
  .brand .en { font-size: 12px; color: #64645e; direction: ltr; text-align: left; }
  .report-no { text-align: center; border: 1px solid ${primary}; border-radius: 8px; padding: 6px 12px; }
  .report-no .lbl { font-size: 10px; color: #64645e; }
  .report-no .num { font-size: 15px; font-weight: bold; color: ${primary}; direction: ltr; }
  .contact { background: ${primary}; color: #fff; font-size: 11px; padding: 6px 10px; margin-top: 8px; border-radius: 6px; }
  .accred { font-size: 10px; color: #64645e; margin-top: 6px; }
  h2.section { background: ${primary}; color: #fff; font-size: 13px; padding: 5px 10px; border-radius: 4px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d9d9d5; padding: 5px 8px; text-align: right; vertical-align: top; }
  th { background: #f6f6f5; font-weight: bold; }
  td.meta-label { background: #f6f6f5; width: 30%; font-weight: bold; color: #64645e; }
  td.val { font-weight: bold; }
  .center { text-align: center; }
  .compliance { display: inline-block; padding: 2px 12px; border-radius: 999px; font-weight: bold; }
  .compliance.ok { background: #eaf3de; color: #173404; }
  .compliance.no { background: #fcebeb; color: #791f1f; }
  .compliance.muted { background: #efefed; color: #64645e; }
  .method-note { margin-top: 10px; font-size: 11px; color: #44443f; border-right: 3px solid ${primary}; padding-right: 8px; }
  .notes-box { border: 1px solid #d9d9d5; border-radius: 6px; padding: 8px; min-height: 40px; white-space: pre-wrap; }
  .sign { display: flex; justify-content: space-between; gap: 12px; margin-top: 32px; }
  .sign .slot { flex: 1; text-align: center; }
  .sign .slot .line { border-top: 1px solid #2c2c29; margin-top: 44px; padding-top: 4px; font-size: 11px; }
  .footer { margin-top: 24px; border-top: 1px solid #e1e1de; padding-top: 6px; font-size: 9px; color: #64645e; text-align: center; }
  .hash { font-size: 8px; color: #9a9a93; direction: ltr; text-align: left; margin-top: 4px; word-break: break-all; }
  .muted { color: #64645e; }
  .note-list { font-size: 10px; color: #64645e; margin-top: 12px; }
  .note-list li { margin: 2px 0; }
  .verify { display: flex; align-items: center; gap: 12px; margin-top: 16px; border: 1px solid #e1e1de; border-radius: 8px; padding: 8px 10px; }
  .verify img { width: 72px; height: 72px; }
  .verify .txt { font-size: 10px; color: #64645e; line-height: 1.5; }
  .verify .txt .t { font-weight: bold; color: #2c2c29; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="logo" />` : ''}
      <div>
        <h1>${escapeHtml(labName)}</h1>
        ${labNameEn ? `<div class="en">${escapeHtml(labNameEn)}</div>` : ''}
      </div>
    </div>
    <div class="report-no">
      <div class="lbl">رقم التقرير</div>
      <div class="num">${escapeHtml(report.reportNumber)}</div>
      <div class="lbl muted">${formatDate(reviewedAt) || formatDate(report.$createdAt)}</div>
    </div>
  </div>

  ${contactParts.length > 0 ? `<div class="contact">${contactParts.map(escapeHtml).join(' &nbsp;•&nbsp; ')}</div>` : ''}
  ${template?.accreditationText ? `<div class="accred">${escapeHtml(template.accreditationText)}</div>` : ''}

  <h2 class="section">بيانات الفحص</h2>
  <table>${metaHtml}</table>

  <h2 class="section">${escapeHtml(plan.resultsTitle)}</h2>
  ${plan.resultsIntro ? `<p style="font-size:11px;color:#64645e;margin-bottom:6px;">${escapeHtml(plan.resultsIntro)}</p>` : ''}
  <table>
    <thead>
      ${resultHead}
    </thead>
    <tbody>
      ${resultRowsHtml || '<tr><td colspan="6" class="muted">لا توجد نتائج مسجلة.</td></tr>'}
    </tbody>
  </table>

  <p style="margin-top: 10px;">
    <strong>حالة المطابقة:</strong> ${compliance}
  </p>

  ${methodNote}

  <h2 class="section">ملاحظات إضافية</h2>
  <div class="notes-box">${escapeHtml(notes) || '<span class="muted">لا توجد ملاحظات.</span>'}</div>

  <ul class="note-list">
    <li>هذه النتائج تخص العينة المدروسة فقط، ولا تُعمَّم على باقي الكميات ما لم يُنص على ذلك.</li>
    <li>يُقرأ هذا التقرير ضمن نطاق اعتماد المختبر والمعدات والمنهجيات المرجعية المعلنة.</li>
  </ul>

  ${showQr ? `
  <div class="verify">
    <img src="${qrDataUrl}" alt="QR" />
    <div class="txt">
      <div class="t">تحقق إلكتروني من التقرير</div>
      امسح رمز QR للتحقق من أصالة هذا التقرير ومطابقة البصمة الرقمية من خلال منصة المختبر.
      رقم التقرير: <span dir="ltr">${escapeHtml(report.reportNumber)}</span>
    </div>
  </div>` : ''}

  <div class="sign">
    <div class="slot">
      <div class="line">${escapeHtml(template?.signatureLabel || 'المدير المسؤول')}</div>
    </div>
    <div class="slot">
      <div class="line">${escapeHtml(reviewedBy || '')}</div>
    </div>
  </div>

  <div class="footer">
    ${template?.footerText ? escapeHtml(template.footerText) : ''}
    <div class="hash">${params.reportHash ? `SHA-256: ${params.reportHash}` : ''}</div>
  </div>
</body>
</html>`;
}
