'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createApartment,
  updateApartment,
  updateApartmentStatus,
  deleteApartment,
  type Status,
  type MaklervertragStatus,
} from '@/lib/db/apartments';
import { parseManualApartmentForm, parseApartmentPropertiesForm } from '@/lib/apartments/formData';
import { addApartmentFromInput, type AddApartmentResult } from '@/lib/ingestion/addApartment';
import { retryImportFromHtml } from '@/lib/ingestion/retryImport';
import { assertNotReadOnly } from '@/lib/readOnly';

export async function createManualApartmentAction(formData: FormData) {
  assertNotReadOnly();
  const apartment = await createApartment(parseManualApartmentForm(formData));
  revalidatePath('/');
  redirect(`/apartments/${apartment.id}`);
}

export async function updateApartmentPropertiesAction(id: string, formData: FormData) {
  assertNotReadOnly();
  await updateApartment(id, parseApartmentPropertiesForm(formData));
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}

export async function updateApartmentStatusAction(id: string, formData: FormData) {
  assertNotReadOnly();
  const status = formData.get('status')?.toString() as Status;
  await updateApartmentStatus(id, status);
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}

export async function updateApartmentMaklervertragAction(id: string, formData: FormData) {
  assertNotReadOnly();
  const maklervertragStatus = formData.get('maklervertragStatus')?.toString() as MaklervertragStatus;
  await updateApartment(id, { maklervertragStatus });
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}

export async function updateApartmentNotesAction(id: string, notes: string) {
  assertNotReadOnly();
  await updateApartment(id, { notes });
  revalidatePath(`/apartments/${id}`);
}

export async function deleteApartmentAction(id: string) {
  assertNotReadOnly();
  await deleteApartment(id);
  revalidatePath('/');
}

export async function addApartmentAction(formData: FormData): Promise<AddApartmentResult> {
  assertNotReadOnly();
  const url = formData.get('url')?.toString() || undefined;
  const file = formData.get('file');
  const force = formData.get('force') === 'true';
  const html = file instanceof File ? await file.text() : undefined;

  const result = await addApartmentFromInput({ url, html, force });
  if (result.status === 'created') {
    revalidatePath('/');
  }
  return result;
}

export async function retryImportFromHtmlAction(apartmentId: string, formData: FormData) {
  assertNotReadOnly();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  const html = await file.text();
  await retryImportFromHtml(apartmentId, html);
  revalidatePath(`/apartments/${apartmentId}`);
  revalidatePath('/');
}
