/**
 * Chave de unicidade de nomes ativos (DE-14): `casefold(trim(s))`.
 *
 * `trim` só nas extremidades; espaços internos são significativos.
 * Acentos distinguem (`"Área"` ≠ `"Area"`).
 * Persistido em `nameNormalized` (Area, ArchitectureDomain, Project).
 *
 * Equivale ao `lower(trim(name))` da coluna; escritores devem gravar este valor.
 */
export function normalizeCatalogName(name: string): string {
  return name.trim().toLowerCase();
}
