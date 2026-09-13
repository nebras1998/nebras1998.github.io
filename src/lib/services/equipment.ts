import { EQUIPMENT_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument } from './base';
import type { Equipment, PaginatedResult } from '@/types';

const COL = EQUIPMENT_COLLECTION_ID;

export async function listEquipment(queries: string[] = []): Promise<PaginatedResult<Equipment>> {
  return listDocuments<Equipment>(COL, queries);
}

export async function getEquipment(id: string): Promise<Equipment> {
  return getDocument<Equipment>(COL, id);
}

export async function createEquipment(id: string, data: Record<string, unknown>): Promise<Equipment> {
  return createDocument<Equipment>(COL, id, data);
}

export async function updateEquipment(id: string, data: Record<string, unknown>): Promise<Equipment> {
  return updateDocument<Equipment>(COL, id, data);
}

export async function deleteEquipment(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
