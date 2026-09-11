import { LoadingState } from "@/ui/feedback/LoadingState";

export default function DashboardLoading() {
  return (
    <LoadingState
      title="Carregando dashboard"
      message="Preparando indicadores e distribuições do período selecionado."
    />
  );
}
