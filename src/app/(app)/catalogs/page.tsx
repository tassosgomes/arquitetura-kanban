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
    <section aria-labelledby="catalog-users-title" className="flex flex-col gap-space-md">
      <div>
        <h2 id="catalog-users-title" className="text-headline-md text-on-surface">
          Usuários autorizados
        </h2>
        <p className="mt-1 text-body-sm leading-6 text-on-surface-variant">
          Referência para responsáveis e participantes. A gestão de permissões permanece no provedor
          de identidade; apenas usuários ativos entram em novas atribuições.
        </p>
      </div>
      <UsersTable users={users.map(toUserDto)} />
    </section>
  );
}
