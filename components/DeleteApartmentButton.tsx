'use client';

import { useTransition, type MouseEvent } from 'react';
import { deleteApartmentAction } from '@/app/actions/apartments';
import { isReadOnly } from '@/lib/readOnly';

export function DeleteApartmentButton({ apartmentId }: { apartmentId: string }) {
  const [isPending, startTransition] = useTransition();
  if (isReadOnly()) return null;

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
      className="absolute top-2 right-2 z-10 bg-white/80 dark:bg-black/40 backdrop-blur-sm hover:bg-red-50/90 dark:hover:bg-red-950/50 text-gray-500 dark:text-white/50 hover:text-red-600 dark:hover:text-red-400 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-md dark:shadow-none border border-white/60 dark:border-white/10 transition-colors"
    >
      {isPending ? '…' : '🗑'}
    </button>
  );
}
