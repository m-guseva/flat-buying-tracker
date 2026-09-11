'use server';

import { revalidatePath } from 'next/cache';
import { saveScratchpad } from '@/lib/db/scratchpad';
import { assertNotReadOnly } from '@/lib/readOnly';

export async function updateScratchpadAction(content: string) {
  assertNotReadOnly();
  await saveScratchpad(content);
  revalidatePath('/scratchpad');
}
