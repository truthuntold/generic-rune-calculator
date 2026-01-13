import { useEffect, useRef, useState } from 'react';

function getLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * React state persisted to localStorage (string values).
 * - Reads from storage on first render (if present)
 * - Writes to storage whenever the value changes
 * - If the key changes, re-reads from the new key
 */
export function useLocalStorageStringState(key: string, defaultValue: string) {
  const [value, setValue] = useState<string>(() => {
    const storage = getLocalStorage();
    if (!storage) return defaultValue;
    const stored = storage.getItem(key);
    return stored ?? defaultValue;
  });

  const prevKeyRef = useRef(key);

  useEffect(() => {
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    const storage = getLocalStorage();
    if (!storage) {
      setValue(defaultValue);
      return;
    }
    const stored = storage.getItem(key);
    setValue(stored ?? defaultValue);
  }, [key, defaultValue]);

  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) return;
    storage.setItem(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

export function useLocalStorageBooleanState(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    const storage = getLocalStorage();
    if (!storage) return defaultValue;
    const stored = storage.getItem(key);
    if (stored === null) return defaultValue;
    return stored === 'true';
  });

  const prevKeyRef = useRef(key);

  useEffect(() => {
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;

    const storage = getLocalStorage();
    if (!storage) {
      setValue(defaultValue);
      return;
    }
    const stored = storage.getItem(key);
    setValue(stored === null ? defaultValue : stored === 'true');
  }, [key, defaultValue]);

  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) return;
    storage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}
