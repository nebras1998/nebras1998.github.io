import { create } from 'zustand';
import { account, databases, client } from '@/lib/appwrite';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { Models, Query } from 'appwrite';
import type { Employee } from '@/types';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  employee: Employee | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginTechnician: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

// الحالات التي تمنع الموظف من الدخول (مستقيل)
const INACTIVE_EMPLOYEE_ERROR = 'هذا الحساب غير نشط، يرجى مراجعة الإدارة';

function isEmployeeActive(employee: Employee | null): boolean {
  return !!employee && employee.status !== 'مستقيل';
}

// دالة مساعدة لمسح كوكيز جلسات Appwrite فقط
const clearAppwriteCookies = () => {
  if (typeof document === 'undefined') return;
  document.cookie.split(';').forEach(c => {
    const name = c.split('=')[0].trim();
    if (name.startsWith('a_session_')) {
      document.cookie = `${name}=;expires=${new Date().toUTCString()};path=/`;
    }
  });
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('cookieFallback');
  }
};

// نسخ جلسات Appwrite من localStorage إلى cookies حقيقية
// لأن middleware يحتاج cookies في طلبات HTTP لتأكيد الجلسة
const syncAppwriteCookies = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const fallback = window.localStorage.getItem('cookieFallback');
    if (!fallback) return;
    const cookies = JSON.parse(fallback);
    for (const [name, value] of Object.entries(cookies)) {
      if (typeof name === 'string' && name.startsWith('a_session_')) {
        document.cookie = `${name}=${value}; path=/; SameSite=Strict; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
      }
    }
  } catch (e) {
    console.error('[AUTH] فشل نسخ الكوكيز:', e);
  }
};

// استخراج سر الجلسة من cookieFallback المخزن في localStorage
// (قيمة الكوكي هي base64url لـ JSON يحتوي على الحقل secret)
const readSessionSecret = (): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const fallback = window.localStorage.getItem('cookieFallback');
    if (!fallback) return null;
    const cookies = JSON.parse(fallback) as Record<string, string>;
    for (const value of Object.values(cookies)) {
      if (!value) continue;
      try {
        const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
        const decoded = JSON.parse(atob(padded));
        if (decoded?.secret) return decoded.secret;
      } catch {}
    }
  } catch {}
  return null;
};

// اعتماد الجلسة عبر ترويسة X-Appwrite-Session مباشرة بدلًا من الاعتماد
// على cookies الطرف الثالث أو localStorage فقط، لتجنب خطأ
// "User (role: guests) missing scope (account)" عند حظر المتصفح للكوكيز
const applySessionToClient = (secret?: string | null) => {
  const value = secret || readSessionSecret();
  if (value) client.setSession(value);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  employee: null,
  role: null,
  loading: true,

  login: async (email, password) => {
    try {
      try {
        await account.deleteSession('current');
      } catch (e) {
      }
      const session = await account.createEmailPasswordSession(email, password);
      applySessionToClient(session?.secret);
      syncAppwriteCookies();
      const user = await account.get();
      
      let employee = null;
      let role = null;
      try {
        const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
          Query.equal('email', email),
          Query.limit(1),
        ]);
        if (empRes.documents.length > 0) {
          employee = empRes.documents[0] as unknown as Employee;
          role = employee.role || null;
        }
      } catch (e) {
        console.error('[AUTH] Employee lookup error:', e);
      }

      if (!employee) {
        try { await account.deleteSession('current'); } catch {}
        throw new Error('لا يوجد موظف مرتبط بهذا البريد الإلكتروني. تواصل مع المدير.');
      }

      if (!isEmployeeActive(employee)) {
        try { await account.deleteSession('current'); } catch {}
        throw new Error(INACTIVE_EMPLOYEE_ERROR);
      }

      if (!role) {
        try { await account.deleteSession('current'); } catch {}
        throw new Error('ملف الموظف غير مكتمل (بدون دور محدد). تواصل مع المدير.');
      }

      set({ user, employee, role, loading: false });
    } catch (err: unknown) {
      console.error('[AUTH] login() failed:', err instanceof Error ? err.message : String(err));
      throw err;
    }
  },

  loginTechnician: async (email, password) => {
    try {
      try { await account.deleteSession('current'); } catch {}
      const session = await account.createEmailPasswordSession(email, password);
      applySessionToClient(session?.secret);
      syncAppwriteCookies();
      const user = await account.get();

      const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
        Query.equal('email', email),
        Query.limit(1),
      ]);

      if (empRes.documents.length > 0) {
        const emp = empRes.documents[0] as unknown as Employee;
        if (!isEmployeeActive(emp)) {
          await account.deleteSession('current');
          throw new Error(INACTIVE_EMPLOYEE_ERROR);
        }
        if (emp.role !== 'فني' && emp.role !== 'مدير') {
          await account.deleteSession('current');
          throw new Error('هذا الحساب غير مصرح له باستخدام تطبيق الفنيين. تواصل مع المدير.');
        }
        set({ user, employee: emp, role: emp.role, loading: false });
      } else {
        await account.deleteSession('current');
        throw new Error('لا يوجد موظف بهذا البريد الإلكتروني. تواصل مع المدير.');
      }
    } catch (err: unknown) {
      try { await account.deleteSession('current'); } catch {}
      throw err;
    }
  },

  logout: async () => {
    try {
      await account.deleteSession('current');
    } catch {}
    clearAppwriteCookies();
    client.setSession('');
    set({ user: null, employee: null, role: null, loading: false });
  },

  checkSession: async () => {
    try {
      applySessionToClient();
      const user = await account.get();
      let employee = null;
      let role = null;
      try {
        const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
          Query.equal('email', user.email),
          Query.limit(1),
        ]);
        if (empRes.documents.length > 0) {
          employee = empRes.documents[0] as unknown as Employee;
          role = employee.role || null;
        }
      } catch (e) {
        console.error('فشل في جلب بيانات الموظف أثناء فحص الجلسة:', e);
      }

      // قطع الجلسة فوراً إذا كان الموظف مستقيلاً/غير نشط
      if (employee && !isEmployeeActive(employee)) {
        try { await account.deleteSession('current'); } catch {}
        clearAppwriteCookies();
        client.setSession('');
        set({ user: null, employee: null, role: null, loading: false });
        return;
      }

      set({ user, employee, role, loading: false });
    } catch {
      try { await account.deleteSession('current'); } catch {}
      clearAppwriteCookies();
      set({ user: null, employee: null, role: null, loading: false });
    }
  },
}));