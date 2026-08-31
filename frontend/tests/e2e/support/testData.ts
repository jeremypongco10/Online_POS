import { FIXTURE_TAG } from './env';

/** A unique, clearly-tagged SKU/barcode-safe string for data a test creates through the real UI — never a value a real catalog would plausibly already use. */
export function uniqueTag(label: string): string {
  return `${FIXTURE_TAG}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
