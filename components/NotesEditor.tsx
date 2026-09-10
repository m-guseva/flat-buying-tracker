'use client';

import { useEffect, useRef, useState } from 'react';
import { updateApartmentNotesAction } from '@/app/actions/apartments';
import { isReadOnly } from '@/lib/readOnly';

export function NotesEditor({ apartmentId, initialNotes }: { apartmentId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const readOnly = isReadOnly();

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
      readOnly={readOnly}
      placeholder="Notes"
      rows={8}
      className="glass-input block w-full"
    />
  );
}
