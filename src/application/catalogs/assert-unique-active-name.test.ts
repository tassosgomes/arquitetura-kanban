import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/errors";
import {
  assertUniqueActiveName,
  normalizedCatalogName,
} from "@/application/catalogs/assert-unique-active-name";

describe("assertUniqueActiveName", () => {
  const existing = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Financeiro",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("rejects when another active record has the same normalized name", () => {
    expect(() => assertUniqueActiveName("financeiro", existing)).toThrow(ValidationError);
  });

  it("allows the same record when renaming to itself", () => {
    expect(() => assertUniqueActiveName("Financeiro", existing, existing.id)).not.toThrow();
  });

  it("normalizes catalog names with trim and lower case", () => {
    expect(normalizedCatalogName("  Financeiro  ")).toBe("financeiro");
  });

  it("rejects blank names", () => {
    expect(() => normalizedCatalogName("   ")).toThrow(ValidationError);
  });
});
