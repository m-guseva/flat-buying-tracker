'use client';

import { useRef } from 'react';

export function AutoSubmitDateInput({
  name,
  defaultValue,
  className,
}: {
  name: string;
  defaultValue: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    const input = inputRef.current;
    if (!input) return;
    // Programmatic value changes don't fire React's onChange, so trigger the
    // save explicitly — this is the whole point of the button: emptying the
    // native date picker by hand is fiddly and easy to get wrong.
    input.value = '';
    input.form?.requestSubmit();
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="date"
        name={name}
        defaultValue={defaultValue}
        className={className}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      {defaultValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear viewing date"
          className="text-gray-400 dark:text-white/30 hover:text-red-600 dark:hover:text-red-400 text-lg leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ×
        </button>
      )}
    </span>
  );
}
