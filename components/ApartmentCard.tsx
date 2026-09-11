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
      <div className="aspect-[4/3] bg-white/40 dark:bg-white/5">
        <ImageCarousel apartmentId={apartment.id} images={apartment.images} alt={apartment.title ?? 'Apartment'} />
      </div>
      <div className="p-3 space-y-1">
        <div className="font-medium">{apartment.address ?? apartment.title ?? 'Untitled apartment'}</div>
        {price && <div className="text-[var(--accent-1)] font-medium">{price}</div>}
        {areaAndRooms && <div className="text-sm text-gray-500 dark:text-white/40">{areaAndRooms}</div>}
        <div className="text-sm">
          <span className="status-pill">{STATUS_LABELS[apartment.status]}</span>
        </div>
        {apartment.viewingDate && (
          <div
            className={`text-sm ${
              isUpcomingViewingDate(apartment.viewingDate)
                ? 'text-rose-600 dark:text-rose-400 font-medium'
                : 'text-gray-500 dark:text-white/40'
            }`}
          >
            Viewing: {formatViewingDate(apartment.viewingDate)}
          </div>
        )}
      </div>
    </Link>
  );
}
