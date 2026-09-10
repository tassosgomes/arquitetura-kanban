import "server-only";

export type AppStatus = {
  ok: true;
  title: string;
  message: string;
};

export function getAppStatus(): AppStatus {
  return {
    ok: true,
    title: "Gestão de Atividades de Arquitetura",
    message:
      "Aplicação no ar. O login SSO (OIDC) será implementado na T07.",
  };
}
