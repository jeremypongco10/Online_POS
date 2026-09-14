/** Minimal CSV parser — handles quoted fields, embedded commas, escaped ("") quotes, and quoted newlines. Good enough for a flat spreadsheet import with no library dependency. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip — \n (handled next) closes the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/**
 * Serializes rows of arbitrary values into CSV text — quoting a field
 * only when it actually needs it (contains a comma, quote, or newline),
 * and doubling any quote inside one. Every existing downloadCsv() call
 * before this built its content from a hand-typed template string with
 * no real data in it; this is for the first export that puts actual
 * customer names and addresses into a file, which can contain a comma
 * or a stray quote a template never would.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null) => {
    const s = value === null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n') + '\n';
}

/** Triggers a browser download of `content` as a file named `filename` — used for CSV import templates. */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
