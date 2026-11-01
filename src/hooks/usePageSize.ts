import { useCallback, useEffect, useState } from 'react';

export const PAGE_SIZE_OPTIONS = [0, 5, 10, 15, 20, 25, 50, 100];
const PREFIX = 'page_size:';

export const readPageSize = (key: string): number => {
  try {
    const v = parseInt(localStorage.getItem(PREFIX + key) ?? '', 10);
    return PAGE_SIZE_OPTIONS.includes(v) ? v : 0;
  } catch {
    return 0;
  }
};

export const savePageSize = (key: string, value: number) => {
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    return;
  }
};

const scrollParent = (el: HTMLElement): HTMLElement | null => {
  let p = el.parentElement;
  while (p && !/(auto|scroll)/.test(getComputedStyle(p).overflowY)) p = p.parentElement;
  return p;
};

export function usePageSize(key: string) {
  const [setting, setSettingState] = useState(() => readPageSize(key));
  const [auto, setAuto] = useState(10);
  const [el, setEl] = useState<HTMLElement | null>(null);

  const setSetting = useCallback(
    (v: number) => {
      setSettingState(v);
      savePageSize(key, v);
    },
    [key]
  );

  useEffect(() => {
    if (setting !== 0 || !el) return;
    const measure = () => {
      const p = scrollParent(el);
      const areaTop = p ? p.getBoundingClientRect().top : 0;
      const areaH = p ? p.clientHeight : window.innerHeight - 40;
      const scrollTop = p ? p.scrollTop : window.scrollY;
      const topInContent = el.getBoundingClientRect().top - areaTop + scrollTop;
      const head = el.querySelector('thead')?.getBoundingClientRect().height || 40;
      const row = el.querySelector('tbody tr')?.getBoundingClientRect().height || 34;
      const avail = areaH - topInContent - head - 56 - 24;
      setAuto(Math.max(5, Math.floor(avail / row)));
    };
    measure();
    const t = setTimeout(measure, 200);
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [setting, el]);

  return { setting, setSetting, size: setting === 0 ? auto : setting, ref: setEl };
}
