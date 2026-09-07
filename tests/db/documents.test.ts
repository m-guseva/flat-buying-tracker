import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';
import { createDocument, deleteDocument } from '@/lib/db/documents';

const createdApartmentIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdApartmentIds } } });
  // Cascade delete removes the DB rows, but not the files on disk (that only
  // happens via deleteDocument's explicit unlink) — clean up each
  // apartment's storage directory so test runs don't leak files under
  // data/files/.
  await Promise.all(
    createdApartmentIds.map((id) =>
      rm(path.join(process.cwd(), 'data', 'files', id), { recursive: true, force: true })
    )
  );
  createdApartmentIds.length = 0;
});

describe('document repository', () => {
  it('creates a document and stores its file', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Doc test' });
    createdApartmentIds.push(apartment.id);

    const document = await createDocument(apartment.id, Buffer.from('pdf bytes'), 'expose.pdf', 'application/pdf');

    expect(document.filename).toBe('expose.pdf');
    expect(document.filePath).toContain(apartment.id);
  });

  it('deletes a document and its stored file', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Doc delete test' });
    createdApartmentIds.push(apartment.id);
    const document = await createDocument(apartment.id, Buffer.from('pdf bytes'), 'expose.pdf', 'application/pdf');

    await deleteDocument(document.id);

    const found = await prisma.document.findUnique({ where: { id: document.id } });
    expect(found).toBeNull();
  });
});
