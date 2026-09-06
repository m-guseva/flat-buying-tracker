'use client';

import { useEffect, useRef, useState } from 'react';
import { updateApartmentNotesAction } from '@/app/actions/apartments';

export function NotesEditor({ apartmentId, initialNotes }: { apartmentId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateApartmentNotesAction(apartmentId, value);
    }, 800);
  }

  return (
    <textarea
      value={notes}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Notes"
      rows={8}
      className="block w-full border rounded px-2 py-1"
    />
  );
}
