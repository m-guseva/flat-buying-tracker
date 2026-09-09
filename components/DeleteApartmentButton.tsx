'use client';

import { useTransition, type MouseEvent } from 'react';
import { deleteApartmentAction } from '@/app/actions/apartments';

export function DeleteApartmentButton({ apartmentId }: { apartmentId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm('Delete this apartment? This removes all its documents and photos and cannot be undone.')) {
      return;
    }
    startTransition(() => {
      deleteApartmentAction(apartmentId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Delete apartment"
      className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
    >
      {isPending ? '…' : '🗑'}
    </button>
  );
}
