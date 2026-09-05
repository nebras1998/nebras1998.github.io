import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { Databases } from 'node-appwrite';

vi.mock('node-appwrite', () => {
  const Client = vi.fn().mockImplementation(() => {
    const self: Record<string, unknown> = {
      setEndpoint: vi.fn(() => self),
      setProject: vi.fn(() => self),
      setKey: vi.fn(() => self),
    };
    return self;
  });
  const Databases = vi.fn().mockImplementation(() => ({
    listDocuments: vi.fn(),
  }));
  const Query = {
    equal: vi.fn((field: string, value: string) => `equal(${field},${value})`),
    limit: vi.fn((n: number) => `limit(${n})`),
    select: vi.fn((fields: string[]) => `select(${fields.join(',')})`),
  };
  return { Client, Databases, Query };
});

import { GET } from './route';

const DB_MOCK = vi.mocked(Databases);

function req(url: string, ip: string): NextRequest {
  return new NextRequest(url, {
    headers: { 'x-forwarded-for': ip },
  });
}

function setListDocuments(result: { documents: unknown[] }): void {
  DB_MOCK.mockImplementation(() => ({
    listDocuments: vi.fn().mockResolvedValue(result),
  }));
}

const VALID_HASH = 'a'.repeat(64);

beforeEach(() => {
  process.env.APPWRITE_API_KEY = 'test-key-123';
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT = 'http://localhost/v1';
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID = 'proj-id';
  setListDocuments({ documents: [] });
});

afterEach(() => {
  delete process.env.APPWRITE_API_KEY;
  delete process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  vi.clearAllMocks();
});

describe('GET /api/reports/verify', () => {
  it('rejects an invalid hash with 400', async () => {
    const res = await GET(req('http://localhost/api/reports/verify?hash=zzz&no=RPT-1', '10.0.0.1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'بصمة غير صالحة' });
    expect(DB_MOCK).not.toHaveBeenCalled();
  });

  it('rejects a missing report number with 400', async () => {
    const res = await GET(req(`http://localhost/api/reports/verify?hash=${VALID_HASH}`, '10.0.0.2'));
    expect(res.status).toBe(400);
  });

  it('rate limits the same IP after 20 requests', async () => {
    const ip = '203.0.113.9';
    for (let i = 1; i <= 20; i++) {
      const res = await GET(req('http://localhost/api/reports/verify?hash=zzz&no=RPT-1', ip));
      expect(res.status).toBe(400);
    }
    const blocked = await GET(req(`http://localhost/api/reports/verify?hash=${VALID_HASH}&no=RPT-1`, ip));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'طلبات كثيرة. حاول لاحقًا.' });
  });

  it('returns verified:false when no document matches the hash', async () => {
    const res = await GET(req(`http://localhost/api/reports/verify?hash=${VALID_HASH}&no=RPT-NOT-FOUND`, '10.0.0.3'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: false });
  });

  it('returns verified:true with report details when the hashes match', async () => {
    setListDocuments({
      documents: [
        {
          reportNumber: 'RPT-2026-0001',
          reportHash: VALID_HASH,
          status: 'معتمد',
          reviewedAt: '2026-01-01T00:00:00.000Z',
          reviewedBy: 'م. أحمد',
          testId: 't1',
        },
      ],
    });
    const res = await GET(req(`http://localhost/api/reports/verify?hash=${VALID_HASH}&no=RPT-2026-0001`, '10.0.0.4'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      verified: true,
      reportNumber: 'RPT-2026-0001',
      testId: 't1',
      status: 'معتمد',
      reviewedAt: '2026-01-01T00:00:00.000Z',
      reviewedBy: 'م. أحمد',
    });
  });

  it('returns 503 when the API key is not configured', async () => {
    delete process.env.APPWRITE_API_KEY;
    const res = await GET(req(`http://localhost/api/reports/verify?hash=${VALID_HASH}&no=RPT-1`, '10.0.0.5'));
    expect(res.status).toBe(503);
  });
});