import Link from 'next/link';
import type { Apartment, Image as ApartmentImage } from '@prisma/client';
import { formatPrice, formatAreaAndRooms, STATUS_LABELS } from '@/lib/apartments/format';
import { ImageCarousel } from '@/components/ImageCarousel';
import { DeleteApartmentButton } from '@/components/DeleteApartmentButton';

type ApartmentCardProps = {
  apartment: Apartment & { images: ApartmentImage[] };
};

export function ApartmentCard({ apartment }: ApartmentCardProps) {
  const price = formatPrice(apartment.price);
  const areaAndRooms = formatAreaAndRooms(apartment.livingArea, apartment.rooms);

  return (
    <Link
      href={`/apartments/${apartment.id}`}
      className="relative block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <DeleteApartmentButton apartmentId={apartment.id} />
      <div className="aspect-[4/3] bg-gray-100">
        <ImageCarousel images={apartment.images} alt={apartment.title ?? 'Apartment'} />
      </div>
      <div className="p-3 space-y-1">
        <div className="font-medium">{apartment.address ?? apartment.title ?? 'Untitled apartment'}</div>
        {price && <div>{price}</div>}
        {areaAndRooms && <div className="text-sm text-gray-500">{areaAndRooms}</div>}
        <div className="text-sm">{STATUS_LABELS[apartment.status]}</div>
      </div>
    </Link>
  );
}
