/**
 * Hues for a photo-less product tile's avatar chip — see ProductCard.
 * Tried as a full-tile wash first (fought the prices/cart for attention),
 * then as plain white with only the initials coloured (too flat to scan,
 * every card read the same at a glance). A small solid chip is the
 * middle ground: the card itself stays white, but there's still a
 * distinct colour to spot per product, on the same avatar-badge pattern
 * BaggerPanel/CustomerLoyaltyPanel already use elsewhere in the POS.
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

/** "MK" for "Milk", "CB" for "Coca Cola" — up to two letters for a photo-less product's fallback tile. */
export function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
