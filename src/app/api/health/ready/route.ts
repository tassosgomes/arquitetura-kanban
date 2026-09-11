import { checkReadyProbe, probeHeaders } from "@/application/health/probes";
import { prisma } from "@/infrastructure/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness: query pool answers `SELECT 1`.
 * Does not open LISTEN, count SSE clients, or touch RealtimeEvent.
 */
export async function GET(): Promise<Response> {
  const { body, httpStatus } = await checkReadyProbe(() => prisma.$queryRaw`SELECT 1`);
  return Response.json(body, { status: httpStatus, headers: probeHeaders });
}
