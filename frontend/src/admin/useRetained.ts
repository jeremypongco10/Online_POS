import { useRef } from 'react';

/**
 * Keeps returning the last non-null value seen. A modal driven by a
 * `T | null` state value (e.g. `detail`/`managing`) gets set to `null` the
 * instant it's closed — without this, its content would vanish before the
 * exit animation finishes instead of fading out with the dialog.
 */
export function useRetained<T>(value: T | null): T | null {
  const ref = useRef(value);
  if (value !== null) ref.current = value;
  return value ?? ref.current;
}
