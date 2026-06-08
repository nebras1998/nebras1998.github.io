import { create } from 'zustand';
import { account, databases } from '@/lib/appwrite';
import { DATABASE_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';
import { Models, Query } from 'appwrite';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  employee: any | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginTechnician: (email: string, password: string) => Promise<void>; // جديدة
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  employee: null,
  role: null,
  loading: true,

  // دالة تسجيل الدخول للوحة الإدارة (كما هي)
  login: async (email, password) => {
    try { await account.deleteSession('current'); } catch {}
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    // لا نبحث عن موظف هنا حتى لا نسبب مشاكل
    set({ user, employee: null, role: null });
  },

  // دالة تسجيل الدخول للفنيين (جديدة)
  loginTechnician: async (email, password) => {
    // 1. حذف أي جلسة سابقة
    try { await account.deleteSession('current'); } catch {}
    
    // 2. إنشاء جلسة جديدة
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();

    // 3. البحث عن الموظف المرتبط بهذا البريد
    try {
      const empRes = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION_ID, [
        Query.equal('email', email),
        Query.limit(1),
      ]);
      if (empRes.documents.length > 0) {
        const emp = empRes.documents[0];
        if (emp.role !== 'فني') {
          // إذا لم يكن فنيًا، نرفض الدخول
          await account.deleteSession('current');
          throw new Error('هذا الحساب ليس للفنيين. استخدم لوحة الإدارة.');
        }
        set({ user, employee: emp, role: 'فني' });
      } else {
        await account.deleteSession('current');
        throw new Error('الموظف غير موجود في قاعدة البيانات.');
      }
    } catch (err: any) {
      // إذا فشل جلب الموظف، نحذف الجلسة ونرمي الخطأ
      try { await account.deleteSession('current'); } catch {}
      throw err;
    }
  },

  logout: async () => {
    await account.deleteSession('current');
    set({ user: null, employee: null, role: null });
  },

  checkSession: async () => {
    try {
      const user = await account.get();
      // لا نجلب الموظف تلقائيًا هنا للحفاظ على استقرار لوحة الإدارة
      set({ user, loading: false });
    } catch {
      set({ user: null, employee: null, role: null, loading: false });
    }
  },
}));