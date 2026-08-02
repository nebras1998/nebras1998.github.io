import { BOOKINGS_COLLECTION_ID } from '@/lib/constants';
import { listDocuments, getDocument, createDocument, updateDocument, deleteDocument, Query } from './base';
import type { Booking, PaginatedResult } from '@/types';

const COL = BOOKINGS_COLLECTION_ID;

export async function listBookings(queries: string[] = []): Promise<PaginatedResult<Booking>> {
  return listDocuments<Booking>(COL, queries);
}

export async function getBooking(id: string): Promise<Booking> {
  return getDocument<Booking>(COL, id);
}

export async function createBooking(id: string, data: Record<string, unknown>): Promise<Booking> {
  return createDocument<Booking>(COL, id, data);
}

export async function updateBooking(id: string, data: Record<string, unknown>): Promise<Booking> {
  return updateDocument<Booking>(COL, id, data);
}

export async function deleteBooking(id: string): Promise<void> {
  return deleteDocument(COL, id);
}
