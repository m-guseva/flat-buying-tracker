'use server';

import { revalidatePath } from 'next/cache';
import { createDocument, deleteDocument } from '@/lib/db/documents';

function fixMojibake(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}

export async function uploadDocumentAction(apartmentId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await createDocument(apartmentId, buffer, fixMojibake(file.name), file.type || 'application/octet-stream');
  revalidatePath(`/apartments/${apartmentId}`);
}

export async function deleteDocumentAction(apartmentId: string, documentId: string) {
  await deleteDocument(documentId);
  revalidatePath(`/apartments/${apartmentId}`);
}
