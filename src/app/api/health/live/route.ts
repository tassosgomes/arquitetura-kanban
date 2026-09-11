import { liveProbeBody, probeHeaders } from "@/application/health/probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness for Kubernetes. Process up ≠ SSE healthy.
 * Do not point probes at `/api/realtime/sse`.
 */
export function GET(): Response {
  return Response.json(liveProbeBody(), { headers: probeHeaders });
}
