import { EmptyState } from "@/ui/feedback/EmptyState";
import type { CatalogUserDto } from "@/ui/catalogs/catalog-types";

type UsersTableProps = {
  users: CatalogUserDto[];
};

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário provisionado"
        message="Usuários autorizados aparecerão aqui após o primeiro login com sucesso."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm">
      <table className="min-w-full text-left text-body-sm">
        <caption className="sr-only">Usuários autorizados</caption>
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Nome
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              E-mail
            </th>
            <th scope="col" className="px-4 py-3 text-label-sm font-semibold uppercase tracking-wider">
              Ativo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {users.map((user) => (
            <tr key={user.id} className="transition-colors hover:bg-primary-container/5">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                    {initials(user.displayName ?? user.email ?? "?")}
                  </div>
                  <span className="font-semibold text-on-surface">{user.displayName ?? "—"}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-code-sm text-on-surface-variant">
                {user.email ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-sm font-semibold ${
                    user.isActive
                      ? "bg-tertiary-fixed text-on-tertiary-fixed"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-tertiary" : "bg-outline"}`}
                    aria-hidden="true"
                  />
                  {user.isActive ? "Sim" : "Não"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
