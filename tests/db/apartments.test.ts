import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import {
  createApartment,
  getApartment,
  listApartments,
  updateApartment,
  updateApartmentStatus,
  deleteApartment,
  findApartmentBySourceUrl,
} from '@/lib/db/apartments';

const createdIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
});

describe('apartment repository', () => {
  it('creates an apartment with an initial status history entry', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Test flat' });
    createdIds.push(apartment.id);

    expect(apartment.status).toBe('NOT_CONTACTED');

    const fetched = await getApartment(apartment.id);
    expect(fetched?.statusHistory).toHaveLength(1);
    expect(fetched?.statusHistory[0].status).toBe('NOT_CONTACTED');
  });

  it('lists apartments newest first', async () => {
    const first = await createApartment({ source: 'MANUAL', title: 'First' });
    const second = await createApartment({ source: 'MANUAL', title: 'Second' });
    createdIds.push(first.id, second.id);

    const list = await listApartments();
    const ids = list.map((a) => a.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  it('updates fields without touching status history', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Original' });
    createdIds.push(apartment.id);

    await updateApartment(apartment.id, { title: 'Updated', price: 425000 });

    const fetched = await getApartment(apartment.id);
    expect(fetched?.title).toBe('Updated');
    expect(fetched?.price).toBe(425000);
    expect(fetched?.statusHistory).toHaveLength(1);
  });

  it('records a status history entry on status change', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Status test' });
    createdIds.push(apartment.id);

    await updateApartmentStatus(apartment.id, 'CONTACTED');

    const fetched = await getApartment(apartment.id);
    expect(fetched?.status).toBe('CONTACTED');
    expect(fetched?.statusHistory).toHaveLength(2);
    expect(fetched?.statusHistory[0].status).toBe('CONTACTED');
  });

  it('finds an apartment by source URL', async () => {
    const apartment = await createApartment({
      source: 'IMMOSCOUT24',
      sourceUrl: 'https://www.immobilienscout24.de/expose/123',
    });
    createdIds.push(apartment.id);

    const found = await findApartmentBySourceUrl('https://www.immobilienscout24.de/expose/123');
    expect(found?.id).toBe(apartment.id);
  });

  it('deletes an apartment', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'To delete' });

    await deleteApartment(apartment.id);

    const fetched = await getApartment(apartment.id);
    expect(fetched).toBeNull();
  });
});
