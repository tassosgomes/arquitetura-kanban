import { describe, expect, it } from "vitest";
import { normalizeCatalogName } from "@/domain/catalog/normalize-catalog-name";

describe("normalizeCatalogName (DE-14)", () => {
  it("trims ends and lowercases without touching inner spaces", () => {
    expect(normalizeCatalogName("Financeiro")).toBe("financeiro");
    expect(normalizeCatalogName("financeiro")).toBe("financeiro");
    expect(normalizeCatalogName(" Financeiro ")).toBe("financeiro");
    expect(normalizeCatalogName("Foo  Bar")).toBe("foo  bar");
    expect(normalizeCatalogName("Foo Bar")).toBe("foo bar");
  });

  it("treats accents as distinct from unaccented letters", () => {
    expect(normalizeCatalogName("Área")).toBe("área");
    expect(normalizeCatalogName("Area")).toBe("area");
    expect(normalizeCatalogName("Área")).not.toBe(normalizeCatalogName("Area"));
  });
});
