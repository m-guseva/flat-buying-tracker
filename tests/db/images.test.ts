import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';
import { createImage } from '@/lib/db/images';

const createdApartmentIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdApartmentIds } } });
  createdApartmentIds.length = 0;
});

describe('image repository', () => {
  it('creates an image and stores its file', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Image test' });
    createdApartmentIds.push(apartment.id);

    const image = await createImage(apartment.id, Buffer.from('jpeg bytes'), 'photo.jpg', 0);

    expect(image.order).toBe(0);
    expect(image.filePath).toContain(apartment.id);
  });
});
