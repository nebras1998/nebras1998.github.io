import { VEHICLES_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument } from './base';
import type { PaginatedResult } from '@/types';

export interface Vehicle {
  $id: string;
  $createdAt: string;
  plateNumber: string;
  brand: string;
  model: string;
  year?: string;
  type?: string;
  color?: string;
  status: string;
  notes?: string;
}

const COL = VEHICLES_COLLECTION_ID;

export async function listVehicles(queries: string[] = []): Promise<PaginatedResult<Vehicle>> {
  return listDocuments<Vehicle>(COL, queries);
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return getDocument<Vehicle>(COL, id);
}

export async function createVehicle(id: string, data: Record<string, unknown>): Promise<Vehicle> {
  return createDocument<Vehicle>(COL, id, data);
}

export async function updateVehicle(id: string, data: Record<string, unknown>): Promise<Vehicle> {
  return updateDocument<Vehicle>(COL, id, data);
}

export async function deleteVehicle(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
