import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";

function dispatch(path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return middleware(new NextRequest(`http://localhost:3000${path}`, { headers }));
}

function locationOf(response: Response): string {
  return response.headers.get("location") ?? "";
}

describe("middleware (T28)", () => {
  it("lets anonymous users reach login and 403", () => {
    expect(dispatch("/login").status).toBeLessThan(300);
    expect(dispatch("/403").status).toBeLessThan(300);
  });

  it("redirects anonymous HTML app routes to login", () => {
    for (const path of ["/kanban", "/dashboard", "/reports", "/projects"]) {
      const response = dispatch(path);
      expect(response.status).toBe(307);
      expect(locationOf(response)).toMatch(/\/login$/);
    }
  });

  it("does not redirect CSV or SSE so handlers can refuse with 401", () => {
    expect(dispatch("/api/reports/csv").status).toBeLessThan(300);
    expect(dispatch("/api/realtime/sse").status).toBeLessThan(300);
    expect(dispatch("/api/auth/session").status).toBeLessThan(300);
    expect(dispatch("/api/health/live").status).toBeLessThan(300);
  });

  it("sends a signed-in visitor away from /login", () => {
    const response = dispatch("/login", "authjs.session-token=placeholder");
    expect(response.status).toBe(307);
    expect(locationOf(response)).toMatch(/\/kanban$/);
  });
});
