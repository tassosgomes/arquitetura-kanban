import { liveProbeBody, probeHeaders } from "@/application/health/probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Alias of `/api/health/live` for operators who hit the prefix. */
export function GET(): Response {
  return Response.json(liveProbeBody(), { headers: probeHeaders });
}
