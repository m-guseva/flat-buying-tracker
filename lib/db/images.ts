import { prisma } from './client';
import { fileStorage } from '../storage/fileStorage';

export async function createImage(apartmentId: string, buffer: Buffer, filename: string, order: number) {
  const filePath = await fileStorage.save(apartmentId, buffer, filename);
  return prisma.image.create({ data: { apartmentId, filePath, order } });
}
