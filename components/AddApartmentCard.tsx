'use client';

import { useState, useRef, useTransition, type DragEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addApartmentAction } from '@/app/actions/apartments';

const PROGRESS_MESSAGES = ['Fetching listing…', 'Extracting apartment information…', 'Loading images…'];

type CardState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'duplicate'; existingApartmentId: string; pendingFormData: FormData };

export function AddApartmentCard() {
  const router = useRouter();
  const [state, setState] = useState<CardState>({ phase: 'idle' });
  const [progressIndex, setProgressIndex] = useState(0);
  const [urlValue, setUrlValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  function beginSubmit(formData: FormData) {
    setState({ phase: 'submitting' });
    setProgressIndex(0);
    timerRef.current = setInterval(() => {
      setProgressIndex((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
    }, 1000);

    startTransition(async () => {
      try {
        const result = await addApartmentAction(formData);
        if (timerRef.current) clearInterval(timerRef.current);

        if (result.status === 'duplicate') {
          setState({ phase: 'duplicate', existingApartmentId: result.existingApartmentId, pendingFormData: formData });
        } else {
          router.push(`/apartments/${result.apartmentId}`);
        }
      } catch (error) {
        if (timerRef.current) clearInterval(timerRef.current);
        console.error('Failed to add apartment:', error);
        setState({ phase: 'idle' });
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!urlValue.trim()) return;
    const formData = new FormData();
    formData.set('url', urlValue.trim());
    beginSubmit(formData);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      const formData = new FormData();
      formData.set('file', file);
      beginSubmit(formData);
      return;
    }

    const droppedUrl = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
    if (droppedUrl.trim()) {
      const formData = new FormData();
      formData.set('url', droppedUrl.trim());
      beginSubmit(formData);
    }
  }

  function handleCreateAnyway() {
    if (state.phase !== 'duplicate') return;
    state.pendingFormData.set('force', 'true');
    beginSubmit(state.pendingFormData);
  }

  const baseClass = 'flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed aspect-[4/3] p-4 text-center';

  if (state.phase === 'duplicate') {
    return (
      <div className={`${baseClass} border-gray-300 gap-2`}>
        <p className="font-medium">This listing may already exist.</p>
        <Link href={`/apartments/${state.existingApartmentId}`} className="text-blue-600 text-sm">
          Open existing apartment
        </Link>
        <button type="button" onClick={handleCreateAnyway} className="text-sm text-gray-600 underline">
          Create anyway
        </button>
        <button type="button" onClick={() => setState({ phase: 'idle' })} className="text-sm text-gray-400">
          Cancel
        </button>
      </div>
    );
  }

  if (state.phase === 'submitting') {
    return (
      <div className={`${baseClass} border-gray-300 text-gray-500`}>
        <span className="text-sm">{PROGRESS_MESSAGES[progressIndex]}</span>
      </div>
    );
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
          ? `${baseClass} border-blue-400 bg-blue-50 text-gray-500`
          : `${baseClass} border-gray-300 text-gray-500 hover:border-gray-400`
      }
    >
      <span className="text-3xl">+</span>
      <span className="font-medium">Add apartment</span>
      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="text"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="Paste or drop a link"
          className="w-full border rounded px-2 py-1 text-sm text-center"
        />
      </form>
    </div>
  );
}
