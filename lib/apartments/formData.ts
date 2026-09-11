import type { CreateApartmentInput, UpdateApartmentInput } from '@/lib/db/apartments';

export function parseManualApartmentForm(formData: FormData): CreateApartmentInput {
  const title = formData.get('title')?.toString();
  const address = formData.get('address')?.toString();
  const price = formData.get('price')?.toString();
  const livingArea = formData.get('livingArea')?.toString();
  const rooms = formData.get('rooms')?.toString();

  return {
    source: 'MANUAL',
    ...(title && { title }),
    ...(address && { address }),
    ...(price && { price: Number(price) }),
    ...(livingArea && { livingArea: Number(livingArea) }),
    ...(rooms && { rooms: Number(rooms) }),
  };
}

export function parseApartmentPropertiesForm(formData: FormData): UpdateApartmentInput {
  const getString = (key: string) => formData.get(key)?.toString() || undefined;
  const getNumber = (key: string) => {
    const value = formData.get(key)?.toString();
    return value ? Number(value) : undefined;
  };
  const getBoolean = (key: string) => {
    const value = formData.get(key)?.toString();
    return value ? value === 'true' : undefined;
  };

  const result: UpdateApartmentInput = {};
  const title = getString('title');
  const address = getString('address');
  const price = getNumber('price');
  const livingArea = getNumber('livingArea');
  const rooms = getNumber('rooms');
  const floor = getString('floor');
  const balcony = getBoolean('balcony');
  const elevator = getBoolean('elevator');
  const kitchen = getBoolean('kitchen');
  const condition = getString('condition');
  const energieausweis = getString('energieausweis');
  const hausgeld = getNumber('hausgeld');
  const maklerprovisionPercent = getNumber('maklerprovisionPercent');
  const locationRating = getNumber('locationRating');
  const personalRating = getNumber('personalRating');

  if (title !== undefined) result.title = title;
  if (address !== undefined) result.address = address;
  if (price !== undefined) result.price = price;
  if (livingArea !== undefined) result.livingArea = livingArea;
  if (rooms !== undefined) result.rooms = rooms;
  if (floor !== undefined) result.floor = floor;
  if (balcony !== undefined) result.balcony = balcony;
  if (elevator !== undefined) result.elevator = elevator;
  if (kitchen !== undefined) result.kitchen = kitchen;
  if (condition !== undefined) result.condition = condition;
  if (energieausweis !== undefined) result.energieausweis = energieausweis;
  if (hausgeld !== undefined) result.hausgeld = hausgeld;
  if (maklerprovisionPercent !== undefined) result.maklerprovisionPercent = maklerprovisionPercent;
  if (locationRating !== undefined) result.locationRating = locationRating;
  if (personalRating !== undefined) result.personalRating = personalRating;

  return result;
}
