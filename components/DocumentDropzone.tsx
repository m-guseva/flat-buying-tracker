'use client';

import { useState, useTransition, type DragEvent, type ChangeEvent } from 'react';
import { uploadDocumentAction } from '@/app/actions/documents';

export function DocumentDropzone({ apartmentId }: { apartmentId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  function uploadFiles(files: FileList) {
    Array.from(files).forEach((file) => {
      const formData = new FormData();
      formData.set('file', file);
      startTransition(() => {
        uploadDocumentAction(apartmentId, formData);
      });
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      uploadFiles(event.dataTransfer.files);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      uploadFiles(event.target.files);
    }
  }

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={
        isDragging
          ? 'border-2 border-dashed border-indigo-400 bg-indigo-50/60 backdrop-blur-sm rounded-xl p-6 text-center space-y-2'
          : 'border-2 border-dashed border-white/70 bg-white/40 backdrop-blur-sm rounded-xl p-6 text-center space-y-2'
      }
    >
      <p className="text-sm text-gray-500">{isPending ? 'Uploading…' : '+ Drop files here'}</p>
      <input type="file" multiple onChange={handleChange} />
    </div>
  );
}
