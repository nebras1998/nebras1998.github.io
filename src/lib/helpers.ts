import { databases } from '@/lib/appwrite';
import { DATABASE_ID, TESTS_COLLECTION_ID } from '@/lib/constants';
import { Query } from 'appwrite';

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