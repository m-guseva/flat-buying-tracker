import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db/client';
import { createApartment } from '@/lib/db/apartments';
import { addProConItem, updateProConItem, deleteProConItem } from '@/lib/db/proCons';

const createdApartmentIds: string[] = [];

afterEach(async () => {
  await prisma.apartment.deleteMany({ where: { id: { in: createdApartmentIds } } });
  createdApartmentIds.length = 0;
});

describe('pro/con repository', () => {
  it('adds a pro item with default text and weight, ordered after existing items of the same type', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Pro/con test' });
    createdApartmentIds.push(apartment.id);

    const first = await addProConItem(apartment.id, 'PRO');
    const second = await addProConItem(apartment.id, 'PRO');

    expect(first.type).toBe('PRO');
    expect(first.text).toBe('');
    expect(first.weight).toBe(3);
    expect(first.order).toBe(0);
    expect(second.order).toBe(1);
  });

  it('orders pros and cons independently', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Independent order test' });
    createdApartmentIds.push(apartment.id);

    await addProConItem(apartment.id, 'PRO');
    const firstCon = await addProConItem(apartment.id, 'CON');
    const secondPro = await addProConItem(apartment.id, 'PRO');

    expect(firstCon.order).toBe(0);
    expect(secondPro.order).toBe(1);
  });

  it('updates text and weight independently', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Update test' });
    createdApartmentIds.push(apartment.id);
    const item = await addProConItem(apartment.id, 'CON');

    await updateProConItem(item.id, { text: 'Noisy street' });
    let updated = await prisma.proConItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.text).toBe('Noisy street');
    expect(updated.weight).toBe(3);

    await updateProConItem(item.id, { weight: 5 });
    updated = await prisma.proConItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(updated.text).toBe('Noisy street');
    expect(updated.weight).toBe(5);
  });

  it('deletes an item', async () => {
    const apartment = await createApartment({ source: 'MANUAL', title: 'Delete test' });
    createdApartmentIds.push(apartment.id);
    const item = await addProConItem(apartment.id, 'PRO');

    await deleteProConItem(item.id);

    const found = await prisma.proConItem.findUnique({ where: { id: item.id } });
    expect(found).toBeNull();
  });
});
