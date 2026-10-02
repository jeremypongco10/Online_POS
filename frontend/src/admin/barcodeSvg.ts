import JsBarcode from 'jsbarcode';

/**
 * A PO number as Code 128 SVG markup, for the printed PO. Code 128
 * because it encodes letters, digits and the dash in "PO-000123", and
 * every handheld scanner reads it out of the box. Rendered into a
 * detached element, so the text goes in as a DOM text node, never as
 * parsed markup.
 */
export function poBarcodeSvg(value: string, height = 46): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    height,
    width: 1.6,
    margin: 0,
    fontSize: 12,
    textMargin: 2,
    displayValue: true,
    background: 'transparent',
    lineColor: '#000000',
  });
  return svg.outerHTML;
}
