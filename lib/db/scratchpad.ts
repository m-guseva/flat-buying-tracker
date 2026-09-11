import { prisma } from './client';

const SCRATCHPAD_ID = 'main';

export async function getScratchpad(): Promise<string> {
  const row = await prisma.scratchpad.findUnique({ where: { id: SCRATCHPAD_ID } });
  return row?.content ?? '';
}

export async function saveScratchpad(content: string): Promise<void> {
  await prisma.scratchpad.upsert({
    where: { id: SCRATCHPAD_ID },
    create: { id: SCRATCHPAD_ID, content },
    update: { content },
  });
}
