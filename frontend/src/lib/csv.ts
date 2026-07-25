/**
 * Minimal, dependency-free CSV serialization for client-side "Export" —
 * enough for the leads table, not a general CSV library. Every field is
 * quoted and internal quotes are doubled (RFC 4180), so commas, quotes, and
 * newlines inside a value (an address, a name) can't break the row shape.
 */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  // \r\n is the RFC line ending and the one Excel is happiest with.
  return lines.join('\r\n');
}

/**
 * Trigger a browser download of `content` as `filename`. Client-only (uses
 * Blob + a synthetic anchor); no-ops server-side where `document` is absent.
 */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
