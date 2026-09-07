import { DATABASE_ID, EMPLOYEES_COLLECTION_ID } from '@/lib/constants';

// أدوات خادمية (تُستورد فقط من proxy.ts أو route handlers)
// لمشاركة منطق التحقق من الجلسة والدور بين حماية المسارات وحماية API.

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';

export interface SessionCookie {
  name: string;
  value: string;
}

export function extractSessionCookie(cookies: SessionCookie[]): string {
  return cookies
    .filter((c) => c.name.startsWith('a_session_'))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

async function fetchAccount(sessionCookie: string): Promise<{ email: string } | null> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      headers: {
        Cookie: sessionCookie,
        'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as { email: string };
  } catch {
    return null;
  }
}

async function fetchEmployeeRole(sessionCookie: string, email: string): Promise<string | null> {
  try {
    const query = JSON.stringify({ method: 'equal', attribute: 'email', values: [email] });
    const url = new URL(
      `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${EMPLOYEES_COLLECTION_ID}/documents`
    );
    // Same query serialization the Appwrite web SDK uses (queries[0], ...)
    url.searchParams.append('queries[0]', query);
    url.searchParams.append('limit', '1');

    const res = await fetch(url.toString(), {
      headers: {
        Cookie: sessionCookie,
        'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { documents?: Array<{ role?: string }> };
    return data.documents?.[0]?.role ?? null;
  } catch {
    return null;
  }
}

// جلب مصدر حقيقة الدور (سجل الموظف المرتبط بالبريد) مثلما يفعل proxy.
export async function getSessionAccount(sessionCookie: string): Promise<{ email: string } | null> {
  if (!sessionCookie) return null;
  return fetchAccount(sessionCookie);
}

export async function getSessionRole(sessionCookie: string, email: string): Promise<string | null> {
  if (!sessionCookie || !email) return null;
  return fetchEmployeeRole(sessionCookie, email);
}