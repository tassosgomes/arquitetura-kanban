import Link from "next/link";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { formatCivilDatePtBr, formatUserLabel } from "@/ui/projects/project-types";
import type { ValueDeliveryListItem } from "@/application/value-deliveries";

type ValueDeliveryListProps = {
  projectId: string;
  deliveries: ValueDeliveryListItem[];
  canWrite: boolean;
};

export function ValueDeliveryList({ projectId, deliveries, canWrite }: ValueDeliveryListProps) {
  const createHref = `/projects/${projectId}/value-deliveries/new`;

  if (deliveries.length === 0) {
    return (
      <EmptyState
        title="Nenhuma entrega de valor neste projeto"
        message="Registre resultados, decisões e impactos da atuação de Arquitetura em Markdown."
        action={
          canWrite ? (
            <Link
              href={createHref}
              className="inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              Nova entrega de valor
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Lista de entregas de valor</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Título
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Data de referência
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Autor
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {deliveries.map((delivery) => {
            const href = `/projects/${projectId}/value-deliveries/${delivery.id}`;
            return (
              <tr key={delivery.id}>
                <td className="px-4 py-3">
                  <Link href={href} className="font-medium text-zinc-900 underline hover:text-zinc-700">
                    {delivery.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatCivilDatePtBr(delivery.referenceDate)}
                </td>
                <td className="px-4 py-3 text-zinc-700">{formatUserLabel(delivery.author)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={href}
                      className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                    >
                      Ver
                    </Link>
                    {canWrite ? (
                      <Link
                        href={`${href}/edit`}
                        className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
                      >
                        Editar
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
