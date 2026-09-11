"use client";

import { ErrorState } from "@/ui/feedback/ErrorState";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";

type KanbanErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function KanbanError({ reset }: KanbanErrorProps) {
  return (
    <ErrorState
      title="Não foi possível carregar o Kanban"
      message="Recarregue a página para tentar de novo. As atividades não foram perdidas."
      action={
        <PrimaryButton type="button" onClick={reset}>
          Tentar de novo
        </PrimaryButton>
      }
    />
  );
}
