const FORMULA_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r"]);

export const CSV_UTF8_BOM = "\uFEFF";
export const CSV_SEPARATOR = ";";
export const CSV_NEWLINE = "\r\n";

/**
 * Spreadsheet formula guard (architecture.md §11): prefix `'` when the cell
 * would otherwise be interpreted as a formula.
 */
export function escapeCsvCell(value: string): string {
  let cell = value;
  const first = cell[0];
  if (first !== undefined && FORMULA_PREFIXES.has(first)) {
    cell = `'${cell}`;
  }
  return `"${cell.replaceAll('"', '""')}"`;
}

/** Civil planning day as `YYYY-MM-DD`. */
export function formatCsvCivilDate(value: string): string {
  return value.slice(0, 10);
}

/** Audit / closing instant as ISO-8601 UTC. */
export function formatCsvInstant(instant: Date): string {
  return instant.toISOString();
}

/**
 * UTF-8 CSV with BOM, `;` separator, quoted fields, CRLF records.
 */
export function encodeCsv(rows: readonly (readonly string[])[]): Uint8Array {
  const lines = rows.map((row) => row.map(escapeCsvCell).join(CSV_SEPARATOR));
  const text = `${CSV_UTF8_BOM}${lines.join(CSV_NEWLINE)}${rows.length > 0 ? CSV_NEWLINE : ""}`;
  return new TextEncoder().encode(text);
}
