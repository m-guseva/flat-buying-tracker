'use server';

import { revalidatePath } from 'next/cache';
import { createDocument, deleteDocument } from '@/lib/db/documents';

// Next.js 14.2.35's direct server-action invocation (calling this action
// straight from a client event handler, not a <form> submit) mis-decodes
// non-ASCII File.name values as Latin-1 instead of UTF-8 before this
// function ever sees them, corrupting names like "Müllerstraße.pdf" into
// mojibake. This reverses that specific mis-decode by re-interpreting the
// string's char codes as Latin-1 bytes and decoding those as UTF-8.
//
// Guarded against becoming a corrupter itself: if a future Next.js patch
// fixes the upstream bug, or this action is ever called via a real <form>
// submit (which parses multipart correctly), running this reinterpretation
// on an already-correct name will produce invalid UTF-8 byte sequences —
// detectable as the replacement character (U+FFFD) — so we only apply the
// fix when the result contains no U+FFFD.
function fixMojibake(name: string): string {
  const reinterpreted = Buffer.from(name, 'latin1').toString('utf8');
  return reinterpreted.includes('�') ? name : reinterpreted;
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
