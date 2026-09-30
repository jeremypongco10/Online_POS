/**
 * A minimal ESC/POS byte encoder for a 58mm thermal receipt printer — the
 * class of printer the OC-PT210/GOOJPRT PT-210 belongs to (384 dots/line,
 * 32 characters/line at the printer's default Font A). This is the
 * byte-level protocol thermal printers speak; there is no HTML/CSS layer
 * here at all, which is the whole point — see bluetoothPrinter.ts for why
 * that's what makes this print silently with no browser dialog.
 *
 * Deliberately narrow: initialize, align, bold, double size, plain text,
 * feed, cut. Real ESC/POS has far more (barcodes, images, multiple
 * codepages, qr codes) — none of it is needed to reproduce what
 * ReceiptModal already prints, so none of it is here.
 */

const ESC = 0x1b;
const GS = 0x1d;

/** Characters ReceiptModal prints that a printer's default codepage (CP437-ish) doesn't carry — substituted rather than sent raw, which would print as garbage or a blank box. */
const PRINTER_SAFE_SUBSTITUTIONS: Record<string, string> = {
  '₱': 'P', // ₱ Philippine peso sign — no ESC/POS codepage has this
  '—': '-', // em dash
  '–': '-', // en dash
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '…': '...',
  '•': '*',
};

/** Strips/replaces anything outside plain ASCII, so a name typed with an accented letter or emoji degrades to '?' instead of corrupting every byte after it. */
function sanitizeForPrinter(text: string): string {
  let out = '';
  for (const ch of text) {
    const mapped = PRINTER_SAFE_SUBSTITUTIONS[ch];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    out += code >= 0x20 && code < 0x7f ? ch : code === 0x0a ? ch : '?';
  }
  return out;
}

export class EscPosBuilder {
  private bytes: number[] = [];

  init(): this {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  align(a: 'left' | 'center' | 'right'): this {
    this.bytes.push(ESC, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2);
    return this;
  }

  bold(on: boolean): this {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  /** width/height as a multiplier (1 = normal, 2 = double) — GS ! packs them into one byte. */
  size(width: 1 | 2, height: 1 | 2): this {
    this.bytes.push(GS, 0x21, ((width - 1) << 4) | (height - 1));
    return this;
  }

  /**
   * Prints a monochrome bitmap via ESC/POS's raster-image command (`GS v
   * 0`) — the business logo, in practice the only image this app ever
   * prints. `packedBytes` must already be in the exact format
   * EscPosImageService (backend) produces: MSB-first, each row padded to a
   * whole byte. This method only wraps that in the command header; it
   * doesn't interpret or re-derive anything about the image itself, which
   * is also why there's no align() call needed around it — centering a
   * narrower logo is already baked into the pixels server-side (raster
   * images print flush against the left margin on real firmware and
   * ignore the text-alignment command entirely, so centering couldn't be
   * done here even if this method tried).
   */
  rasterImage(widthDots: number, heightDots: number, packedBytes: Uint8Array): this {
    const bytesPerRow = Math.ceil(widthDots / 8);
    this.bytes.push(GS, 0x76, 0x30, 0x00); // GS v 0, m=0 (normal mode, no scaling)
    this.bytes.push(bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff); // xL, xH — bytes per row
    this.bytes.push(heightDots & 0xff, (heightDots >> 8) & 0xff); // yL, yH — height in dots
    for (const byte of packedBytes) this.bytes.push(byte);
    return this;
  }

  /** Raw text, no trailing newline — caller decides whether this is followed by more text or a line() feed. */
  text(s: string): this {
    for (const ch of sanitizeForPrinter(s)) {
      this.bytes.push(ch.codePointAt(0) ?? 0x3f);
    }
    return this;
  }

  line(s: string = ''): this {
    return this.text(s).feed(1);
  }

  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) this.bytes.push(0x0a);
    return this;
  }

  /** A full-width rule — thermal receipts use a repeated dash/equals since the CSS dashed-border look ReceiptModal uses has no ESC/POS equivalent. */
  divider(char: string = '-'): this {
    return this.line(char.repeat(RECEIPT_WIDTH));
  }

  /** Left-aligned label, right-aligned value, padded to fill the line — the plain-text equivalent of ReceiptModal's `<Stack direction="row" justifyContent="space-between">` rows. Truncates the label rather than the value: a value that gets cut off is silently wrong money, a label that gets cut off is still readable. */
  twoCol(left: string, right: string): this {
    const l = sanitizeForPrinter(left);
    const r = sanitizeForPrinter(right);
    const space = RECEIPT_WIDTH - r.length;
    const truncatedLeft = l.length > space ? l.slice(0, Math.max(0, space - 1)) : l;
    return this.line(truncatedLeft.padEnd(Math.max(0, space)) + r);
  }

  /** Wraps long free text (a footer note, an address) to the printer's column width, since nothing else here wraps automatically the way a browser reflows text. */
  wrapped(text: string): this {
    for (const paragraph of sanitizeForPrinter(text).split('\n')) {
      const words = paragraph.split(' ');
      let current = '';
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > RECEIPT_WIDTH) {
          if (current) this.line(current);
          current = word;
        } else {
          current = next;
        }
      }
      this.line(current);
    }
    return this;
  }

  /**
   * Feeds enough blank space for a tear-off, then sends a partial-cut
   * command defensively. The PT-210 class of portable printer is
   * typically tear-off only (no auto-cutter) — an unsupported cut command
   * is a no-op on real ESC/POS firmware, so sending it costs nothing on a
   * printer that ignores it, and saves a manual tear guess on one that
   * doesn't.
   */
  cutOrTear(): this {
    this.feed(3);
    this.bytes.push(GS, 0x56, 0x01);
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Standard column count for a 58mm printer at the default Font A (12x24, 384 dots/line) — every receipt formatter in receiptEscPos.ts lays out against this. */
export const RECEIPT_WIDTH = 32;
