'use client';

import { useState, useTransition, type MouseEvent } from 'react';
import Image from 'next/image';
import type { Image as ApartmentImage } from '@prisma/client';
import { setCoverImageAction } from '@/app/actions/images';

export function ImageCarousel({
  apartmentId,
  images,
  alt,
  allowSetCover = false,
}: {
  apartmentId: string;
  images: ApartmentImage[];
  alt: string;
  allowSetCover?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(images[0]?.id);
  const [isPending, startTransition] = useTransition();

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    );
  }

  // Track the viewed image by id, not position: after "set as cover"
  // reorders the images prop, the same photo must stay on screen even
  // though its index in the array just changed.
  const index = Math.max(images.findIndex((image) => image.id === selectedId), 0);
  const current = images[index];

  function goTo(nextIndex: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(images[(nextIndex + images.length) % images.length].id);
  }

  function handleSetCover(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (index === 0) return;
    startTransition(() => {
      setCoverImageAction(apartmentId, current.id);
    });
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={`/api/files/${current.filePath}`}
        alt={alt}
        width={400}
        height={300}
        className="w-full h-full object-cover"
      />
      {allowSetCover && images.length > 1 && (
        <button
          type="button"
          aria-label={index === 0 ? 'Current cover photo' : 'Set as cover photo'}
          onClick={handleSetCover}
          disabled={isPending || index === 0}
          className={`absolute top-1 left-1 rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-md border backdrop-blur-sm transition-colors ${
            index === 0
              ? 'bg-amber-400/90 border-amber-300 text-white cursor-default'
              : 'bg-white/80 border-white/60 text-gray-500 hover:text-amber-500'
          }`}
        >
          {index === 0 ? '★' : '☆'}
        </button>
      )}
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => goTo(index - 1, event)}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm border border-white/60 shadow-md rounded-full w-6 h-6 flex items-center justify-center text-sm"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => goTo(index + 1, event)}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm border border-white/60 shadow-md rounded-full w-6 h-6 flex items-center justify-center text-sm"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
