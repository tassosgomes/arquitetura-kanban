import { EmptyState } from "@/ui/feedback/EmptyState";

export default function ProjectHistoryPlaceholderPage() {
  return (
    <EmptyState
      title="Histórico ainda não disponível"
      message="Os eventos de auditoria deste projeto aparecerão nesta aba na página completa do projeto."
    />
  );
}
