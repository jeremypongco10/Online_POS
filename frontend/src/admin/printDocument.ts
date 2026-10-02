/** Escapes text for safe interpolation into the HTML documents built for printing. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Shared look for printed admin documents (purchase orders, stock
 * reports, count sheets): A4, neutral greys, tables that don't split a
 * row across pages. Each document adds its own rules after this.
 */
export const PRINT_BASE_CSS = `
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c2430; font-size: 11.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .muted { color: #5b6677; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  thead th { background: #eef1f5; font-size: 9.5px; text-transform: uppercase; letter-spacing: .05em; color: #3d4757; text-align: left; padding: 7px 8px; border-bottom: 1px solid #c6ced9; }
  tbody td { padding: 6px 8px; border-bottom: 1px solid #e3e7ed; vertical-align: top; }
  tfoot td { padding: 8px; font-weight: 700; background: #eef1f5; border-top: 1px solid #c6ced9; }
  tr { page-break-inside: avoid; }
  .r { text-align: right; white-space: nowrap; }
  .c { text-align: center; }
  thead th.r { text-align: right; }
  thead th.c { text-align: center; }
  .mono { font-family: Consolas, "Courier New", monospace; font-size: 10.5px; }
`;

/**
 * Prints a standalone HTML document from a hidden iframe. Kept separate
 * from the app's own window.print(): the app's global print styles are
 * tuned for 80mm receipts, and an isolated document can't be affected by
 * them. The browser's print dialog offers "Save as PDF", and the
 * document's <title> becomes the suggested file name.
 */
export function printHtml(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  const go = () => {
    if (printed) return;
    printed = true;
    win.focus();
    win.addEventListener('afterprint', cleanup, { once: true });
    win.print();
    // Some browsers never fire afterprint for an iframe — don't leak it.
    setTimeout(() => iframe.isConnected && iframe.remove(), 120_000);
  };

  // Wait for images (a logo) so they aren't missing from the printout,
  // but never hold the dialog hostage to a slow or broken one.
  const pending = Array.from(doc.images).filter((img) => !img.complete);
  if (pending.length === 0) {
    setTimeout(go, 50);
    return;
  }
  let remaining = pending.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) go();
  };
  pending.forEach((img) => {
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
  setTimeout(go, 2500);
}
