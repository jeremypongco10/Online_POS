/**
 * Company-wide currency and tax-regime settings — the two things the
 * Back Office's Regional tab configures, and the labels every screen
 * reads back out of them.
 *
 * Lives at src/ rather than in pos/format.ts because both halves of the
 * app need it: the POS prints receipts with it, and the Back Office
 * configures it.
 */

export type TaxSystem = 'vat' | 'gst';

export interface Currency {
  /** ISO 4217 code — what `companies.currency` actually stores. */
  code: string;
  symbol: string;
  name: string;
}

/**
 * Deliberately a short curated list rather than all of ISO 4217, and
 * every entry on it is a two-decimal currency.
 *
 * That constraint isn't cosmetic. Money is stored as DECIMAL(15,2)
 * throughout the schema and formatMoney prints exactly two decimals, so
 * a zero-decimal currency (yen, won, dong) would render ¥16.20 — a
 * number that cannot exist. Supporting those means minor-unit handling
 * in the schema and in every total, which is a different piece of work
 * from naming the symbol on a label.
 *
 * The spread covers the regimes this setting exists to serve: the
 * Philippines for VAT, and the main GST countries — Singapore,
 * Malaysia, India, Australia, New Zealand, Canada.
 */
export const CURRENCIES: Currency[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Pound Sterling' },
];

export const DEFAULT_CURRENCY = 'PHP';

/**
 * Falls back to the code itself rather than to a peso sign. A company
 * set to a currency this list doesn't carry is better served by seeing
 * "SEK 1,200.00" than by being told its money is pesos.
 */
export function currencySymbol(code: string | null | undefined): string {
  if (!code) return '₱';
  return CURRENCIES.find((c) => c.code === code.toUpperCase())?.symbol ?? code.toUpperCase();
}

export function currencyName(code: string | null | undefined): string {
  if (!code) return DEFAULT_CURRENCY;
  return CURRENCIES.find((c) => c.code === code.toUpperCase())?.name ?? code.toUpperCase();
}

/**
 * What each regime is called and how much Philippine-specific apparatus
 * it shows.
 *
 * `showBirDetail` is the whole reason this is a setting rather than a
 * label swap. The V/E/Z/N line indicators and the Vatable / VAT-Exempt /
 * Zero-Rated receipt breakdown are Philippine BIR conventions with no
 * GST counterpart — renaming them "GST-Exempt" would invent a
 * classification that doesn't exist, so under GST they're hidden
 * instead. The figures behind them are still computed and still stored
 * on the sale; only the printing of them stops.
 *
 * What stays VAT-only regardless: the Senior Citizen, PWD and 5% BNPC
 * discounts. Those are Philippine statute, including the rule that the
 * 20% comes off a VAT-exclusive base, and they have no GST equivalent
 * to be relabelled into.
 */
export const TAX_SYSTEMS: Record<TaxSystem, { label: string; name: string; showBirDetail: boolean }> = {
  vat: { label: 'VAT', name: 'Philippine VAT', showBirDetail: true },
  gst: { label: 'GST', name: 'GST', showBirDetail: false },
};

export function taxSystemOf(value: string | null | undefined): TaxSystem {
  return value === 'gst' ? 'gst' : 'vat';
}

/** "VAT" or "GST" — the word every tax label on screen and on a receipt is built from. */
export function taxLabel(value: string | null | undefined): string {
  return TAX_SYSTEMS[taxSystemOf(value)].label;
}

/** Whether the Philippine BIR line indicators and VAT breakdown should be printed at all. */
export function showsBirDetail(value: string | null | undefined): boolean {
  return TAX_SYSTEMS[taxSystemOf(value)].showBirDetail;
}
