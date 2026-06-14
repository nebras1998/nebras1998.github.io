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
  loginTechnician: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  employee: null,
  role: null,
  loading: true,

  // تسجيل دخول المدير/موظف المختبر
  login: async (email, password) => {
    // حذف أي جلسة سابقة بصمت
    try { await account.deleteSession('current'); } catch {}
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    set({ user, employee: null, role: null });
  },

  // تسجيل دخول الفنيين
  loginTechnician: async (email, password) => {
    // 1. حذف أي جلسة سابقة بصمت (حل جذري لمشكلة "session is active")
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

        // التأكد من أن الموظف هو فني (أو مدير يمكنه استخدام تطبيق الفنيين)
        if (emp.role !== 'فني' && emp.role !== 'مدير') {
          // إذا لم يكن فنيًا ولا مديرًا، نرفض الدخول
          await account.deleteSession('current');
          throw new Error('هذا الحساب غير مصرح له باستخدام تطبيق الفنيين. تواصل مع المدير.');
        }

        set({ user, employee: emp, role: emp.role });
      } else {
        // لا يوجد موظف بهذا البريد
        await account.deleteSession('current');
        throw new Error('لا يوجد موظف بهذا البريد الإلكتروني. تواصل مع المدير.');
      }
    } catch (err: any) {
      // إذا فشل جلب بيانات الموظف، نحذف الجلسة ونرمي الخطأ
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
      set({ user, loading: false });
    } catch {
      set({ user: null, employee: null, role: null, loading: false });
    }
  },
}));