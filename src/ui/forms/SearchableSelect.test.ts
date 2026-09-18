import { describe, expect, it } from "vitest";
import {
  filterSearchableOptions,
  normalizeSearchText,
  type SearchableSelectOption,
} from "@/ui/forms/SearchableSelect";

const people: SearchableSelectOption[] = [
  {
    id: "bruno",
    label: "Bruno Dias (bruno.dias@example.com)",
    searchText: "Bruno Dias bruno.dias@example.com",
    isActive: true,
  },
  {
    id: "ira",
    label: "Ira Lee (ira.lee@example.com)",
    searchText: "Ira Lee ira.lee@example.com",
    isActive: true,
  },
  {
    id: "inactive",
    label: "Pessoa Inativa (inactive@example.com)",
    searchText: "Pessoa Inativa inactive@example.com",
    isActive: false,
  },
];

describe("filterSearchableOptions: busca por rótulo e e-mail", () => {
  it("ignora caixa e acentos", () => {
    expect(filterSearchableOptions(people, "bru", [])).toHaveLength(1);
    expect(filterSearchableOptions(people, "IRA", [])).toHaveLength(1);
    expect(filterSearchableOptions(people, "DIAS@EXAMPLE", [])).toEqual([people[0]]);
    expect(normalizeSearchText("ÁREA São João")).toBe("area sao joao");
  });

  it("não oferece opções inativas nem itens já selecionados", () => {
    expect(filterSearchableOptions(people, "", [])).toEqual(people.slice(0, 2));
    expect(filterSearchableOptions(people, "", ["bruno"])).toEqual([people[1]]);
    expect(filterSearchableOptions(people, "inativa", [])).toEqual([]);
  });
});
