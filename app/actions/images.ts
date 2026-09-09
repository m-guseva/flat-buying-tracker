'use server';

import { revalidatePath } from 'next/cache';
import { setCoverImage, appendImage } from '@/lib/db/images';

export async function setCoverImageAction(apartmentId: string, imageId: string) {
  await setCoverImage(apartmentId, imageId);
  revalidatePath(`/apartments/${apartmentId}`);
  revalidatePath('/');
}

export async function uploadImageAction(apartmentId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await appendImage(apartmentId, buffer, file.name || `pasted-${Date.now()}.png`);
  revalidatePath(`/apartments/${apartmentId}`);
  revalidatePath('/');
}
