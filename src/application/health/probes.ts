/** Kubernetes probes. Open SSE connections must not flip these endpoints. */

export type LiveProbe = {
  ok: true;
  status: "live";
};

export type ReadyProbe =
  | { ok: true; status: "ready" }
  | { ok: false; status: "not_ready" };

export function liveProbeBody(): LiveProbe {
  return { ok: true, status: "live" };
}

export const probeHeaders = {
  "Cache-Control": "no-store",
} as const;

/**
 * Readiness of the query pool only. Must not inspect SSE subscribers,
 * LISTEN sockets, or open EventSource counts — open streams are not unhealthy.
 */
export async function checkReadyProbe(
  ping: () => Promise<unknown>,
): Promise<{ body: ReadyProbe; httpStatus: 200 | 503 }> {
  try {
    await ping();
    return { body: { ok: true, status: "ready" }, httpStatus: 200 };
  } catch {
    return { body: { ok: false, status: "not_ready" }, httpStatus: 503 };
  }
}
