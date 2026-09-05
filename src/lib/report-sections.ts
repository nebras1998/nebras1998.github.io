// src/lib/report-sections.ts
// Per-examination report section planning.
//
// A construction-labs report must be tailored to the examination it belongs to:
// a 7/28-day concrete cube test, a core test, a sieve analysis, a steel tensile
// test, a Proctor compaction, etc. each has a specific layout, specimen
// description, method note and results table.
//
// This module maps a ReportSnapshot (via its resultType + category + test name)
// to a "section plan" object consumed by both the PDF builder (report-pdf.ts)
// and the dashboard preview page, so the on-screen and printed documents stay
// consistent. All identifiers/comments are English; UI strings remain Arabic.

import type { ReportSnapshot, ReportResultRow } from '@/types';

export type ReportCategory =
  | 'concrete_dual_age' // concrete cube 7 & 28 day compressive strength
  | 'concrete_core' // cored sample compressive strength
  | 'concrete_single' // single-value concrete test (slump, rebound, UPV...)
  | 'aggregate' // aggregate grading / SG / LA / sand equivalent...
  | 'soil' // soil mechanics (proctor, CBR, atterberg, sieve, density)
  | 'steel' // steel reinforcement tensile / elongation / bend
  | 'asphalt' // asphalt / bitumen
  | 'tile' // ceramic tiles
  | 'cement' // cement physical tests
  | 'masonry' // blocks / bricks
  | 'general'; // fallback

const CATEGORY_TERMS: Array<{ cat: ReportCategory; terms: string[] }> = [
  {
    cat: 'concrete_dual_age',
    terms: ['مقاومة الضغط للمكعبات', 'مكعبات خرسانية', 'عمر 7', 'عمر 28', 'المكعبات الخرسانية'],
  },
  { cat: 'concrete_core', terms: ['كور', 'القلب الخرساني', 'الكور المستخرج', 'cored', 'core'] },
  {
    cat: 'concrete_single',
    terms: ['هطول', 'الردع', 'المطرقة', 'الموجات فوق الصوتية', 'slump', 'rebound', 'UPV', 'انضغاط الخرسانة'],
  },
  { cat: 'aggregate', terms: ['ركام', 'منخلي للركام', 'الوزن النوعي والامتصاص', 'لوس أنجلوس', 'مكافئ الرمل', 'حبيبات'] },
  { cat: 'soil', terms: ['تربة', 'بروكتور', 'CBR', 'حد السيولة', 'حد اللدونة', 'الكثافة الحقلية', 'القص المباشر', 'الانضغاط غير المحصور', 'هيدروميتري'] },
  { cat: 'steel', terms: ['حديد', 'تسليح', 'الشد', 'استطالة', 'الثني', 'strength', 'تسليح'] },
  { cat: 'asphalt', terms: ['أسفلت', 'مارشال', 'بيتومين', 'اختراق', 'ليونة', 'asphalt', 'bitumen'] },
  { cat: 'tile', terms: ['بلاط', 'tile', 'سيراميك'] },
  { cat: 'cement', terms: ['إسمنت', 'زمن الشك', 'فيكات', 'نعومة', 'السلامة', 'مونة'] },
  { cat: 'masonry', terms: ['بلوك', 'طوب', 'block', 'brick'] },
];

export function categorizeReport(snapshot: ReportSnapshot): ReportCategory {
  const name = `${snapshot.testName || ''} ${snapshot.testNameEn || ''}`.trim();
  const lower = name.toLowerCase();
  // Prefer the explicit resultType for concrete cube semantics when no term matches.
  for (const { cat, terms } of CATEGORY_TERMS) {
    for (const t of terms) {
      if (lower.includes(t.toLowerCase())) return cat;
    }
  }
  if (snapshot.resultType === 'dual_age') return 'concrete_dual_age';
  if (snapshot.resultType === 'multi_no_age') return 'concrete_core';
  return 'general';
}

