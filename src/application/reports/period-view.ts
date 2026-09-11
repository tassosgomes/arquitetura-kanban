import { APP_TIME_ZONE } from "@/infrastructure/calendar/time-zone";
import { fechamentoExclusivo, type Instant } from "@/infrastructure/calendar/period";
import { TemporalQueryMode, type ResolvedTemporalQuery } from "@/application/temporal";
import {
  MANAGEMENT_PERIOD_LABELS,
  ManagementPeriodOption,
} from "@/application/reports/search-params";

const FAR_FUTURE = new Date("9999-12-31T00:00:00.000Z");

export type ManagementPeriodView = {
  periodLabel: string;
  start: string | null;
  end: string | null;
  startFormatted: string | null;
  endFormatted: string | null;
  fechamento: Instant;
  fechamentoFormatted: string;
  isCappedToNow: boolean;
  periodDatesText: string;
  closingText: string;
  semanticsText: string;
};

export function formatCivilDatePtBr(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function formatInstantPtBr(value: Instant): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

export function isFechamentoCappedToNow(resolved: ResolvedTemporalQuery): boolean {
  if (resolved.mode !== TemporalQueryMode.PERIOD) {
    return true;
  }
  const closedAt = fechamentoExclusivo(resolved.end, FAR_FUTURE);
  return resolved.fechamentoExclusivo.getTime() < closedAt.getTime();
}

export function describeManagementPeriod(input: {
  period: ManagementPeriodOption;
  resolved: ResolvedTemporalQuery;
}): ManagementPeriodView {
  const { period, resolved } = input;
  const fechamentoFormatted = formatInstantPtBr(resolved.fechamentoExclusivo);
  const isCappedToNow = isFechamentoCappedToNow(resolved);
  const capNote = isCappedToNow
    ? " O fechamento não ultrapassa o instante atual (visão limitada a hoje)."
    : "";

  if (resolved.mode === TemporalQueryMode.ALL) {
    return {
      periodLabel: MANAGEMENT_PERIOD_LABELS[ManagementPeriodOption.ALL],
      start: null,
      end: null,
      startFormatted: null,
      endFormatted: null,
      fechamento: resolved.fechamentoExclusivo,
      fechamentoFormatted,
      isCappedToNow: true,
      periodDatesText: "Recorte: todas as atividades, sem filtro de período.",
      closingText: `Retrato no instante atual: eventos anteriores a ${fechamentoFormatted} (${APP_TIME_ZONE}).${capNote}`,
      semanticsText:
        "Visão histórica no encerramento, limitada a hoje. Não usa o estado atual do Kanban.",
    };
  }

  if (resolved.mode === TemporalQueryMode.UNPLANNED) {
    return {
      periodLabel: MANAGEMENT_PERIOD_LABELS[ManagementPeriodOption.UNPLANNED],
      start: null,
      end: null,
      startFormatted: null,
      endFormatted: null,
      fechamento: resolved.fechamentoExclusivo,
      fechamentoFormatted,
      isCappedToNow: true,
      periodDatesText: "Recorte: atividades sem planejamento (sem intervalo de execução).",
      closingText: `Retrato no instante atual: eventos anteriores a ${fechamentoFormatted} (${APP_TIME_ZONE}).${capNote}`,
      semanticsText:
        "Visão histórica no encerramento, limitada a hoje. Não usa o estado atual do Kanban.",
    };
  }

  const startFormatted = formatCivilDatePtBr(resolved.start);
  const endFormatted = formatCivilDatePtBr(resolved.end);
  return {
    periodLabel: MANAGEMENT_PERIOD_LABELS[period],
    start: resolved.start,
    end: resolved.end,
    startFormatted,
    endFormatted,
    fechamento: resolved.fechamentoExclusivo,
    fechamentoFormatted,
    isCappedToNow,
    periodDatesText: `Período: ${startFormatted} a ${endFormatted} (dias inicial e final inclusivos, ${APP_TIME_ZONE}).`,
    closingText: `Retrato histórico no encerramento: eventos anteriores a ${fechamentoFormatted} (${APP_TIME_ZONE}).${capNote}`,
    semanticsText:
      "Visão histórica no encerramento do período, limitada a hoje. Mudanças posteriores não substituem este retrato.",
  };
}
