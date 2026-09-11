'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') router.back();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 sm:p-8">
      <div className="absolute inset-0" onClick={() => router.back()} aria-hidden="true" />
      <div className="relative glass-panel bg-white/90 dark:bg-[#141019]/90 w-full max-w-2xl my-8 p-6 shadow-2xl dark:shadow-black/50">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-3 right-3 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/80 dark:hover:bg-white/10"
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
