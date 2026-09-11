import { describe, expect, it } from "vitest";
import {
  CSV_NEWLINE,
  CSV_SEPARATOR,
  CSV_UTF8_BOM,
  encodeCsv,
  escapeCsvCell,
  formatCsvInstant,
} from "@/infrastructure/csv/encode";

function decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
}

describe("CSV encoder (T27)", () => {
  it("emits UTF-8 BOM, semicolon separator, quoted fields and CRLF", () => {
    const bytes = encodeCsv([
      ["id", "título"],
      ["1", "Atuação"],
    ]);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = decode(bytes);
    expect(text.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(text).toContain(CSV_SEPARATOR);
    expect(text).toContain(CSV_NEWLINE);
    expect(text).toBe(`${CSV_UTF8_BOM}"id";"título"${CSV_NEWLINE}"1";"Atuação"${CSV_NEWLINE}`);
  });

  it("duplicates internal quotes", () => {
    expect(escapeCsvCell('disse "oi"')).toBe('"disse ""oi"""');
    const text = decode(encodeCsv([['a "b" c']]));
    expect(text).toContain('"a ""b"" c"');
  });

  it("prefixes formula-like cells with a single quote", () => {
    expect(escapeCsvCell("=CMD()")).toBe(`"'=CMD()"`);
    expect(escapeCsvCell("+1")).toBe(`"'+1"`);
    expect(escapeCsvCell("-1")).toBe(`"'-1"`);
    expect(escapeCsvCell("@SUM")).toBe(`"'@SUM"`);
    expect(escapeCsvCell("\tcmd")).toBe(`"'\tcmd"`);
    expect(escapeCsvCell("\rCMD")).toBe(`"'\rCMD"`);
    expect(escapeCsvCell("Atuação")).toBe(`"Atuação"`);
  });

  it("preserves accents in UTF-8", () => {
    const text = decode(encodeCsv([["São Paulo", "área"]]));
    expect(text).toContain("São Paulo");
    expect(text).toContain("área");
  });

  it("formats instants as ISO-8601 UTC", () => {
    expect(formatCsvInstant(new Date("2026-09-10T15:00:00-03:00"))).toBe("2026-09-10T18:00:00.000Z");
  });
});
