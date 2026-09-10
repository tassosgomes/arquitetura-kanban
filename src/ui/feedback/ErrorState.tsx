import type { ReactNode } from "react";
import { StatusPanel } from "@/ui/feedback/StatusPanel";

type ErrorStateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
};

export function ErrorState({
  title = "Não foi possível carregar",
  message,
  action,
}: ErrorStateProps) {
  return (
    <StatusPanel eyebrow="Erro" title={title} message={message} action={action} role="alert" />
  );
}
