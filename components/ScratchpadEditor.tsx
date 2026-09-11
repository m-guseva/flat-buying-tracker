'use client';

import { useEffect, useRef, useState, type Key } from 'react';
import { updateScratchpadAction } from '@/app/actions/scratchpad';
import { linkify } from '@/lib/linkify';

export function ScratchpadEditor({
  initialContent,
  readOnly,
}: {
  initialContent: string;
  readOnly: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setContent(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updateScratchpadAction(value);
    }, 800);
  }

  function handleBlur() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updateScratchpadAction(content);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        placeholder="Paste links here…"
        className="glass-textarea block w-full min-h-[60vh] whitespace-pre-wrap"
      />
    );
  }

  return (
    <div
      onClick={() => !readOnly && setIsEditing(true)}
      className={`glass-textarea block w-full min-h-[60vh] whitespace-pre-wrap ${readOnly ? '' : 'cursor-text'}`}
    >
      {content ? (
        renderLinkified(content)
      ) : (
        <span className="text-gray-400 dark:text-white/30">{readOnly ? 'Nothing here yet.' : 'Click to paste a link…'}</span>
      )}
    </div>
  );
}

function renderLinkified(text: string) {
  return linkify(text).map((segment, index: Key) =>
    segment.type === 'link' ? (
      <a
        key={index}
        href={segment.value}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="text-[var(--accent-1)] hover:opacity-80 underline"
      >
        {segment.value}
      </a>
    ) : (
      <span key={index}>{segment.value}</span>
    ),
  );
}
