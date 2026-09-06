import Link from 'next/link';
import Image from 'next/image';
import type { Apartment, Image as ApartmentImage } from '@prisma/client';
import { formatPrice, formatAreaAndRooms, STATUS_LABELS } from '@/lib/apartments/format';

type ApartmentCardProps = {
  apartment: Apartment & { images: ApartmentImage[] };
};

export function ApartmentCard({ apartment }: ApartmentCardProps) {
  const image = apartment.images[0];
  const price = formatPrice(apartment.price);
  const areaAndRooms = formatAreaAndRooms(apartment.livingArea, apartment.rooms);

  return (
    <Link
      href={`/apartments/${apartment.id}`}
      className="block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
        {image ? (
          <Image
            src={`/api/files/${image.filePath}`}
            alt={apartment.title ?? 'Apartment'}
            width={400}
            height={300}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-400 text-sm">No image</span>
        )}
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
