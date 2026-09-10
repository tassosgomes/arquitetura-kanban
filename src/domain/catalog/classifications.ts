/** Natureza. Projeto: Estratégico / Operacional. Atividade: Estratégica / Operacional (equivalentes). */
export const Nature = {
  STRATEGIC: "STRATEGIC",
  OPERATIONAL: "OPERATIONAL",
} as const;

export type Nature = (typeof Nature)[keyof typeof Nature];

export const NATURE_LABELS: Record<Nature, string> = {
  STRATEGIC: "Estratégico",
  OPERATIONAL: "Operacional",
};

/** Papel da Arquitetura. PRD: Responsável / Contribuidor. */
export const ArchitectureRole = {
  RESPONSIBLE: "RESPONSIBLE",
  CONTRIBUTOR: "CONTRIBUTOR",
} as const;

export type ArchitectureRole = (typeof ArchitectureRole)[keyof typeof ArchitectureRole];

export const ARCHITECTURE_ROLE_LABELS: Record<ArchitectureRole, string> = {
  RESPONSIBLE: "Responsável",
  CONTRIBUTOR: "Contribuidor",
};

/** Prioridade. PRD: Baixa / Média / Alta / Crítica. */
export const Priority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

/** Esforço opcional P/M/G. Ausente = “Não informado” nos indicadores (D-ESFORCO). */
export const Effort = {
  P: "P",
  M: "M",
  G: "G",
} as const;

export type Effort = (typeof Effort)[keyof typeof Effort];
