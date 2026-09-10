/** entityKind de AuditEvent. Domain = cadastro ArchitectureDomain. */
export const AuditEntityKind = {
  User: "User",
  Area: "Area",
  Domain: "Domain",
  Project: "Project",
  Activity: "Activity",
  ActivityTask: "ActivityTask",
  ValueDelivery: "ValueDelivery",
} as const;

export type AuditEntityKind = (typeof AuditEntityKind)[keyof typeof AuditEntityKind];

/**
 * Ações estáveis iniciais (T12 pode ampliar sem migration).
 * Não é enum PostgreSQL.
 */
export const AuditAction = {
  created: "created",
  status_changed: "status_changed",
  field_changed: "field_changed",
  cancelled: "cancelled",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
