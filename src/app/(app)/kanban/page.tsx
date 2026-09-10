import { EmptyState } from "@/ui/feedback/EmptyState";

export default function KanbanPage() {
  return (
    <EmptyState
      title="Nenhuma atividade no board"
      message="O Kanban único será preenchido quando as atividades forem cadastradas. Use os filtros temporais e colunas padrão na próxima entrega."
    />
  );
}
