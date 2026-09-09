import { prisma } from './client';
import { fileStorage } from '../storage/fileStorage';

export async function createImage(apartmentId: string, buffer: Buffer, filename: string, order: number) {
  const filePath = await fileStorage.save(apartmentId, buffer, filename);
  return prisma.image.create({ data: { apartmentId, filePath, order } });
}

export async function appendImage(apartmentId: string, buffer: Buffer, filename: string) {
  const count = await prisma.image.count({ where: { apartmentId } });
  return createImage(apartmentId, buffer, filename, count);
}

export async function setCoverImage(apartmentId: string, imageId: string) {
  const images = await prisma.image.findMany({ where: { apartmentId }, orderBy: { order: 'asc' } });
  const chosen = images.find((image) => image.id === imageId);
  if (!chosen) return;

  const reordered = [chosen, ...images.filter((image) => image.id !== imageId)];
  await prisma.$transaction(
    reordered.map((image, index) => prisma.image.update({ where: { id: image.id }, data: { order: index } })),
  );
}
