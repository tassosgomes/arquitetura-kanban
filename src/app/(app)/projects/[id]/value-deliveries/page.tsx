import { EmptyState } from "@/ui/feedback/EmptyState";

export default function ProjectValueDeliveriesPlaceholderPage() {
  return (
    <EmptyState
      title="Entregas de valor ainda não disponíveis"
      message="As entregas de valor deste projeto aparecerão aqui quando o cadastro Markdown estiver pronto."
    />
  );
}
