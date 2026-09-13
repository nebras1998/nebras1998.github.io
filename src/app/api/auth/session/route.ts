// src/app/api/auth/session/route.ts
// Server-side persistence of Appwrite session cookies with the HttpOnly flag.
//
// Why: the SPA authenticates through the Appwrite web SDK, which stores the
// session in localStorage (`cookieFallback`) and previously mirrored it into a
// JS-readable `document.cookie` so Next's proxy/route handlers could see it.
// A JS-readable cookie containing the session secret turns any XSS into a
// session hijack. Instead, the client posts the fresh session cookie values
// here and the server re-issues them as HttpOnly cookies (same Appwrite name
// so `server-auth` keeps picking them up verbatim).
//
// POST  { cookies: [{ name, value }, ...] } -> persist as HttpOnly
// DELETE                                     -> clear all persisted session cookies

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_COOKIE_PREFIX = 'a_session_';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days (Appwrite default sessions are 60d)
const MAX_COOKIE_VALUE_LEN = 4096;

function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}

interface SessionCookieInput {
  name?: unknown;
  value?: unknown;
}

export async function POST(request: NextRequest) {
  let body: { cookies?: SessionCookieInput[] } | null = null;
  try {
    body = (await request.json()) as { cookies?: SessionCookieInput[] };
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const secure = request.nextUrl.protocol === 'https:';
  const res = NextResponse.json({ ok: true });

  const persisted = new Set<string>();
  if (Array.isArray(body?.cookies)) {
    for (const entry of body.cookies) {
      const name = typeof entry?.name === 'string' ? entry.name : '';
      const value = typeof entry?.value === 'string' ? entry.value : '';
      if (!name.startsWith(SESSION_COOKIE_PREFIX)) continue;
      if (value.length === 0 || value.length > MAX_COOKIE_VALUE_LEN) continue;
      persisted.add(name);
      res.cookies.set(name, value, cookieOptions(secure));
    }
  }

  // Drop cookies from previous sessions that are no longer present.
  for (const existing of request.cookies.getAll()) {
    if (existing.name.startsWith(SESSION_COOKIE_PREFIX) && !persisted.has(existing.name)) {
      res.cookies.set(existing.name, '', { ...cookieOptions(secure), maxAge: 0 });
    }
  }

  return res;
}

export async function DELETE(request: NextRequest) {
  const secure = request.nextUrl.protocol === 'https:';
  const res = NextResponse.json({ ok: true });
  for (const existing of request.cookies.getAll()) {
    if (existing.name.startsWith(SESSION_COOKIE_PREFIX)) {
      res.cookies.set(existing.name, '', { ...cookieOptions(secure), maxAge: 0 });
    }
  }
  return res;
}