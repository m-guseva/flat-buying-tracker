'use client';

import { useState, type MouseEvent } from 'react';
import Image from 'next/image';
import type { Image as ApartmentImage } from '@prisma/client';

export function ImageCarousel({ images, alt }: { images: ApartmentImage[]; alt: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    );
  }

  function goTo(nextIndex: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((nextIndex + images.length) % images.length);
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={`/api/files/${images[index].filePath}`}
        alt={alt}
        width={400}
        height={300}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(event) => goTo(index - 1, event)}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center text-sm"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(event) => goTo(index + 1, event)}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center text-sm"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
