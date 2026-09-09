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
  /**
   * BCP 47 tag for the country this currency belongs to, used to write
   * dates and times the way that country writes them. Picking the
   * currency settles this the same way it settles the tax regime: a
   * till in Port Moresby should read 9 Sept 2026, and one in Manila
   * Sep 9, 2026, without either being asked a second question.
   */
  locale: string;
}

/**
 * The two markets this system is actually sold into: the Philippines and
 * Papua New Guinea. Both are two-decimal currencies.
 *
 * That constraint isn't cosmetic, and it's what any addition here has to
 * clear first. Money is stored as DECIMAL(15,2) throughout the schema and
 * formatMoney prints exactly two decimals, so a zero-decimal currency
 * (yen, won, vatu) would render ¥16.20 — a number that cannot exist.
 * Supporting those means minor-unit handling in the schema and in every
 * total, which is a different piece of work from naming a symbol.
 *
 * The list was briefly wider (Singapore, Malaysia, India, Australia, NZ,
 * Canada, Hong Kong, Thailand, US, EU, UK) and was cut back deliberately.
 * Two of those, USD and HKD, could not be answered honestly anyway: the
 * US levies state sales tax and Hong Kong levies no consumption tax at
 * all, so neither of the two regimes below describes them. Offering a
 * currency commits this system to naming that country's tax correctly,
 * which is a claim worth making only where it's true.
 */
export const CURRENCIES: Currency[] = [
  // en-PH writes 9/9/2026 and Sep 9, 2026 — month first, following US
  // convention. en-PG writes 09/09/2026 and 9 Sept 2026 — day first,
  // following Commonwealth convention. Both are real CLDR locales, so
  // this is the country's own convention rather than something spelled
  // out by hand here.
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinea Kina', locale: 'en-PG' },
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

/**
 * The regime each currency's country levies. This is what the tax system
 * *is*, not a suggestion — the Regional tab derives the setting from the
 * currency and shows it read-only, so every entry on CURRENCIES above
 * must appear here or the setting has no value to take.
 *
 * VAT here means the tax is *called* VAT, which is what the setting
 * governs. The Philippine BIR apparatus that rides along with 'vat' is
 * gated a second time by each store's own show_bir_details flag (see
 * ReceiptModal).
 */
const CURRENCY_TAX_SYSTEM: Record<string, TaxSystem> = {
  PHP: 'vat', // Philippines — 12%
  PGK: 'gst', // Papua New Guinea — 10%
};

/**
 * The regime a currency implies. Total over CURRENCIES, so the Regional
 * tab can render the tax system as a derived, read-only value.
 *
 * The fallback matters more than it used to now that the list is two
 * entries: a company still holding a currency that was dropped from
 * CURRENCIES (USD, say) lands here, and gets VAT — this system's own
 * column default, and what it did before the setting existed. That
 * company reads as unsaved on the Regional tab until someone picks one
 * of the two currencies now offered, which is the correction being
 * asked for rather than a fault.
 */
export function taxSystemForCurrency(code: string | null | undefined): TaxSystem {
  if (!code) return 'vat';
  return CURRENCY_TAX_SYSTEM[code.toUpperCase()] ?? 'vat';
}

/** "VAT" or "GST" — the word every tax label on screen and on a receipt is built from. */
export function taxLabel(value: string | null | undefined): string {
  return TAX_SYSTEMS[taxSystemOf(value)].label;
}

/** Whether the Philippine BIR line indicators and VAT breakdown should be printed at all. */
export function showsBirDetail(value: string | null | undefined): boolean {
  return TAX_SYSTEMS[taxSystemOf(value)].showBirDetail;
}

/**
 * The country's locale for a currency, for writing dates and times.
 * Falls back to Philippine, which is this system's home market and the
 * convention every screen used before the setting existed.
 */
export function localeForCurrency(code: string | null | undefined): string {
  if (!code) return 'en-PH';
  return CURRENCIES.find((c) => c.code === code.toUpperCase())?.locale ?? 'en-PH';
}

/**
 * Dates and times written the way the company's own country writes
 * them. Every one of these takes the currency code rather than reading
 * a module-level "current locale", because a stored one wouldn't
 * re-render the screens that display it: changing the currency in
 * Settings refreshes the auth user, and passing `user.currency` through
 * is what makes the new format appear immediately instead of at the
 * next sign-in.
 *
 * A string is accepted alongside a Date because that's what the API
 * returns — MySQL DATETIME as "2026-09-09 13:42:29". Safari refuses
 * that form (it wants the "T"), so it's normalised here rather than at
 * a dozen call sites, and anything genuinely unparseable is returned
 * untouched instead of rendered as "Invalid Date".
 */
function toDate(value: Date | string): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "Sep 9, 2026" in the Philippines, "9 Sept 2026" in Papua New Guinea. */
export function formatDate(value: Date | string | null | undefined, currency?: string | null): string {
  if (!value) return '—';
  const date = toDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString(localeForCurrency(currency), { dateStyle: 'medium' });
}

/** The same date with a short clock time — the form used wherever a row needs to say exactly when. */
export function formatDateTime(value: Date | string | null | undefined, currency?: string | null): string {
  if (!value) return '—';
  const date = toDate(value);
  if (!date) return String(value);
  return date.toLocaleString(localeForCurrency(currency), { dateStyle: 'medium', timeStyle: 'short' });
}

/** Clock time only, for a row whose date is already established by its surroundings. */
export function formatTime(
  value: Date | string | null | undefined,
  currency?: string | null,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  if (!value) return '—';
  const date = toDate(value);
  if (!date) return String(value);
  return date.toLocaleTimeString(localeForCurrency(currency), options);
}
