import { EmptyState } from "@/ui/feedback/EmptyState";

export default function DashboardPage() {
  return (
    <EmptyState
      title="Indicadores ainda indisponíveis"
      message="O dashboard gerencial mostrará cards e distribuições quando houver atividades no período selecionado."
    />
  );
}
