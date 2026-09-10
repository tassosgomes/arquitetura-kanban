const AUTH_ERROR_MESSAGES: Record<string, string> = {
  sso: "Não foi possível iniciar o login corporativo. Tente novamente em instantes.",
  Configuration:
    "A autenticação não está configurada corretamente neste ambiente. Fale com quem administra o acesso.",
  AccessDenied: "Seu usuário não tem permissão para entrar nesta aplicação.",
  OAuthSignin: "Não foi possível iniciar o login. Tente novamente.",
  OAuthCallback: "Não foi possível concluir o login. Tente novamente.",
  OAuthAccountNotLinked:
    "Esta conta não pôde ser vinculada ao perfil local. Use o mesmo provedor de identidade autorizado.",
  CallbackRouteError: "Ocorreu um erro ao retornar do provedor de identidade. Tente novamente.",
  SessionRequired: "Sua sessão expirou. Entre novamente para continuar.",
};

const DEFAULT_AUTH_ERROR_MESSAGE =
  "Não foi possível entrar. Tente novamente ou fale com quem administra o acesso.";

export function getAuthErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[errorCode] ?? DEFAULT_AUTH_ERROR_MESSAGE;
}
