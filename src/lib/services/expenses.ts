import { EXPENSES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument } from './base';
import type { Expense, PaginatedResult } from '@/types';

const COL = EXPENSES_COLLECTION_ID;

export async function listExpenses(queries: string[] = []): Promise<PaginatedResult<Expense>> {
  return listDocuments<Expense>(COL, queries);
}

export async function getExpense(id: string): Promise<Expense> {
  return getDocument<Expense>(COL, id);
}

export async function createExpense(id: string, data: Record<string, unknown>): Promise<Expense> {
  return createDocument<Expense>(COL, id, data);
}

export async function updateExpense(id: string, data: Record<string, unknown>): Promise<Expense> {
  return updateDocument<Expense>(COL, id, data);
}

export async function deleteExpense(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
