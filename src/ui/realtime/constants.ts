/** Same-origin SSE stream (docs/realtime.md §5). Cookie session via `withCredentials`. */
export const REALTIME_SSE_PATH = "/api/realtime/sse";

/** Matches server `retry:` / `SSE_RETRY_MS` when the EventSource object is CLOSED. */
export const REALTIME_SSE_RETRY_MS = 3000;

export const REMOTE_UPDATE_BANNER =
  "Atualizado em outra sessão — recarregar pode descartar sua edição";
