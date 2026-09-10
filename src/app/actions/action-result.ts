import { ApplicationError, ValidationError } from "@/domain/errors";
import { InfrastructureError } from "@/infrastructure/errors";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionErrorPayload };

export type ActionErrorPayload = {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
};

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export function toActionError(error: unknown): ActionErrorPayload {
  if (error instanceof ValidationError) {
    return {
      code: error.code,
      message: error.message,
      fields: error.fields,
    };
  }

  if (error instanceof ApplicationError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof InfrastructureError) {
    return {
      code: "INFRASTRUCTURE",
      message: error.message,
    };
  }

  console.error("Unhandled action error", error);
  return {
    code: "UNKNOWN",
    message: "Não foi possível concluir a operação. Tente novamente.",
  };
}
