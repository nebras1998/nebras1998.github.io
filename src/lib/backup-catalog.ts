// src/lib/backup-catalog.ts
// كتالوج المجموعات المشترك بين صفحة النسخ الاحتياطي ومسارات الخادم،
// كي لا تتباعد القائمة بينما تُستخدم في اتجاهين (عميل وخادم).

import {
  CLIENTS_COLLECTION_ID,
  PROJECTS_COLLECTION_ID,
  SAMPLES_COLLECTION_ID,
  TESTS_COLLECTION_ID,
  INVOICES_COLLECTION_ID,
  PAYMENTS_COLLECTION_ID,
  SERVICES_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
  ATTENDANCE_COLLECTION_ID,
  LEAVE_REQUESTS_COLLECTION_ID,
  OVERTIME_COLLECTION_ID,
  VEHICLES_COLLECTION_ID,
  VEHICLE_TRIPS_COLLECTION_ID,
  EXPENSES_COLLECTION_ID,
  EQUIPMENT_COLLECTION_ID,
  BOOKINGS_COLLECTION_ID,
  SAMPLE_TYPES_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
  NOTIFICATIONS_COLLECTION_ID,
  REPORT_TEMPLATES_COLLECTION_ID,
  REPORTS_COLLECTION_ID,
} from '@/lib/constants';

export interface BackupCollection {
  id: string;
  name: string;
}

export const ALL_COLLECTIONS: BackupCollection[] = [
  { id: CLIENTS_COLLECTION_ID, name: 'العملاء' },
  { id: PROJECTS_COLLECTION_ID, name: 'المشاريع' },
  { id: SAMPLES_COLLECTION_ID, name: 'العينات' },
  { id: TESTS_COLLECTION_ID, name: 'الفحوصات' },
  { id: INVOICES_COLLECTION_ID, name: 'الفواتير' },
  { id: PAYMENTS_COLLECTION_ID, name: 'المدفوعات' },
  { id: SERVICES_COLLECTION_ID, name: 'الخدمات' },
  { id: EMPLOYEES_COLLECTION_ID, name: 'الموظفون' },
  { id: ATTENDANCE_COLLECTION_ID, name: 'الحضور' },
  { id: LEAVE_REQUESTS_COLLECTION_ID, name: 'طلبات الإجازة' },
  { id: OVERTIME_COLLECTION_ID, name: 'العمل الإضافي' },
  { id: VEHICLES_COLLECTION_ID, name: 'المركبات' },
  { id: VEHICLE_TRIPS_COLLECTION_ID, name: 'رحلات المركبات' },
  { id: EXPENSES_COLLECTION_ID, name: 'المصروفات' },
  { id: EQUIPMENT_COLLECTION_ID, name: 'الأجهزة' },
  { id: BOOKINGS_COLLECTION_ID, name: 'الحجوزات' },
  { id: SAMPLE_TYPES_COLLECTION_ID, name: 'أنواع العينات' },
  { id: STANDARD_TESTS_COLLECTION_ID, name: 'الفحوصات القياسية' },
  { id: NOTIFICATIONS_COLLECTION_ID, name: 'التنبيهات' },
  { id: REPORT_TEMPLATES_COLLECTION_ID, name: 'قوالب التقارير' },
  { id: REPORTS_COLLECTION_ID, name: 'التقارير' },
];

export const ALL_COLLECTION_IDS: string[] = ALL_COLLECTIONS.map((c) => c.id);

// مجموعات تُحفَظ عند إعادة تعيين النظام (لا تُحذف ضمن «حذف جميع البيانات»):
// قوالب الفحوصات القياسية وأنواع العينات تبقى كمصدر ثابت للمراجع، وسجلات
// الموظفين تُحفَظ كي تبقى الحسابات والأدوار صالحة ويعود المستخدمون لتسجيل الدخول.
export const RESET_PRESERVED_COLLECTION_IDS: string[] = [
  SAMPLE_TYPES_COLLECTION_ID,
  STANDARD_TESTS_COLLECTION_ID,
  EMPLOYEES_COLLECTION_ID,
];

// المجموعات المشمولة في النسخة الاحتياطية/الاستعادة: كل أقسام النظام ما عدا
// المحفوظة عند إعادة التعيين (أنواع العينات، الفحوصات القياسية، الموظفون).
export const BACKUP_COLLECTIONS: BackupCollection[] = ALL_COLLECTIONS.filter(
  (c) => !RESET_PRESERVED_COLLECTION_IDS.includes(c.id)
);

export const BACKUP_COLLECTION_IDS: string[] = BACKUP_COLLECTIONS.map((c) => c.id);