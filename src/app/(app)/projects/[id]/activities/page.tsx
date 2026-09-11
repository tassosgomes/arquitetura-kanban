import { EmptyState } from "@/ui/feedback/EmptyState";

export default function ProjectActivitiesPlaceholderPage() {
  return (
    <EmptyState
      title="Atividades ainda não disponíveis"
      message="As atividades vinculadas a este projeto aparecerão aqui na próxima entrega."
    />
  );
}
