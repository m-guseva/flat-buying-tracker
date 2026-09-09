'use client';

import { useCallback, useEffect, useState } from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored) as T);
    } catch {
      // storage unavailable (private browsing, disabled) — keep the initial value
    }
  }, [key]);

  const setAndPersist = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage unavailable — state still updates in memory
      }
    },
    [key],
  );

  return [value, setAndPersist];
}
