'use server';

import { revalidatePath } from 'next/cache';
import { createDocument, deleteDocument } from '@/lib/db/documents';

export async function uploadDocumentAction(apartmentId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await createDocument(apartmentId, buffer, file.name, file.type || 'application/octet-stream');
  revalidatePath(`/apartments/${apartmentId}`);
}

export async function deleteDocumentAction(apartmentId: string, documentId: string) {
  await deleteDocument(documentId);
  revalidatePath(`/apartments/${apartmentId}`);
}
