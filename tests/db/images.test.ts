import { describe, it, expect, afterEach } from 'vitest';
import { rm } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';
import { createImage, setCoverImage, appendImage } from '@/lib/db/images';

const createdApartmentIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdApartmentIds } } });
  // Cascade delete removes the DB rows, but not the files on disk — clean up
  // each apartment's storage directory so test runs don't leak files under
  // data/files/.
  await Promise.all(
    createdApartmentIds.map((id) =>
      rm(path.join(process.cwd(), 'data', 'files', id), { recursive: true, force: true })
    )
  );
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

  it('moves the chosen image to the front, keeping the rest in order behind it', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Cover test' });
    createdApartmentIds.push(apartment.id);

    const first = await createImage(apartment.id, Buffer.from('one'), 'one.jpg', 0);
    const second = await createImage(apartment.id, Buffer.from('two'), 'two.jpg', 1);
    const third = await createImage(apartment.id, Buffer.from('three'), 'three.jpg', 2);

    await setCoverImage(apartment.id, third.id);

    const images = await prisma.image.findMany({ where: { apartmentId: apartment.id }, orderBy: { order: 'asc' } });
    expect(images.map((image) => image.id)).toEqual([third.id, first.id, second.id]);
    expect(images.map((image) => image.order)).toEqual([0, 1, 2]);
  });

  it('leaves order unchanged when the chosen image is already the cover', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Already cover' });
    createdApartmentIds.push(apartment.id);

    const first = await createImage(apartment.id, Buffer.from('one'), 'one.jpg', 0);
    const second = await createImage(apartment.id, Buffer.from('two'), 'two.jpg', 1);

    await setCoverImage(apartment.id, first.id);

    const images = await prisma.image.findMany({ where: { apartmentId: apartment.id }, orderBy: { order: 'asc' } });
    expect(images.map((image) => image.id)).toEqual([first.id, second.id]);
  });

  it('appends a new image after any existing ones', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Append test' });
    createdApartmentIds.push(apartment.id);

    await createImage(apartment.id, Buffer.from('one'), 'one.jpg', 0);
    await createImage(apartment.id, Buffer.from('two'), 'two.jpg', 1);

    const appended = await appendImage(apartment.id, Buffer.from('three'), 'three.jpg');

    expect(appended.order).toBe(2);
    const images = await prisma.image.findMany({ where: { apartmentId: apartment.id }, orderBy: { order: 'asc' } });
    expect(images.map((image) => image.order)).toEqual([0, 1, 2]);
  });

  it('appends at order 0 when the apartment has no images yet', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'First append' });
    createdApartmentIds.push(apartment.id);

    const appended = await appendImage(apartment.id, Buffer.from('one'), 'one.jpg');

    expect(appended.order).toBe(0);
  });
});
