import type { CreateApartmentInput } from '@/lib/db/apartments';

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
