"use client";

import { ErrorState } from "@/ui/feedback/ErrorState";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ reset }: DashboardErrorProps) {
  return (
    <ErrorState
      title="Não foi possível carregar o dashboard"
      message="Recarregue a página para tentar de novo. Os indicadores não foram perdidos."
      action={
        <PrimaryButton type="button" onClick={reset}>
          Tentar de novo
        </PrimaryButton>
      }
    />
  );
}
