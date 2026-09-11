import { expect, test } from "@playwright/test";

test.describe("rotas públicas e recusa sem sessão (T28)", () => {
  test("mostra a página de login com o botão de SSO", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Gestão de Atividades de Arquitetura" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com SSO" })).toBeVisible();
    await expect(page.locator("p[role='alert']")).toHaveCount(0);
  });

  test("mostra o alerta de acesso recusado no login", async ({ page }) => {
    await page.goto("/login?error=AccessDenied");
    await expect(page.locator("p[role='alert']")).toContainText(/permissão/i);
  });

  test("mostra a página 403 sem exigir sessão", async ({ page }) => {
    await page.goto("/403");
    await expect(page.getByRole("heading", { name: "Acesso recusado" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar ao login" })).toBeVisible();
  });

  test("redireciona páginas autenticadas para /login", async ({ page }) => {
    for (const path of ["/kanban", "/dashboard", "/reports", "/projects"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("recusa CSV sem sessão", async ({ request }) => {
    const response = await request.get("/api/reports/csv?period=THIS_MONTH");
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"] ?? "").not.toMatch(/text\/csv/i);
    expect(await response.text()).toMatch(/authentication required/i);
  });

  test("recusa SSE sem sessão e não abre event-stream", async ({ request }) => {
    const response = await request.get("/api/realtime/sse");
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"] ?? "").not.toMatch(/event-stream/i);
    expect(await response.text()).toMatch(/authentication required/i);
  });
});
