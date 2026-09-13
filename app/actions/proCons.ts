'use server';

import { revalidatePath } from 'next/cache';
import { addProConItem, updateProConItem, deleteProConItem, type ProConType } from '@/lib/db/proCons';
import { assertNotReadOnly } from '@/lib/readOnly';

export async function addProConItemAction(apartmentId: string, type: ProConType) {
  assertNotReadOnly();
  const item = await addProConItem(apartmentId, type);
  revalidatePath(`/apartments/${apartmentId}`);
  return item;
}

export async function updateProConItemAction(apartmentId: string, itemId: string, data: { text?: string; weight?: number }) {
  assertNotReadOnly();
  await updateProConItem(itemId, data);
  revalidatePath(`/apartments/${apartmentId}`);
}

export async function deleteProConItemAction(apartmentId: string, itemId: string) {
  assertNotReadOnly();
  await deleteProConItem(itemId);
  revalidatePath(`/apartments/${apartmentId}`);
}
