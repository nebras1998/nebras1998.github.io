import { create } from 'zustand';
import { account, databases } from '@/lib/appwrite';
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
      await account.createEmailPasswordSession(email, password);
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
      await account.createEmailPasswordSession(email, password);
      syncAppwriteCookies();
      const user = await account.get();

      const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
        Query.equal('email', email),
        Query.limit(1),
      ]);

      if (empRes.documents.length > 0) {
        const emp = empRes.documents[0] as unknown as Employee;
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
    set({ user: null, employee: null, role: null, loading: false });
  },

  checkSession: async () => {
    try {
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
      set({ user, employee, role, loading: false });
    } catch {
      try { await account.deleteSession('current'); } catch {}
      clearAppwriteCookies();
      set({ user: null, employee: null, role: null, loading: false });
    }
  },
}));