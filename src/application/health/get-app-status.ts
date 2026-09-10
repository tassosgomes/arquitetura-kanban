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
    message: "Aplicação no ar. Autenticação SSO está disponível na página de login.",
  };
}
