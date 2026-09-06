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
import { parseManualApartmentForm } from '@/lib/apartments/formData';

export async function createManualApartmentAction(formData: FormData) {
  const apartment = await createApartment(parseManualApartmentForm(formData));
  revalidatePath('/');
  redirect(`/apartments/${apartment.id}`);
}
