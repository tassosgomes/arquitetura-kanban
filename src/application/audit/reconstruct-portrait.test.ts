import { describe, expect, it } from "vitest";
import { ActivityStatus } from "@/domain/activity/enums";
import {
  buildActivityCreatedChanges,
  buildActivityUpdatedChanges,
  emptyActivityPortrait,
} from "@/application/audit";
import {
  PORTRAIT_ABSENT,
  comparePortraitEvents,
  reconstructActivityPortrait,
  valueAtClosing,
  type PortraitSourceEvent,
} from "@/application/audit/reconstruct-portrait";

const AGOSTO_FECHAMENTO = new Date("2026-09-01T00:00:00-03:00");
const AGORA = new Date("2026-09-10T15:00:00-03:00");

function event(
  at: string,
  sequence: bigint,
  changes: PortraitSourceEvent["changes"],
): PortraitSourceEvent {
  return { occurredAt: new Date(at), sequence, changes };
}

const initial = emptyActivityPortrait({
  status: ActivityStatus.IN_PROGRESS,
  responsavelId: "ana",
  tipo: "AD_HOC",
  esforco: "M",
});

describe("valueAtClosing / reconstructActivityPortrait (DE-04, DE-05, DE-20)", () => {
  it("uses the last event strictly before fechamento (FX-01 agosto vs setembro)", () => {
    const events = [
      event("2026-08-20T10:00:00-03:00", 1n, buildActivityCreatedChanges({
        ...initial,
        status: ActivityStatus.BACKLOG,
      })),
      event("2026-08-25T09:00:00-03:00", 2n, buildActivityUpdatedChanges(
        { ...initial, status: ActivityStatus.BACKLOG },
        { ...initial, status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-08-25" },
      )),
      event("2026-09-18T16:00:00-03:00", 3n, buildActivityUpdatedChanges(
        { ...initial, status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-08-25" },
        {
          ...initial,
          status: ActivityStatus.DONE,
          dataInicio: "2026-08-25",
          dataConclusao: "2026-09-18",
        },
      )),
    ];

    const setFechamento = new Date("2026-09-20T12:00:00-03:00");
    expect(valueAtClosing(events, "status", AGOSTO_FECHAMENTO)).toBe(ActivityStatus.IN_PROGRESS);
    expect(valueAtClosing(events, "status", setFechamento)).toBe(ActivityStatus.DONE);
    expect(reconstructActivityPortrait(events, AGOSTO_FECHAMENTO).responsavelId).toBe("ana");
  });

  it("returns AUSENTE when the activity is created after the closing (DE-05 / FX-08)", () => {
    const events = [
      event("2026-09-01T09:00:00-03:00", 1n, buildActivityCreatedChanges({
        status: ActivityStatus.IN_PROGRESS,
        dataInicio: "2026-09-01",
      })),
      event("2026-09-10T11:00:00-03:00", 2n, buildActivityUpdatedChanges(
        { status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-09-01" },
        { status: ActivityStatus.IN_PROGRESS, dataInicio: "2026-08-25" },
      )),
    ];

    expect(valueAtClosing(events, "status", AGOSTO_FECHAMENTO)).toBe(PORTRAIT_ABSENT);
    expect(reconstructActivityPortrait(events, AGOSTO_FECHAMENTO).status).toBe(PORTRAIT_ABSENT);
    expect(valueAtClosing(events, "status", AGORA)).toBe(ActivityStatus.IN_PROGRESS);
    expect(valueAtClosing(events, "dataInicio", AGORA)).toBe("2026-08-25");
  });

  it("excludes an event at the exclusive closing instant (FX-14b)", () => {
    const events = [
      event("2026-09-01T00:00:00-03:00", 1n, buildActivityCreatedChanges({
        status: ActivityStatus.IN_PROGRESS,
      })),
    ];
    expect(valueAtClosing(events, "status", AGOSTO_FECHAMENTO)).toBe(PORTRAIT_ABSENT);
  });

  it("breaks occurredAt ties with greater sequence, not UUID (DE-20)", () => {
    const sameInstant = "2026-08-25T09:00:00-03:00";
    const events = [
      event(sameInstant, 10n, buildActivityUpdatedChanges(
        { status: ActivityStatus.BACKLOG },
        { status: ActivityStatus.IN_PROGRESS },
      )),
      event(sameInstant, 11n, {
        fields: {
          dataInicio: { before: null, after: "2026-08-25" },
        },
      }),
    ];

    expect(comparePortraitEvents(events[0]!, events[1]!)).toBeLessThan(0);
    expect(valueAtClosing(events, "status", AGOSTO_FECHAMENTO)).toBe(ActivityStatus.IN_PROGRESS);
    expect(valueAtClosing(events, "dataInicio", AGOSTO_FECHAMENTO)).toBe("2026-08-25");
  });

  it("keeps the historical owner when a later event changes it (FX-09)", () => {
    const events = [
      event("2026-08-10T09:00:00-03:00", 1n, buildActivityCreatedChanges({
        status: ActivityStatus.IN_PROGRESS,
        responsavelId: "ana",
      })),
      event("2026-09-05T09:00:00-03:00", 2n, buildActivityUpdatedChanges(
        { status: ActivityStatus.IN_PROGRESS, responsavelId: "ana" },
        { status: ActivityStatus.IN_PROGRESS, responsavelId: "carlos" },
      )),
    ];

    expect(valueAtClosing(events, "responsavelId", AGOSTO_FECHAMENTO)).toBe("ana");
    expect(valueAtClosing(events, "responsavelId", AGORA)).toBe("carlos");
  });

  it("does not treat JSON null as AUSENTE (esforço não informado)", () => {
    const events = [
      event("2026-09-01T09:00:00-03:00", 1n, buildActivityCreatedChanges({
        status: ActivityStatus.IN_PROGRESS,
        esforco: null,
      })),
    ];
    expect(valueAtClosing(events, "esforco", AGORA)).toBeNull();
    expect(valueAtClosing(events, "esforco", AGORA)).not.toBe(PORTRAIT_ABSENT);
  });
});
