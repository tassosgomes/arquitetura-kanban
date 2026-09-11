import { buildKanbanBoard, type ActivityListItem, type KanbanColumn } from "@/application/activities";
import { KanbanCard } from "@/ui/kanban/KanbanCard";

type KanbanBoardProps = {
  activities: ActivityListItem[];
};

function KanbanColumnView({ column }: { column: KanbanColumn }) {
  const headingId = `kanban-coluna-${column.status.toLowerCase()}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-zinc-100 p-3"
    >
      <header className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 id={headingId} className="text-sm font-semibold text-zinc-900">
          {column.label}
        </h2>
        <p className="text-xs text-zinc-500">{column.activities.length}</p>
      </header>
      {column.activities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500">
          Nenhuma atividade nesta coluna.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {column.activities.map((activity) => (
            <li key={activity.id}>
              <KanbanCard activity={activity} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function KanbanBoard({ activities }: KanbanBoardProps) {
  const columns = buildKanbanBoard(activities);
  const total = columns.reduce((sum, column) => sum + column.activities.length, 0);

  return (
    <div className="flex flex-col gap-3">
      {total === 0 ? (
        <p className="text-sm leading-6 text-zinc-600">
          Nenhuma atividade aberta no board. Cadastre uma atividade para começar. Canceladas não
          ocupam coluna.
        </p>
      ) : null}
      <div
        className="-mx-4 overflow-x-auto px-4 lg:-mx-8 lg:px-8"
        role="region"
        aria-label="Kanban da equipe"
      >
        <div className="flex min-w-max gap-3 pb-2">
          {columns.map((column) => (
            <KanbanColumnView key={column.status} column={column} />
          ))}
        </div>
      </div>
    </div>
  );
}
