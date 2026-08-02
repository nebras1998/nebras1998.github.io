import { REPORTS_BUCKET_ID } from '@/lib/constants';
import { storage } from '@/lib/appwrite';

export async function listFiles() {
  return storage.listFiles(REPORTS_BUCKET_ID);
}

export async function getFile(fileId: string) {
  return storage.getFile(REPORTS_BUCKET_ID, fileId);
}

export async function createFile(file: File) {
  return storage.createFile(REPORTS_BUCKET_ID, 'unique()', file);
}

export async function deleteFile(fileId: string) {
  return storage.deleteFile(REPORTS_BUCKET_ID, fileId);
}

export function getFileViewUrl(fileId: string): string {
  return storage.getFileView(REPORTS_BUCKET_ID, fileId).toString();
}

export function getFileDownloadUrl(fileId: string): string {
  return storage.getFileDownload(REPORTS_BUCKET_ID, fileId).toString();
}

export function getFilePreviewUrl(fileId: string): string {
  return storage.getFilePreview(REPORTS_BUCKET_ID, fileId).toString();
}

export function getFileDownload(fileId: string): string {
  return storage.getFileDownload(REPORTS_BUCKET_ID, fileId).toString();
}

export async function createFileWithId(fileId: string, file: File) {
  return storage.createFile(REPORTS_BUCKET_ID, fileId, file);
}
