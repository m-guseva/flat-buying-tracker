import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/client';

const downloadAndStoreImagesMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/ingestion/downloadAndStoreImages', () => ({
  downloadAndStoreImages: (...args: unknown[]) => downloadAndStoreImagesMock(...args),
}));

import { addApartmentFromInput } from '@/lib/ingestion/addApartment';

const immoscout24Html = readFileSync(path.join(process.cwd(), 'tests/fixtures/immoscout24.html'), 'utf-8');

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
  downloadAndStoreImagesMock.mockClear();
});

describe('addApartmentFromInput', () => {
  it('creates an apartment with source OTHER for an unrecognized URL, scraping nothing', async () => {
    const result = await addApartmentFromInput({ url: 'https://www.example.com/listing/123' });
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    createdIds.push(result.apartmentId);

    const apartment = await prisma.apartment.findUniqueOrThrow({ where: { id: result.apartmentId } });
    expect(apartment.source).toBe('OTHER');
    expect(apartment.sourceUrl).toBe('https://www.example.com/listing/123');
    expect(apartment.title).toBeNull();
    expect(downloadAndStoreImagesMock).not.toHaveBeenCalled();
  });

  it('parses uploaded ImmoScout24 HTML and creates a fully populated apartment', async () => {
    const result = await addApartmentFromInput({ html: immoscout24Html });
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    createdIds.push(result.apartmentId);

    const apartment = await prisma.apartment.findUniqueOrThrow({ where: { id: result.apartmentId } });
    expect(apartment.source).toBe('IMMOSCOUT24');
    expect(apartment.sourceUrl).toBe('https://www.immobilienscout24.de/expose/169009235');
    expect(apartment.title).toBe('2-Zimmerwohnung mit Wintergarten in Berlin-Alt-Treptow');
    expect(apartment.price).toBe(229900);
    expect(apartment.rooms).toBe(2);

    expect(downloadAndStoreImagesMock).toHaveBeenCalledTimes(1);
    expect(downloadAndStoreImagesMock.mock.calls[0][0]).toBe(result.apartmentId);
    expect(downloadAndStoreImagesMock.mock.calls[0][1]).toHaveLength(4);
  });

  it('detects a duplicate by normalized source URL and does not create a second apartment', async () => {
    const first = await addApartmentFromInput({ url: 'https://www.example.com/listing/42?ref=abc' });
    if (first.status !== 'created') throw new Error('expected created');
    createdIds.push(first.apartmentId);

    const second = await addApartmentFromInput({ url: 'https://www.example.com/listing/42?ref=xyz' });
    expect(second).toEqual({ status: 'duplicate', existingApartmentId: first.apartmentId });
  });

  it('creates a second apartment anyway when force is true', async () => {
    const first = await addApartmentFromInput({ url: 'https://www.example.com/listing/42' });
    if (first.status !== 'created') throw new Error('expected created');
    createdIds.push(first.apartmentId);

    const second = await addApartmentFromInput({ url: 'https://www.example.com/listing/42', force: true });
    if (second.status !== 'created') throw new Error('expected created');
    createdIds.push(second.apartmentId);

    expect(second.apartmentId).not.toBe(first.apartmentId);
  });
});
