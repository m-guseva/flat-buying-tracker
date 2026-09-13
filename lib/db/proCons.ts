import { prisma } from './client';

export type ProConType = 'PRO' | 'CON';

export async function addProConItem(apartmentId: string, type: ProConType) {
  const count = await prisma.proConItem.count({ where: { apartmentId, type } });
  return prisma.proConItem.create({ data: { apartmentId, type, order: count } });
}

export async function updateProConItem(id: string, data: { text?: string; weight?: number }) {
  return prisma.proConItem.update({ where: { id }, data });
}

export async function deleteProConItem(id: string) {
  await prisma.proConItem.delete({ where: { id } });
}