export interface ReportSectionPlan {
  category: ReportCategory;
  metaRows: [string, string][]; // full list of meta rows (label, value) for this examination
  resultsTitle: string; // title of the results section
  specimenLabel?: string; // label of the "specimen prepared" meta row if present
  methodNote?: string; // free explanatory note about the method/standard for this family
  resultsIntro?: string; // optional intro line above the results table
}

const NO_VALUE = '-';

function dateOnly(s: string | undefined): string {
  return s ? s.slice(0, 10) : '';
}

function fmtDate(s: string | undefined): string {
  if (!s) return NO_VALUE;
  try {
    return new Date(s).toLocaleDateString('ar-EG');
  } catch {
    return dateOnly(s) || NO_VALUE;
  }
}

/**
 * Builds the full meta-row list for the snapshot, ordered to read naturally for
 * a construction report: identification first, then sample, then project/client,
 * then standard and execution details.
 */
function buildMetaRows(s: ReportSnapshot): [string, string][] {
  const rows: [string, string][] = [];
  rows.push(['اسم الفحص', s.testName || NO_VALUE]);
  if (s.testNameEn) rows.push(['Test Name', s.testNameEn]);
  rows.push(['رقم الفحص', s.testNumber || NO_VALUE]);
  rows.push(['رقم العينة', s.sampleNumber || NO_VALUE]);
  rows.push(['نوع العينة', s.sampleType || NO_VALUE]);
  if (s.sampleLocation) rows.push(['موقع أخذ العينة', s.sampleLocation]);
  if (s.sampleReceivedDate) rows.push(['تاريخ استلام العينة', fmtDate(s.sampleReceivedDate)]);
  if (s.samplePreparedDate) rows.push(['تاريخ تحضير العينة', fmtDate(s.samplePreparedDate)]);
  rows.push(['العميل', s.clientName || NO_VALUE]);
  if (s.clientPhone) rows.push(['هاتف العميل', s.clientPhone]);
  if (s.clientAddress) rows.push(['عنوان العميل', s.clientAddress]);
  rows.push(['المشروع', s.projectName || NO_VALUE]);
  if (s.projectNumber) rows.push(['رقم المشروع', s.projectNumber]);
  if (s.projectLocation) rows.push(['موقع المشروع', s.projectLocation]);
  if (s.contractor) rows.push(['المقاول', s.contractor]);
  if (s.consultant) rows.push(['الاستشاري', s.consultant]);
  // Standard reference
  const standardRef = s.standardRef || s.standard;
  rows.push(['المواصفة / المرجع المعياري', standardRef || NO_VALUE]);
  rows.push(['المعيار المطبق', s.appliedStandardName || NO_VALUE]);
  rows.push(['الفني المسؤول', s.technicianName || NO_VALUE]);
  rows.push(['تاريخ إنجاز الفحص', fmtDate(s.completedAt)]);
  return rows;
}

/**
 * Returns the section plan for a snapshot. The plan is derived deterministically
 * from the snapshot; it never mutates state and is safe to re-run for every render.
 */
