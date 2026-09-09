'use client';

import { useEffect, useState, useTransition } from 'react';
import { uploadImageAction } from '@/app/actions/images';

export function PasteImageZone({ apartmentId }: { apartmentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();
      const formData = new FormData();
      formData.set('file', file, file.name || 'pasted-image.png');
      startTransition(async () => {
        await uploadImageAction(apartmentId, formData);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      });
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [apartmentId]);

  if (isPending) return <p className="text-xs text-gray-500 mt-1.5">Pasting image…</p>;
  if (justAdded) return <p className="text-xs text-emerald-600 mt-1.5">Image added ✓</p>;
  return <p className="text-xs text-gray-400 mt-1.5">Tip: paste an image (⌘V) to add a photo</p>;
}
