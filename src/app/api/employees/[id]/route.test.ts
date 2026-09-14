import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const dbInstances: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

const OTHER_EMPLOYEE = { email: 'tech@example.com', role: 'فني', name: 'م. سارة', $id: 'emp-100' };
const SELF_EMPLOYEE = { email: 'manager@example.com', role: 'مدير', name: 'م. المدير', $id: 'emp-100' };

// Default target fetched by the handler; individual tests override before calling.
let nextGetDocument: () => Promise<unknown> = async () => OTHER_EMPLOYEE;

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
      getDocument: vi.fn().mockImplementation(nextGetDocument),
      createDocument: vi.fn().mockResolvedValue({ $id: 'audit-id' }),
      updateDocument: vi.fn().mockResolvedValue({ ...OTHER_EMPLOYEE }),
      deleteDocument: vi.fn(),
    };
    dbInstances.push(instance);
    return instance;
  });
  const ID = { unique: vi.fn(() => 'audit-id') };
  return { Client, Databases, ID };
});

import { PATCH, DELETE } from './route';

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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchReq(method: 'PATCH' | 'DELETE', body: unknown, withCookie = true): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (withCookie) headers.cookie = 'a_session_test=abc';
  return new NextRequest('http://localhost/api/employees/emp-100', {
    method,
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  process.env.APPWRITE_API_KEY = 'test-key-123';
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'proj-id';
  dbInstances.length = 0;
  nextGetDocument = async () => OTHER_EMPLOYEE;
});

afterEach(() => {
  delete process.env.APPWRITE_API_KEY;
  delete process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PATCH /api/employees/[id]', () => {
  it('rejects a request without a session cookie with 401', async () => {
    stubSession('مدير');
    const res = await PATCH(patchReq('PATCH', { name: 'جديد' }, false), params('emp-100'));
    expect(res.status).toBe(401);
    expect(dbInstances).toHaveLength(0);
  });

  it('rejects a technician with 403', async () => {
    stubSession('فني');
    const res = await PATCH(patchReq('PATCH', { name: 'جديد' }), params('emp-100'));
    expect(res.status).toBe(403);
    expect(dbInstances).toHaveLength(0);
  });

  it('blocks a manager from changing their own role (privilege escalation)', async () => {
    stubSession('مدير');
    nextGetDocument = async () => SELF_EMPLOYEE;
    const res = await PATCH(patchReq('PATCH', { role: 'إداري' }), params('emp-100'));
    expect(res.status).toBe(403);
    expect(dbInstances[0].updateDocument).not.toHaveBeenCalled();
  });

  it('blocks a manager from deleting their own account', async () => {
    stubSession('مدير');
    nextGetDocument = async () => SELF_EMPLOYEE;
    const res = await DELETE(patchReq('DELETE', {}), params('emp-100'));
    expect(res.status).toBe(403);
    expect(dbInstances[0].deleteDocument).not.toHaveBeenCalled();
  });

  it('updates a non-sensitive field of another employee successfully', async () => {
    stubSession('مدير');
    const res = await PATCH(patchReq('PATCH', { phone: '0777' }), params('emp-100'));
    expect(res.status).toBe(200);
    expect(dbInstances[0].updateDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'emp-100',
      { phone: '0777' }
    );
  });

  it('changes the role of another employee and writes an audit notification', async () => {
    stubSession('مدير');
    const res = await PATCH(patchReq('PATCH', { role: 'إداري' }), params('emp-100'));
    expect(res.status).toBe(200);
    expect(dbInstances[0].createDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'audit-id',
      expect.objectContaining({ type: 'تغيير_دور', relatedId: 'emp-100' })
    );
    expect(dbInstances[0].updateDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'emp-100',
      expect.objectContaining({ role: 'إداري' })
    );
  });

  it('returns 404 when the target employee does not exist', async () => {
    stubSession('مدير');
    nextGetDocument = async () => {
      throw Object.assign(new Error('missing'), { code: 404 });
    };
    const res = await PATCH(patchReq('PATCH', { phone: '1' }), params('emp-404'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'الموظف غير موجود' });
  });
});

describe('DELETE /api/employees/[id]', () => {
  it('deletes another employee when the caller is a manager', async () => {
    stubSession('مدير');
    const res = await DELETE(patchReq('DELETE', {}), params('emp-100'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(dbInstances[0].deleteDocument).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'emp-100');
  });
});