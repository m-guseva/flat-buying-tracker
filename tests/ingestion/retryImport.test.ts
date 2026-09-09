import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';

const downloadAndStoreImagesMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/ingestion/downloadAndStoreImages', () => ({
  downloadAndStoreImages: (...args: unknown[]) => downloadAndStoreImagesMock(...args),
}));

import { retryImportFromHtml } from '@/lib/ingestion/retryImport';

const immoscout24Html = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
  downloadAndStoreImagesMock.mockClear();
});

describe('retryImportFromHtml', () => {
  it('fills in null fields from the parsed HTML and downloads images', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/169009235',
    });
    createdIds.push(apartment.id);

    await retryImportFromHtml(apartment.id, immoscout24Html);

    const updated = await prisma.apartment.findUniqueOrThrow({ where: { id: apartment.id } });
    expect(updated.title).toBe('2-Zimmerwohnung mit Wintergarten in Berlin-Alt-Treptow');
    expect(updated.price).toBe(229900);
    expect(downloadAndStoreImagesMock).toHaveBeenCalledTimes(1);
    expect(downloadAndStoreImagesMock.mock.calls[0][0]).toBe(apartment.id);
    expect(downloadAndStoreImagesMock.mock.calls[0][1]).toHaveLength(4);
  });

  it('does not overwrite a field the user has already set', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/169009235',
      title: 'My custom title',
    });
    createdIds.push(apartment.id);

    await retryImportFromHtml(apartment.id, immoscout24Html);

    const updated = await prisma.apartment.findUniqueOrThrow({ where: { id: apartment.id } });
    expect(updated.title).toBe('My custom title');
    expect(updated.price).toBe(229900);
  });

  it('does not download images when the apartment already has some', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/169009235',
    });
    createdIds.push(apartment.id);
    await prisma.image.create({
      data: { apartmentId: apartment.id, filePath: `${apartment.id}/existing.jpg`, order: 0 },
    });

    await retryImportFromHtml(apartment.id, immoscout24Html);

    expect(downloadAndStoreImagesMock).not.toHaveBeenCalled();
  });
});
