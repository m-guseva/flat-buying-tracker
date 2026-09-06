import { prisma } from './client';
import { fileStorage } from '../storage/fileStorage';

export async function createDocument(apartmentId: string, buffer: Buffer, filename: string, fileType: string) {
  const filePath = await fileStorage.save(apartmentId, buffer, filename);
  return prisma.document.create({ data: { apartmentId, filename, fileType, filePath } });
}

export async function deleteDocument(id: string) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id } });
  await fileStorage.delete(document.filePath);
  await prisma.document.delete({ where: { id } });
}
