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
      createDocument: vi.fn().mockResolvedValue({ $id: 'report-789', status: 'مسودة' }),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
    };
    dbInstances.push(instance);
    return instance;
  });
  const ID = { unique: vi.fn(() => 'report-789') };
  return { Client, Databases, ID };
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

function createReq(withCookie = true): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (withCookie) headers.cookie = 'a_session_test=abc';
  return new NextRequest('http://localhost/api/reports', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      testId: 't-1',
      reportNumber: 'RPT-2026-0001',
      snapshotData: '{"temperature":22}',
    }),
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

describe('POST /api/reports', () => {
  it('rejects a request without a session cookie with 401', async () => {
    stubSession('مدير');
    const res = await POST(createReq(false));
    expect(res.status).toBe(401);
    expect(dbInstances).toHaveLength(0);
  });

  it('rejects a technician with 403', async () => {
    stubSession('فني');
    const res = await POST(createReq());
    expect(res.status).toBe(403);
    expect(dbInstances).toHaveLength(0);
  });

  it('creates only a draft — status مسودة and no approval fields', async () => {
    stubSession('مدير');
    const res = await POST(createReq());
    expect(res.status).toBe(201);
    expect(dbInstances[0].createDocument).toHaveBeenCalledTimes(1);
    const [, , id, data] = dbInstances[0].createDocument.mock.calls[0];
    expect(id).toBe('report-789');
    expect(data).toMatchObject({
      testId: 't-1',
      reportNumber: 'RPT-2026-0001',
      snapshotData: '{"temperature":22}',
      status: 'مسودة',
    });
    // Approval/lock fields may never be written by this route.
    expect(data).not.toHaveProperty('reportHash');
    expect(data).not.toHaveProperty('pdfFileId');
    expect(data).not.toHaveProperty('reviewedBy');
  });

  it('returns 503 when the server API key is not configured', async () => {
    stubSession('مدير');
    delete process.env.APPWRITE_API_KEY;
    const res = await POST(createReq());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'خادم غير مكوّن: مفقود APPWRITE_API_KEY' });
  });
});