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
              className="inline-flex rounded-xl bg-primary-container px-4 py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Nova entrega de valor
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm">
      <table className="min-w-full text-left text-body-sm">
        <caption className="sr-only">Lista de entregas de valor</caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Título
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Data de referência
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Autor
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {deliveries.map((delivery) => {
            const href = `/projects/${projectId}/value-deliveries/${delivery.id}`;
            return (
              <tr key={delivery.id} className="transition-colors hover:bg-primary-container/5">
                <td className="px-4 py-3">
                  <Link href={href} className="font-semibold text-on-surface hover:text-primary">
                    {delivery.title}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-code-sm text-on-surface-variant">
                  {formatCivilDatePtBr(delivery.referenceDate)}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{formatUserLabel(delivery.author)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      href={href}
                      className="rounded-md px-2 py-1 text-label-sm font-semibold text-primary hover:underline"
                    >
                      Ver
                    </Link>
                    {canWrite ? (
                      <Link
                        href={`${href}/edit`}
                        className="rounded-md px-2 py-1 text-label-sm font-semibold text-primary hover:underline"
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
