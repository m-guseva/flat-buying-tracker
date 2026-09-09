'use client';

import { useCallback, useState } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setAndPersist = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage unavailable (private browsing, disabled, quota) — state still updates in memory
      }
    },
    [key],
  );

  return [value, setAndPersist];
}
