/**
 * The nine PH-retail discount types a cashier can pick on a cart line —
 * the single source of truth for the DiscountDialog radio list and the
 * cart's own preview math (posTypes.ts's calculateLine/lineTaxIndicator).
 * Mirrored on the backend by TaxService::DISCOUNT_TYPES/DISCOUNT_RATES —
 * that class is what actually decides the money at checkout; this file
 * only drives what the cashier sees and a client-side preview of it.
 * Keep the two lists in sync by hand — the same tradeoff this codebase
 * already accepted for its tax math (see TaxService's own docblock vs.
 * this file).
 *
 * Three groups, matching how differently each is allowed to be decided:
 *
 *  - Government (fixedRatePercent set): a statutory rate the cashier
 *    cannot change (RA 9994 Senior Citizens, RA 10754 PWD, and their
 *    joint DTI/DA/DOH IRR for the 5% Basic Necessities & Prime
 *    Commodities discount). The amount shown here is only ever a
 *    preview — the server recomputes it independently and ignores
 *    whatever this dialog displays, since a wrong number here is a
 *    tax-compliance error, not just a pricing one.
 *  - Configurable (fixedRatePercent null, alwaysRequiresApproval false):
 *    the cashier enters a percentage or a fixed peso amount. No forced
 *    VAT treatment — the line's own tax rate keeps applying normally.
 *  - Manual (alwaysRequiresApproval true): same free-entry behaviour,
 *    but the one type gated behind a supervisor regardless of what a
 *    cashier types — see PosScreen's require_manual_discount_approval.
 *
 * Deliberately no "stack multiple discounts on one line" — a CartLine
 * carries exactly one discountType and one discount amount. Picking a
 * new type here always REPLACES whatever was on the line, which is what
 * keeps (say) a Senior Citizen discount and a Promo discount from ever
 * combining on the same item without any extra stacking logic needed —
 * there is simply nowhere for a second discount to attach.
 *
 * "Buy X Get Y" promos are deliberately out of scope here — they tie a
 * discount to a SECOND line (the free/discounted item), not to the
 * purchased line itself, which this per-line model can't represent
 * without a real cart-level mechanic. "Promo Discount" below covers the
 * ordinary percentage/fixed-amount case.
 */
export type DiscountTypeCode =
  | 'senior_citizen'
  | 'pwd'
  | 'sc_pwd_5_bnpc'
  | 'regular'
  | 'promo'
  | 'employee'
  | 'member'
  | 'wholesale'
  | 'manual';

export type DiscountCategory = 'government' | 'configurable' | 'manual';

export interface DiscountTypeDef {
  code: DiscountTypeCode;
  label: string;
  category: DiscountCategory;
  /** Statutory percentage the cashier cannot edit, or null when the cashier enters a percentage/fixed amount themselves. */
  fixedRatePercent: number | null;
  /** Whether this type also removes VAT, computed against the VAT-exclusive base — see TaxService::calculateGovernmentDiscountLine. Only Senior Citizen and PWD. */
  vatExempt: boolean;
  /** Whether the purchaser's name + government ID number must be captured before this can be applied. */
  requiresId: boolean;
  /** Whether this type is gated behind a supervisor regardless of the cashier's own permissions — currently only Manual Discount. */
  alwaysRequiresApproval: boolean;
  /** One line shown under the radio option, explaining what it is / when to use it. */
  helperText: string;
}

export const DISCOUNT_TYPES: DiscountTypeDef[] = [
  {
    code: 'senior_citizen',
    label: 'Senior Citizen',
    category: 'government',
    fixedRatePercent: 20,
    vatExempt: true,
    requiresId: true,
    alwaysRequiresApproval: false,
    helperText: '20% discount, VAT-exempt. Requires the OSCA/Senior Citizen ID.',
  },
  {
    code: 'pwd',
    label: 'PWD',
    category: 'government',
    fixedRatePercent: 20,
    vatExempt: true,
    requiresId: true,
    alwaysRequiresApproval: false,
    helperText: '20% discount, VAT-exempt. Requires the PWD ID.',
  },
  {
    code: 'sc_pwd_5_bnpc',
    label: '5% Basic Necessities / Prime Commodities',
    category: 'government',
    fixedRatePercent: 5,
    vatExempt: false,
    requiresId: true,
    alwaysRequiresApproval: false,
    helperText: 'For SC/PWD on basic necessities & prime commodities — used instead of the 20% discount, not with it.',
  },
  {
    code: 'regular',
    label: 'Regular Discount',
    category: 'configurable',
    fixedRatePercent: null,
    vatExempt: false,
    requiresId: false,
    alwaysRequiresApproval: false,
    helperText: 'A standard store discount, e.g. 5%, 10%, or 20% off.',
  },
  {
    code: 'promo',
    label: 'Promo Discount',
    category: 'configurable',
    fixedRatePercent: null,
    vatExempt: false,
    requiresId: false,
    alwaysRequiresApproval: false,
    helperText: 'Tied to a current promotion or sale event.',
  },
  {
    code: 'employee',
    label: 'Employee Discount',
    category: 'configurable',
    fixedRatePercent: null,
    vatExempt: false,
    requiresId: false,
    alwaysRequiresApproval: false,
    helperText: 'For a staff purchase, per company policy.',
  },
  {
    code: 'member',
    label: 'Member / Loyalty Discount',
    category: 'configurable',
    fixedRatePercent: null,
    vatExempt: false,
    requiresId: false,
    alwaysRequiresApproval: false,
    helperText: 'For a registered member or loyalty program.',
  },
  {
    code: 'wholesale',
    label: 'Wholesale / Bulk Discount',
    category: 'configurable',
    fixedRatePercent: null,
    vatExempt: false,
    requiresId: false,
    alwaysRequiresApproval: false,
    helperText: 'For a bulk or wholesale purchase.',
  },
  {
    code: 'manual',
    label: 'Manual Discount',
    category: 'manual',
    fixedRatePercent: null,
    vatExempt: false,
    requiresId: false,
    alwaysRequiresApproval: true,
    helperText: "Cashier's discretion — requires supervisor approval.",
  },
];

export const DISCOUNT_TYPE_BY_CODE: Record<DiscountTypeCode, DiscountTypeDef> = Object.fromEntries(
  DISCOUNT_TYPES.map((d) => [d.code, d])
) as Record<DiscountTypeCode, DiscountTypeDef>;

export function discountTypeLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return DISCOUNT_TYPE_BY_CODE[code as DiscountTypeCode]?.label ?? null;
}

/** Mirrors TaxService::discountRequiresHolderId — whether a line with this discountType requires the sale-level discount_holder_name/discount_id_number pair at checkout. */
export function discountRequiresHolderId(code: string | null | undefined): boolean {
  if (!code) return false;
  return DISCOUNT_TYPE_BY_CODE[code as DiscountTypeCode]?.requiresId ?? false;
}

/** The five configurable types' codes — the only ones a per-company default percentage applies to (see Company.default_*_discount_percent and GET /sales/discount-policy). */
export type ConfigurableDiscountTypeCode = 'regular' | 'promo' | 'employee' | 'member' | 'wholesale';

/** As returned by GET /sales/discount-policy's `discount_defaults` — null for a type with no default configured, which leaves DiscountDialog's percent field blank exactly as it always has. */
export type DiscountDefaults = Partial<Record<ConfigurableDiscountTypeCode, number | null>>;
