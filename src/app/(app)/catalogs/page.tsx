import { listUsers } from "@/application/catalogs";
import {
  catalogUserRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
import { UsersTable } from "@/ui/catalogs/UsersTable";
import type { CatalogUserDto } from "@/ui/catalogs/catalog-types";

function toUserDto(user: {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
}): CatalogUserDto {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    isActive: user.isActive,
  };
}

export default async function CatalogsPage() {
  const actor = await requireActiveUser();
  const users = await listUsers(actor, catalogUserRepository);

  return (
    <section aria-labelledby="catalog-users-title" className="flex flex-col gap-4">
      <div>
        <h2 id="catalog-users-title" className="text-lg font-semibold text-zinc-900">
          Usuários autorizados
        </h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Referência para responsáveis e participantes. A gestão de permissões permanece no provedor
          de identidade; apenas usuários ativos entram em novas atribuições.
        </p>
      </div>
      <UsersTable users={users.map(toUserDto)} />
    </section>
  );
}
