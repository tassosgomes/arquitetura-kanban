import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "@/app/(auth)/login/auth-errors";

describe("getAuthErrorMessage", () => {
  it("returns null when no error code is provided", () => {
    expect(getAuthErrorMessage(undefined)).toBeNull();
  });

  it("maps known Auth.js error codes to friendly messages", () => {
    expect(getAuthErrorMessage("Configuration")).toMatch(/configurada corretamente/i);
    expect(getAuthErrorMessage("AccessDenied")).toMatch(/permissão/i);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(getAuthErrorMessage("UnexpectedProviderFailure")).toMatch(/Não foi possível entrar/i);
  });
});
