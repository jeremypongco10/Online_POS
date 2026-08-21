import { useEffect, useState } from 'react';

/**
 * Keeps a piece of navigation state (which top-level view, which admin
 * section, which tab within it) synced to a URL path segment via the
 * History API, so a refresh — or the browser back/forward buttons —
 * lands back on the same screen instead of resetting to the default.
 */
export function useRouteState<T extends string>(
  segmentIndex: number,
  validValues: readonly T[],
  defaultValue: T,
  buildPath: (value: T) => string,
): [T, (value: T) => void] {
  const read = (): T => {
    const segment = window.location.pathname.split('/').filter(Boolean)[segmentIndex];
    return segment && (validValues as readonly string[]).includes(segment) ? (segment as T) : defaultValue;
  };

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    const onPopState = () => setValue(read());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (next: T) => {
    setValue(next);
    const path = buildPath(next);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  return [value, set];
}
