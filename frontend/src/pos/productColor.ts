/**
 * Hues used only as a *tint source* for a photo-less product tile — see
 * ProductCard, which blends these into the surrounding surface rather than
 * filling a tile with them solid. A wall of saturated blocks (the old
 * treatment) fought the prices and the cart for attention; a soft tint
 * still gives each product a stable, recognizable identity without
 * shouting.
 */
const PALETTE = [
  '#4f46e5', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#0284c7',
];

/** Deterministic name -> palette hue, so the same product always gets the same tile treatment across renders/sessions. */
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Soft tinted surface + readable ink for a photo-less tile, derived from
 * the product's hue. Both are mixed against theme tokens rather than
 * hard-coded, so the same hue stays legible in light and dark mode
 * without a second palette.
 */
export function tileTint(name: string): { bg: string; fg: string } {
  const hue = colorForName(name);
  return {
    bg: `color-mix(in srgb, ${hue} 12%, var(--mui-palette-background-paper))`,
    fg: `color-mix(in srgb, ${hue} 60%, var(--mui-palette-text-primary))`,
  };
}

/** "MK" for "Milk", "CB" for "Coca Cola" — up to two letters for a photo-less product's fallback tile. */
export function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
