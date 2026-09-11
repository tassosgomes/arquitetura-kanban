import Link from "next/link";
import { listActivities } from "@/application/activities";
import { activityRepository, requireActiveUser } from "@/infrastructure/composition";
import { ErrorState } from "@/ui/feedback/ErrorState";
import { KanbanBoard } from "@/ui/kanban/KanbanBoard";

export default async function KanbanPage() {
  const actor = await requireActiveUser();

  let activities;
  try {
    activities = await listActivities(actor, { includeCancelled: false }, activityRepository);
  } catch {
    return (
      <ErrorState
        title="Não foi possível carregar o Kanban"
        message="Tente novamente em instantes. As atividades não foram perdidas."
        action={
          <Link
            href="/kanban"
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Tentar de novo
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Kanban</h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            Board único da equipe. Cada card é uma atividade. Clique para abrir o detalhe. Canceladas
            não aparecem nas colunas.
          </p>
        </div>
        <Link
          href="/activities/new"
          className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Nova atividade
        </Link>
      </header>
      <KanbanBoard activities={activities} />
    </div>
  );
}
