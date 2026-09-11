import Link from 'next/link';
import type { Apartment, Image as ApartmentImage } from '@prisma/client';
import {
  formatPrice,
  formatAreaAndRooms,
  formatViewingDate,
  isUpcomingViewingDate,
  STATUS_LABELS,
} from '@/lib/apartments/format';
import { ImageCarousel } from '@/components/ImageCarousel';
import { DeleteApartmentButton } from '@/components/DeleteApartmentButton';

type ApartmentCardProps = {
  apartment: Apartment & { images: ApartmentImage[] };
};

export function ApartmentCard({ apartment }: ApartmentCardProps) {
  const price = formatPrice(apartment.price);
  const areaAndRooms = formatAreaAndRooms(apartment.livingArea, apartment.rooms);

  return (
    <Link href={`/apartments/${apartment.id}`} className="relative block glass-card overflow-hidden">
      <DeleteApartmentButton apartmentId={apartment.id} />
      <div className="aspect-[4/3] bg-white/40">
        <ImageCarousel apartmentId={apartment.id} images={apartment.images} alt={apartment.title ?? 'Apartment'} />
      </div>
      <div className="p-3 space-y-1">
        <div className="font-medium">{apartment.address ?? apartment.title ?? 'Untitled apartment'}</div>
        {price && <div className="text-indigo-700 font-medium">{price}</div>}
        {areaAndRooms && <div className="text-sm text-gray-500">{areaAndRooms}</div>}
        <div className="text-sm">
          <span className="inline-block bg-indigo-50/80 text-indigo-700 rounded-full px-2 py-0.5 text-xs font-medium">
            {STATUS_LABELS[apartment.status]}
          </span>
        </div>
        {apartment.viewingDate && (
          <div className={`text-sm ${isUpcomingViewingDate(apartment.viewingDate) ? 'text-orange-500 font-medium' : 'text-gray-500'}`}>
            Viewing: {formatViewingDate(apartment.viewingDate)}
          </div>
        )}
      </div>
    </Link>
  );
}
