import type { ReactNode } from "react";
import { StatusPanel } from "@/ui/feedback/StatusPanel";

type EmptyStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <StatusPanel eyebrow="Nenhum registro" title={title} message={message} action={action} />
  );
}
