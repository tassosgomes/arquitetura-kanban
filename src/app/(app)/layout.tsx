import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/domain/errors";
import type { LocalUser } from "@/domain/identity/local-user";
import { requireActiveUser } from "@/infrastructure/composition";
import { signOutAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadActiveUser(): Promise<LocalUser> {
  try {
    return await requireActiveUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof ForbiddenError) {
      redirect("/403");
    }
    throw error;
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await loadActiveUser();
  const label = user.displayName ?? "Usuário";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <p className="text-sm font-medium text-zinc-900">Gestão de Atividades de Arquitetura</p>
        <div className="flex items-center gap-4">
          <p className="text-sm text-zinc-700">{label}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-900 underline hover:text-zinc-700"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