export function getReportSectionPlan(snapshot: ReportSnapshot): ReportSectionPlan {
  const category = categorizeReport(snapshot);
  const metaRows = buildMetaRows(snapshot);

  switch (category) {
    case 'concrete_dual_age':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج مقاومة الضغط للمكعبات الخرسانية',
        specimenLabel: 'نموذج المكعب الخرساني',
        methodNote:
          'تُعالَج المكعبات الخرسانية بالإنضاج في الماء حتى عمر الاختبار، وتُختبر المقاومة عند العمرين 7 و28 يومًا وفق المرجع المعياري المطبق. تُحسب النتيجة كمتوسط لأعضاء العينة، ويُقيَّم المطابقة بالمقارنة مع الصف التصميمي وحدود القبول.',
      };
    case 'concrete_core':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج مقاومة الضغط للكور الخرساني',
        specimenLabel: 'الكور المستخرج',
        methodNote:
          'تُستخرج العينات الأسطوانية (الكور) من المنشأ، وتُجهَّز للاختبار بتسطيح الأطراف، وتُختبر مقاومة الضغط وفق المرجع المعياري المطبق. يُذكر طول الكور ونسبة الطول/القطر وتُعدَّل النتائج حسب النسبة عند الحاجة.',
      };
    case 'concrete_single':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج الفحص',
        methodNote:
          'أُجري الفحص وفق المرجع المعياري المطبق على الخرسانة، وسُجِّلت القراءات الحقلية/المختبرية كما وردت.',
      };
    case 'aggregate':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص الركام',
        specimenLabel: 'عينة الركام',
        methodNote:
          'حُضِّرت عينة الركام وفق المرجع المعياري المطبق، وأُجري الفحص على الجزء التمثيلي من العينة. تُقارن النتائج بحدود المواصفة لغرض القبول.',
      };
    case 'soil':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص التربة',
        specimenLabel: 'عينة التربة',
        methodNote:
          'أُجري الفحص الجيوتقني على عينة التربة وفق المرجع المعياري المطبق، مع تسجيل الحالة الرطوبية وظروف التحضير، وتُقارن النتائج بحدود المواصفة.',
      };
    case 'steel':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص حديد التسليح',
        specimenLabel: 'عينة حديد التسليح',
        methodNote:
          'أُجري فحص الشد/الاستطالة/الثني على عينات حديد التسليح وفق المرجع المعياري المطبق، وتُقارن النتائج بحدود المواصفة لدرجة الحديد المطلوبة.',
      };
    case 'asphalt':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص الأسفلت / البيتومين',
        specimenLabel: 'عينة الأسفلت',
        methodNote:
          'أُجري الفحص على عينة الأسفلت/البيتومين وفق المرجع المعياري المطبق، مع تسجيل ظروف التحضير والاختبار، وتُقارن النتائج بحدود المواصفة.',
      };
    case 'tile':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص البلاط',
        specimenLabel: 'عينة البلاط',
        methodNote:
          'أُجري الفحص على عينات البلاط وفق المرجع المعياري المطبق، وتُقارن النتائج بحدود المواصفة للمجموعة التصنيفية.',
      };
    case 'cement':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص الإسمنت',
        specimenLabel: 'عينة الإسمنت',
        methodNote:
          'أُجري فحص الإسمنت الفيزيائي/الكيميائي وفق المرجع المعياري المطبق، وتُقارن النتائج بحدود المواصفة.',
      };
    case 'masonry':
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج فحص البلوك / الطوب',
        specimenLabel: 'عينة البلوك / الطوب',
        methodNote:
          'أُجري فحص الوحدات البنائية وفق المرجع المعياري المطبق، وتُقارن النتائج بحدود المواصفة لأبعاد الوحدة وفئتها.',
      };
    default:
      return {
        category,
        metaRows,
        resultsTitle: 'نتائج الفحص',
        methodNote: undefined,
      };
  }
}

// Standard compliance table: combine result rows with their acceptance limits.
export function hasLimits(snapshot: ReportSnapshot): boolean {
  return snapshot.resultRows.some((r) => r.min !== undefined || r.max !== undefined);
}

// A per-row pass/fail helper used by the preview + PDF so both agree.
export function rowPass(r: ReportResultRow): boolean | undefined {
  if (r.min === undefined && r.max === undefined) return undefined;
  const v = parseFloat(String(r.value).replace(/,/g, ''));
  if (Number.isNaN(v)) return undefined;
  if (r.min !== undefined && v < r.min) return false;
  if (r.max !== undefined && v > r.max) return false;
  return true;
}

// Returns the overall compliance label used on the report.
export function complianceLabel(snapshot: ReportSnapshot): string {
  if (snapshot.complianceStatus) return snapshot.complianceStatus;
  if (!hasLimits(snapshot)) return 'لم يُقيَّم';
  if (snapshot.resultRows.every((r) => rowPass(r) !== false)) return 'مطابق';
  return 'غير مطابق';
}
