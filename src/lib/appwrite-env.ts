// src/lib/appwrite-env.ts
// مشارك مشترك لقراءة متغيرات بيئة Appwrite في مسارات الخادم (Routes Handlers).
// يعرض خطأً تشخيصيًا يذكر اسم المتغير (المتغيرات) الناقصة ليُعرف سبب «خادم غير مكوّن»
// فورًا بدل رسالة عامة.

export interface AppwriteServerEnv {
  endpoint: string;
  project: string;
  apiKey: string;
}

const REQUIRED_SERVER_VARS = [
  { key: 'NEXT_PUBLIC_APPWRITE_ENDPOINT', pick: (e: AppwriteServerEnv) => e.endpoint },
  { key: 'NEXT_PUBLIC_APPWRITE_PROJECT_ID', pick: (e: AppwriteServerEnv) => e.project },
  { key: 'APPWRITE_API_KEY', pick: (e: AppwriteServerEnv) => e.apiKey },
];

// يعيد إما إعدادات الخادم الكاملة أو مصفوفة أسماء المتغيرات الناقصة.
export function getAppwriteServerEnv(): { env?: AppwriteServerEnv; missing: string[] } {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? '';
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '';
  const apiKey = process.env.APPWRITE_API_KEY ?? '';

  const missing = REQUIRED_SERVER_VARS.filter(({ pick }) => !pick({ endpoint, project, apiKey })).map(
    ({ key }) => key
  );
  if (missing.length > 0) {
    return { missing };
  }
  return { env: { endpoint, project, apiKey }, missing: [] };
}

// رسالة الخطأ الموحدة: تذكر المتغيرات الناقصة حتى تُكتشف مشكلة الإعداد في ثوانٍ.
export function missingEnvError(missing: string[]): { error: string } {
  return { error: `خادم غير مكوّن: مفقود ${missing.join('، ')}` };
}