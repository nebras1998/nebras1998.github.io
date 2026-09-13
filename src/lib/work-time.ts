// Pure calculation helpers for hours/days used across the HR pages.
// Extracted so the logic can be unit-tested without touching Appwrite.
// Behavior is identical to the page-local implementations they replaced.

export function computeWorkHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin === startMin) return 0;
  const diff = endMin < startMin ? endMin + 24 * 60 - startMin : endMin - startMin;
  return parseFloat((diff / 60).toFixed(2));
}

export function formatWorkHours(hours: number): string {
  return hours.toFixed(2);
}

export function computeLeaveDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}