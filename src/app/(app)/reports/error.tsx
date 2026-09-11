"use client";

import { ErrorState } from "@/ui/feedback/ErrorState";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";

type ReportsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ReportsError({ reset }: ReportsErrorProps) {
  return (
    <ErrorState
      title="Não foi possível carregar o relatório"
      message="Recarregue a página para tentar de novo. Os dados não foram perdidos."
      action={
        <PrimaryButton type="button" onClick={reset}>
          Tentar de novo
        </PrimaryButton>
      }
    />
  );
}
