import { useEffect, useRef } from 'react';

/** Max gap between keys for them to count as one scan. Scanners type each character in a few ms; people don't. */
const MAX_KEY_GAP_MS = 50;
const MIN_SCAN_LENGTH = 4;

/**
 * Calls onScan with whatever a USB/Bluetooth barcode scanner "types",
 * wherever focus happens to be. A scanner acts as a keyboard that sends
 * the code very fast and ends with Enter, so a burst of quick keystrokes
 * ending in Enter is a scan. Ordinary typing is far too slow to match,
 * and passes through untouched.
 *
 * Listens in the capture phase and swallows only that final Enter, so a
 * scan landing in a focused text field doesn't also submit whatever form
 * the field belongs to. The scanned characters themselves still reach
 * the field, so a caller that cares should clear it.
 */
export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const callback = useRef(onScan);
  callback.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let buffer = '';
    let lastKeyAt = 0;

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const now = performance.now();
      if (now - lastKeyAt > MAX_KEY_GAP_MS) buffer = '';
      lastKeyAt = now;

      if (e.key === 'Enter') {
        const code = buffer.trim();
        buffer = '';
        if (code.length >= MIN_SCAN_LENGTH) {
          e.preventDefault();
          e.stopPropagation();
          callback.current(code);
        }
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);
}
