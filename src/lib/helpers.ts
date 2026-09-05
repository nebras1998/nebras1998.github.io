import { databases } from '@/lib/appwrite';
import { DATABASE_ID, PROJECTS_COLLECTION_ID, TESTS_COLLECTION_ID } from '@/lib/constants';
import { Query } from 'appwrite';

export async function generateUniqueProjectNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PRJ-${currentYear}-`;

  let nextNumber = 1;
  try {
    const response = await databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [
      Query.startsWith('projectNumber', prefix),
      Query.orderDesc('projectNumber'),
      Query.limit(1),
    ]);
    if (response.documents.length > 0) {
      const lastNumber = response.documents[0].projectNumber.split('-').pop();
      if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
    }
  } catch {}

  let isUnique = false;
  let newNumber = '';
  while (!isUnique) {
    const padded = String(nextNumber).padStart(3, '0');
    newNumber = `${prefix}${padded}`;
    try {
      const check = await databases.listDocuments(DATABASE_ID, PROJECTS_COLLECTION_ID, [
        Query.equal('projectNumber', newNumber),
        Query.limit(1),
      ]);
      if (check.documents.length === 0) isUnique = true;
      else nextNumber++;
    } catch { isUnique = true; }
  }
  return newNumber;
}

export function formatDateAr(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ar-EG');
}

export async function generateTestNumber(code: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `TST-${currentYear}-${code}-`;

  let nextNumber = 1;
  try {
    const response = await databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [
      Query.startsWith('testNumber', prefix),
      Query.orderDesc('testNumber'),
      Query.limit(1),
    ]);
    if (response.documents.length > 0) {
      const lastNumber = response.documents[0].testNumber.split('-').pop();
      if (lastNumber) nextNumber = parseInt(lastNumber, 10) + 1;
    }
  } catch {}

  let isUnique = false;
  let newNumber = '';
  while (!isUnique) {
    const padded = String(nextNumber).padStart(5, '0');
    newNumber = `${prefix}${padded}`;
    try {
      const check = await databases.listDocuments(DATABASE_ID, TESTS_COLLECTION_ID, [
        Query.equal('testNumber', newNumber),
        Query.limit(1),
      ]);
      if (check.documents.length === 0) isUnique = true;
      else nextNumber++;
    } catch { isUnique = true; }
  }
  return newNumber;
}