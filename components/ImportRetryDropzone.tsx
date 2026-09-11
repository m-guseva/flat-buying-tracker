'use client';

import { useState, useTransition, type DragEvent, type ChangeEvent } from 'react';
import { retryImportFromHtmlAction } from '@/app/actions/apartments';

export function ImportRetryDropzone({ apartmentId }: { apartmentId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    const formData = new FormData();
    formData.set('file', file);
    startTransition(() => {
      retryImportFromHtmlAction(apartmentId, formData);
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) upload(file);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) upload(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={
        isDragging
          ? 'drop-active border-2 border-dashed backdrop-blur-sm rounded-xl p-4 text-center space-y-2'
          : 'border-2 border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-500/10 backdrop-blur-sm rounded-xl p-4 text-center space-y-2'
      }
    >
      <p className="text-sm text-gray-700 dark:text-amber-200/80">
        {isPending ? 'Importing…' : 'Automatic import failed — drop the saved page here to fill in details automatically'}
      </p>
      <input type="file" accept=".html,.htm" onChange={handleChange} />
    </div>
  );
}
