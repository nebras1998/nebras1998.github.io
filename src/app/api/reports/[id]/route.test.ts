import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const dbInstances: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

const DRAFT_REPORT = { $id: 'rep-1', testId: 't-1', status: 'مسودة', reportNumber: 'RPT-2026-0001' };
const APPROVED_REPORT = { $id: 'rep-1', testId: 't-1', status: 'معتمد', reportNumber: 'RPT-2026-0001', reportHash: 'a'.repeat(64) };

// Default report fetched by the handler; individual tests override before calling.
let nextGetDocument: () => Promise<unknown> = async () => DRAFT_REPORT;

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
      createDocument: vi.fn(),
      updateDocument: vi.fn().mockResolvedValue({ ...DRAFT_REPORT }),
      deleteDocument: vi.fn(),
    };
    dbInstances.push(instance);
    return instance;
  });
  const ID = { unique: vi.fn(() => 'report-789') };
  return { Client, Databases, ID };
});

import { PATCH } from './route';

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

function patchReq(body: unknown, withCookie = true): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (withCookie) headers.cookie = 'a_session_test=abc';
  return new NextRequest('http://localhost/api/reports/rep-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers,
  });
}

beforeEach(() => {
  process.env.APPWRITE_API_KEY = 'test-key-123';
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'proj-id';
  dbInstances.length = 0;
  nextGetDocument = async () => DRAFT_REPORT;
});

afterEach(() => {
  delete process.env.APPWRITE_API_KEY;
  delete process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PATCH /api/reports/[id]', () => {
  it('rejects a request without a session cookie with 401', async () => {
    stubSession('مدير');
    const res = await PATCH(patchReq({ additionalNotes: 'x' }, false), { params: Promise.resolve({ id: 'rep-1' }) });
    expect(res.status).toBe(401);
    expect(dbInstances).toHaveLength(0);
  });

  it('rejects a technician with 403', async () => {
    stubSession('فني');
    const res = await PATCH(patchReq({ additionalNotes: 'x' }), { params: Promise.resolve({ id: 'rep-1' }) });
    expect(res.status).toBe(403);
    expect(dbInstances).toHaveLength(0);
  });

  it('edits allowed draft fields when the caller is a manager', async () => {
    stubSession('مدير');
    const res = await PATCH(patchReq({ additionalNotes: 'ملاحظة', snapshotData: '{"h":1}' }), {
      params: Promise.resolve({ id: 'rep-1' }),
    });
    expect(res.status).toBe(200);
    expect(dbInstances[0].updateDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'rep-1',
      { additionalNotes: 'ملاحظة', snapshotData: '{"h":1}' }
    );
  });

  it('refuses to add approval/status fields through this route', async () => {
    stubSession('مدير');
    const res = await PATCH(patchReq({ status: 'معتمد', reportHash: 'x'.repeat(64), additionalNotes: 'ok' }), {
      params: Promise.resolve({ id: 'rep-1' }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: expect.stringContaining('status, reportHash') });
    // The handler rejects before it ever touches the database.
    expect(dbInstances).toHaveLength(0);
  });

  it('refuses to edit an approved report with 409', async () => {
    stubSession('مدير');
    nextGetDocument = async () => APPROVED_REPORT;
    const res = await PATCH(patchReq({ additionalNotes: 'x' }), { params: Promise.resolve({ id: 'rep-1' }) });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'التقرير مُعتمد ومُقفل. لا يمكن تعديله.' });
    expect(dbInstances[0].updateDocument).not.toHaveBeenCalled();
  });

  it('returns 404 when the report does not exist', async () => {
    stubSession('مدير');
    nextGetDocument = async () => {
      throw Object.assign(new Error('missing'), { code: 404 });
    };
    const res = await PATCH(patchReq({ additionalNotes: 'x' }), { params: Promise.resolve({ id: 'rep-999' }) });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'التقرير غير موجود' });
  });
});