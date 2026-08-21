export function formatMoney(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2" for a PCS-like unit, "1.250 KG" for a weighed unit — matches the unit's own decimal precision. */
export function formatQuantity(quantity: number, unitAbbreviation: string | null, decimalPlaces: number): string {
  const qty = quantity.toFixed(decimalPlaces);
  if (!unitAbbreviation || unitAbbreviation.toUpperCase() === 'PCS') {
    return qty;
  }
  return `${qty} ${unitAbbreviation}`;
}
