import { VEHICLE_TRIPS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { PaginatedResult } from '@/types';

export interface VehicleTrip {
  $id: string;
  $createdAt: string;
  vehicleId: string;
  driverId: string;
  companionId?: string;
  destination: string;
  departureTime: string;
  returnTime?: string;
  purpose?: string;
  startMileage?: string;
  endMileage?: string;
  status: string;
  notes?: string;
}

const COL = VEHICLE_TRIPS_COLLECTION_ID;

export async function listVehicleTrips(queries: string[] = []): Promise<PaginatedResult<VehicleTrip>> {
  return listDocuments<VehicleTrip>(COL, queries);
}

export async function getVehicleTrip(id: string): Promise<VehicleTrip> {
  return getDocument<VehicleTrip>(COL, id);
}

export async function createVehicleTrip(id: string, data: Record<string, unknown>): Promise<VehicleTrip> {
  return createDocument<VehicleTrip>(COL, id, data);
}

export async function updateVehicleTrip(id: string, data: Record<string, unknown>): Promise<VehicleTrip> {
  return updateDocument<VehicleTrip>(COL, id, data);
}

export async function deleteVehicleTrip(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
