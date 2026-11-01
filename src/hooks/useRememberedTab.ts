import { useCallback, useState } from 'react';

export function useRememberedTab(key: string, allowed: string[], fallback: string) {
  const storageKey = `tab:${key}`;
  const [tab, setTabState] = useState<string>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      return v && allowed.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  });
  const setTab = useCallback(
    (v: string) => {
      setTabState(v);
      try {
        localStorage.setItem(storageKey, v);
      } catch {
        return;
      }
    },
    [storageKey]
  );
  return [tab, setTab] as const;
}
