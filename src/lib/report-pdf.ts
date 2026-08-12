// src/lib/report-pdf.ts
// Server-side builder of the printable A4 report HTML (dir=rtl, Arabic).
// Used by the PDF generation route; the dashboard preview page renders its own
// JSX but shares the same snapshot data source (src/lib/report-snapshot.ts).

import type { Report, ReportSnapshot, ReportTemplate } from '@/types';

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
  logoDataUrl?: string | null;
  reviewedBy?: string;
  reviewedAt?: string;
  additionalNotes?: string;
}): string {
  const { report, snapshot, template, logoDataUrl } = params;
  const primary = template?.primaryColor || '#0f4c5c';
  const labName = template?.labName || 'مختبرات الشمال';
  const labNameEn = template?.labNameEn;
  const notes = params.additionalNotes ?? report.additionalNotes ?? '';
  const reviewedBy = params.reviewedBy ?? report.reviewedBy;
  const reviewedAt = params.reviewedAt ?? report.reviewedAt;

  const metaRows: [string, string][] = [
    ['اسم الفحص', snapshot.testName],
    ['رقم الفحص', snapshot.testNumber],
    ['رقم العينة', snapshot.sampleNumber || '-'],
    ['نوع العينة', snapshot.sampleType || '-'],
    ['العميل', snapshot.clientName || '-'],
    ['المشروع', snapshot.projectName || '-'],
    ['المواصفة / المرجع المعياري', snapshot.standard || '-'],
    ['المعيار المطبق', snapshot.appliedStandardName || '-'],
    ['الفني المسؤول', snapshot.technicianName || '-'],
    ['تاريخ إنجاز الفحص', formatDate(snapshot.completedAt) || '-'],
  ];

  const resultRowsHtml = snapshot.resultRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.value || '-')}</td>
          <td>${escapeHtml(row.unit || '-')}</td>
        </tr>`
    )
    .join('');

  const metaHtml = metaRows
    .map(
      ([label, value]) => `
        <tr>
          <td class="meta-label">${escapeHtml(label)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const contactParts = [template?.addressLine, template?.phone, template?.email].filter(Boolean);
  const compliance = snapshot.complianceStatus
    ? snapshot.complianceStatus === 'مطابق'
      ? '<span class="compliance ok">مطابق</span>'
      : '<span class="compliance no">غير مطابق</span>'
    : '<span class="compliance muted">لم يُقيّم</span>';

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
  td.meta-label { background: #f6f6f5; width: 32%; font-weight: bold; color: #64645e; }
  .compliance { display: inline-block; padding: 2px 12px; border-radius: 999px; font-weight: bold; }
  .compliance.ok { background: #eaf3de; color: #173404; }
  .compliance.no { background: #fcebeb; color: #791f1f; }
  .compliance.muted { background: #efefed; color: #64645e; }
  .notes-box { border: 1px solid #d9d9d5; border-radius: 6px; padding: 8px; min-height: 40px; white-space: pre-wrap; }
  .sign { display: flex; justify-content: space-between; gap: 12px; margin-top: 28px; }
  .sign .slot { flex: 1; text-align: center; }
  .sign .slot .line { border-top: 1px solid #2c2c29; margin-top: 44px; padding-top: 4px; font-size: 11px; }
  .footer { margin-top: 24px; border-top: 1px solid #e1e1de; padding-top: 6px; font-size: 9px; color: #64645e; text-align: center; }
  .hash { font-size: 8px; color: #9a9a93; direction: ltr; text-align: left; margin-top: 4px; word-break: break-all; }
  .muted { color: #64645e; }
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

  <h2 class="section">نتائج الفحص</h2>
  <table>
    <thead>
      <tr><th>البند</th><th>النتيجة</th><th>الوحدة</th></tr>
    </thead>
    <tbody>
      ${resultRowsHtml || '<tr><td colspan="3" class="muted">لا توجد نتائج مسجلة.</td></tr>'}
    </tbody>
  </table>

  <p style="margin-top: 10px;">
    <strong>حالة المطابقة:</strong> ${compliance}
  </p>

  <h2 class="section">ملاحظات إضافية</h2>
  <div class="notes-box">${escapeHtml(notes) || '<span class="muted">لا توجد ملاحظات.</span>'}</div>

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
    <div class="hash">${report.reportHash ? `SHA-256: ${report.reportHash}` : ''}</div>
  </div>
</body>
</html>`;
}
