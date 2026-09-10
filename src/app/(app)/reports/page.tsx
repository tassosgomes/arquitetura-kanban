import { EmptyState } from "@/ui/feedback/EmptyState";

export default function ReportsPage() {
  return (
    <EmptyState
      title="Nenhum relatório gerado"
      message="Consulte atividades e projetos por período e exporte CSV quando os dados estiverem disponíveis."
    />
  );
}
