import type {
  ManagementDistributionId,
  ManagementIndicatorId,
} from "@/application/reports/types";

/** PRD §18 labels for dashboard cards (T26) and report summary (T27). */
export const MANAGEMENT_INDICATOR_LABELS: Record<ManagementIndicatorId, string> = {
  "I-01": "Atividades no período",
  "I-02": "Atividades concluídas",
  "I-03": "Projetos atendidos",
  "I-04": "Áreas atendidas",
  "I-05": "Em andamento",
  "I-06": "Aguardando retorno",
  "I-07": "Bloqueadas",
  "I-09": "Canceladas",
};

export const MANAGEMENT_INDICATOR_HINTS: Record<ManagementIndicatorId, string> = {
  "I-01": "Atividades distintas no recorte. Não é a soma de concluídas e em andamento.",
  "I-02": "Concluídas no retrato do encerramento.",
  "I-03": "Projetos distintos vinculados no retrato.",
  "I-04": "Áreas distintas como solicitante ou envolvidas.",
  "I-05": "Em andamento no encerramento. Não inclui aguardando retorno nem bloqueadas.",
  "I-06": "Aguardando retorno no encerramento.",
  "I-07": "Bloqueadas no encerramento.",
  "I-09": "Canceladas no encerramento. Entram no total e nas distribuições.",
};

/** PRD §18 distribution titles. */
export const MANAGEMENT_DISTRIBUTION_LABELS: Record<ManagementDistributionId, string> = {
  "D-AREA": "Atuação por área",
  "D-DOMINIO": "Atuação por domínio",
  "D-RESPONSAVEL": "Atuação por responsável",
  "D-NATUREZA": "Estratégico × operacional",
  "D-TIPO": "Projeto × ad hoc",
  "D-PAPEL": "Responsável × contribuidor",
  "D-ESFORCO": "Distribuição de esforço",
};
