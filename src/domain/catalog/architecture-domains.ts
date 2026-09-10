/** Seis domínios iniciais do PRD §9. Seed idempotente; T09 permite editar/inativar. */
export const ARCHITECTURE_DOMAIN_NAMES = [
  "Arquitetura",
  "Desenvolvimento e Integração",
  "Dados",
  "Segurança e Compliance",
  "Infraestrutura e Operação",
  "IA e Automação",
] as const;

export type ArchitectureDomainName = (typeof ARCHITECTURE_DOMAIN_NAMES)[number];
