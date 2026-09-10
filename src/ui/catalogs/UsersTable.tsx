import { EmptyState } from "@/ui/feedback/EmptyState";
import type { CatalogUserDto } from "@/ui/catalogs/catalog-types";

type UsersTableProps = {
  users: CatalogUserDto[];
};

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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Usuários autorizados</caption>
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Nome</th>
            <th scope="col" className="px-4 py-3 font-medium">E-mail</th>
            <th scope="col" className="px-4 py-3 font-medium">Ativo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3 font-medium text-zinc-900">
                {user.displayName ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-700">{user.email ?? "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    user.isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
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
