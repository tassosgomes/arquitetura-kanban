import { test } from "@playwright/test";

/**
 * Intended authenticated journey (T28 / ADR-018):
 * login SSO → projeto → atividade → checklist → Kanban → Entrega de Valor → Book/CSV.
 *
 * Skipped until a real Logto (or CyberArk) application is provisioned. A forged
 * Auth.js session cookie would only prove the UI with a mock identity, which
 * the common task criterion forbids treating as a validated login.
 *
 * Application-layer coverage without IdP: `src/application/mvp-integrated-flow.postgres.test.ts`.
 * Re-enable this spec after docs/guides/oidc.md is filled and login works in the target env.
 */
test.describe("fluxo autenticado (pendente de OIDC real)", () => {
  test("login → projeto → atividade → checklist → Kanban → entrega → Book/CSV", async ({
    page,
  }) => {
    test.skip(
      true,
      "Login SSO real não está validado. Não forjar sessão Auth.js para marcar este aceite.",
    );

    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar com SSO" }).click();
    await page.waitForURL("**/kanban");
    await page.getByRole("link", { name: "Projetos" }).click();
    await page.getByRole("link", { name: "Kanban" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.getByRole("link", { name: "Book" }).click();
    await page.getByRole("heading", { name: "Book executivo" }).waitFor();
    await page.getByRole("link", { name: "Exportar CSV" }).click();
  });
});
