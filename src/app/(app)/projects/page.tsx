import { EmptyState } from "@/ui/feedback/EmptyState";

export default function ProjectsPage() {
  return (
    <EmptyState
      title="Nenhum projeto cadastrado"
      message="Cadastre projetos com área, responsáveis, participantes e datas para vincular atividades de arquitetura."
    />
  );
}
