'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createApartment,
  updateApartment,
  updateApartmentStatus,
  type Status,
  type MaklervertragStatus,
} from '@/lib/db/apartments';
import { parseManualApartmentForm, parseApartmentPropertiesForm } from '@/lib/apartments/formData';

export async function createManualApartmentAction(formData: FormData) {
  const apartment = await createApartment(parseManualApartmentForm(formData));
  revalidatePath('/');
  redirect(`/apartments/${apartment.id}`);
}

export async function updateApartmentPropertiesAction(id: string, formData: FormData) {
  await updateApartment(id, parseApartmentPropertiesForm(formData));
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}

export async function updateApartmentStatusAction(id: string, formData: FormData) {
  const status = formData.get('status')?.toString() as Status;
  await updateApartmentStatus(id, status);
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}

export async function updateApartmentMaklervertragAction(id: string, formData: FormData) {
  const maklervertragStatus = formData.get('maklervertragStatus')?.toString() as MaklervertragStatus;
  await updateApartment(id, { maklervertragStatus });
  revalidatePath(`/apartments/${id}`);
  revalidatePath('/');
}
