// src/lib/report-hash.ts
// Shared helper for the SHA-256 hash computed at approval time. The hash is
// stored on the Report to pave the way for a future QR "Verify" feature;
// no verification UI is built in this task.

import { createHash } from 'node:crypto';
import type { ReportSnapshot } from '@/types';

export function computeReportHash(snapshot: ReportSnapshot, reportNumber: string, reviewedAt: string): string {
  const payload = JSON.stringify(snapshot) + reportNumber + reviewedAt;
  return createHash('sha256').update(payload).digest('hex');
}
