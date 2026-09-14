import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const dbInstances: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

vi.mock('node-appwrite', () => {
  const Client = vi.fn().mockImplementation(() => {
    const self: Record<string, unknown> = {
      setEndpoint: vi.fn(() => self),
      setProject: vi.fn(() => self),
      setKey: vi.fn(() => self),
    };
    return self;
  });
  const Databases = vi.fn().mockImplementation(() => {
    const instance: Record<string, ReturnType<typeof vi.fn>> = {
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      createDocument: vi.fn().mockResolvedValue({ documentId: 'emp-100', name: 'م. أحمد' }),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
    };
    dbInstances.push(instance);
    return instance;
  });
  const Query = {
    equal: vi.fn((field: string, value: string) => `equal(${field},${value})`),
    limit: vi.fn((n: number) => `limit(${n})`),
  };
  const ID = { unique: vi.fn(() => 'unique-id') };
  return { Client, Databases, Query, ID };
});

import { POST } from './route';

function stubSession(role: string | null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : (input as URL).href);
      if (url.pathname.endsWith('/account')) {
        if (!role) return new Response('{}', { status: 401 });
        return new Response(JSON.stringify({ email: 'manager@example.com' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.pathname.includes('/documents')) {
        if (!role) return new Response('{}', { status: 401 });
        return new Response(JSON.stringify({ documents: [{ role }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    })
  );
}

function authedReq(method: 'POST' = 'POST', withCookie = true): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (withCookie) headers.cookie = 'a_session_test=abc';
  return new NextRequest('http://localhost/api/employees', {
    method,
    body: JSON.stringify({
      documentId: 'emp-100',
      name: 'م. أحمد',
      email: 'ahmed@lab.example',
      role: 'فني',
    }),
    headers,
  });
}

beforeEach(() => {
  process.env.APPWRITE_API_KEY = 'test-key-123';
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'proj-id';
  dbInstances.length = 0;
});

afterEach(() => {
  delete process.env.APPWRITE_API_KEY;
  delete process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('POST /api/employees', () => {
  it('rejects a request without a session cookie with 401', async () => {
    stubSession('مدير');
    const res = await POST(authedReq('POST', false));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'غير مصرح' });
    expect(dbInstances).toHaveLength(0);
  });

  it('rejects a request from an invalid session with 401', async () => {
    stubSession(null);
    const res = await POST(authedReq());
    expect(res.status).toBe(401);
  });

  it('rejects a technician (unauthorized role) with 403', async () => {
    stubSession('فني');
    const res = await POST(authedReq());
    expect(res.status).toBe(403);
    expect(dbInstances).toHaveLength(0);
  });

  it('creates an employee when the caller is a manager with 201', async () => {
    stubSession('مدير');
    const res = await POST(authedReq());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.documentId).toBe('emp-100');
    expect(dbInstances[0].createDocument).toHaveBeenCalledTimes(1);
    const [, , id, data] = dbInstances[0].createDocument.mock.calls[0];
    expect(id).toBe('emp-100');
    // $ keys and documentId are never persisted.
    expect(data).not.toHaveProperty('documentId');
    expect(data).not.toHaveProperty('$createdAt');
    expect(data).toMatchObject({ email: 'ahmed@lab.example', role: 'فني' });
  });

  it('rejects an invalid role value with 400', async () => {
    stubSession('مدير');
    const res = await POST(
      new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        headers: { cookie: 'a_session_test=abc', 'content-type': 'application/json' },
        body: JSON.stringify({ documentId: 'emp-101', role: 'مشرف' }),
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'دور غير صالح' });
  });

  it('rejects creation without a document id with 400', async () => {
    stubSession('مدير');
    const res = await POST(
      new NextRequest('http://localhost/api/employees', {
        method: 'POST',
        headers: { cookie: 'a_session_test=abc', 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'x@y.z' }),
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'رقم الموظف مفقود' });
  });
});