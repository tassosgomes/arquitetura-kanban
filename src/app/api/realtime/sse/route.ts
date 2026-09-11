import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import { prisma } from "@/infrastructure/db/prisma";
import { getProcessRealtimeHub } from "@/infrastructure/realtime/hub";
import { getListenConnectionString } from "@/infrastructure/realtime/notify";
import { createPrismaRealtimeEventStore } from "@/infrastructure/realtime/prisma-store";
import { handleRealtimeSseGet } from "@/infrastructure/realtime/sse-handler";
import { InfrastructureError } from "@/infrastructure/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Function duration cap (Hobby / Fluid default). Streaming counts toward
 * this budget; the client reconnects with `Last-Event-ID` and replays. Duplicate
 * frames (same `id`) are tolerated. Kubernetes does not apply this 300s ceiling.
 *
 * Next.js requires a numeric literal here (not an imported constant).
 */
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const listenUrl = getListenConnectionString();
  if (!listenUrl) {
    throw new InfrastructureError("DATABASE_URL is required for the realtime stream.");
  }

  const store = createPrismaRealtimeEventStore(prisma);
  const hub = getProcessRealtimeHub({
    connectionString: listenUrl,
    store,
  });

  return handleRealtimeSseGet(request, {
    authenticate: requireActiveUser,
    revalidateSession: requireActiveUser,
    store,
    hub,
  });
}
