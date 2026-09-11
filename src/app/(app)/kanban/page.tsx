import Link from "next/link";
import { listActivities } from "@/application/activities";
import { activityRepository, requireActiveUser } from "@/infrastructure/composition";
import { ActivityList } from "@/ui/activities/ActivityList";

export default async function KanbanPage() {
  const actor = await requireActiveUser();
  const activities = await listActivities(actor, { includeCancelled: false }, activityRepository);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Kanban</h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600">
            O board com colunas e arrastar-e-soltar entra na próxima entrega. Enquanto isso,
            cadastre e consulte as atividades.
          </p>
        </div>
        <Link
          href="/activities/new"
          className="inline-flex shrink-0 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Nova atividade
        </Link>
      </header>
      <ActivityList
        activities={activities}
        emptyTitle="Nenhuma atividade no board"
        emptyMessage="Cadastre uma atividade ad hoc ou vinculada a um projeto. Canceladas não aparecem nesta lista."
        createHref="/activities/new"
      />
    </div>
  );
}
