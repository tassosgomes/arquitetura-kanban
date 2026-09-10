import { signOutAction } from "@/app/actions/auth";
import type { LocalUser } from "@/domain/identity/local-user";
import { AppNav } from "@/ui/layout/AppNav";
import { SkipLink } from "@/ui/layout/SkipLink";

type AppShellProps = {
  user: LocalUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const label = user.displayName ?? "Usuário";

  return (
    <div className="min-h-screen bg-zinc-50">
      <SkipLink />
      <header className="border-b border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p className="text-sm font-semibold text-zinc-900">Gestão de Atividades de Arquitetura</p>
          <div className="flex items-center gap-4">
            <p className="text-sm text-zinc-700">
              <span className="sr-only">Usuário autenticado: </span>
              {label}
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-sm font-medium text-zinc-900 underline transition-colors hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col lg:flex-row">
        <div className="lg:w-56 lg:shrink-0">
          <AppNav />
        </div>
        <main
          id="conteudo-principal"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-8 focus:outline-none lg:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
