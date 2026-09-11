import { describe, expect, it } from "vitest";
import { checkReadyProbe, liveProbeBody } from "@/application/health/probes";

describe("kubernetes probes", () => {
  it("live payload does not depend on the database or SSE", () => {
    expect(liveProbeBody()).toEqual({ ok: true, status: "live" });
  });

  it("ready succeeds when the ping resolves", async () => {
    const result = await checkReadyProbe(async () => 1);
    expect(result).toEqual({
      body: { ok: true, status: "ready" },
      httpStatus: 200,
    });
  });

  it("ready returns 503 without leaking the cause", async () => {
    const result = await checkReadyProbe(async () => {
      throw new Error("postgresql://user:secret@db/prod");
    });
    expect(result.httpStatus).toBe(503);
    expect(result.body).toEqual({ ok: false, status: "not_ready" });
    expect(JSON.stringify(result.body)).not.toMatch(/secret|postgresql/i);
  });
});
