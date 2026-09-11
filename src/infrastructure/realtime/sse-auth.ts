import { ForbiddenError, UnauthorizedError } from "@/domain/errors";

export function realtimeAuthErrorResponse(error: unknown): Response | null {
  if (error instanceof UnauthorizedError) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (error instanceof ForbiddenError) {
    return new Response("Not allowed", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return null;
}
