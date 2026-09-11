import { signOutAction } from "@/app/actions/auth";
import type { LocalUser } from "@/domain/identity/local-user";
import { AppNav } from "@/ui/layout/AppNav";
import { Logo } from "@/ui/layout/Logo";
import { SkipLink } from "@/ui/layout/SkipLink";
import { ThemeToggle } from "@/ui/theme/ThemeToggle";

type AppShellProps = {
  user: LocalUser;
  children: React.ReactNode;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export function AppShell({ user, children }: AppShellProps) {
  const label = user.displayName ?? "Usuário";
  const initials = getInitials(label);

  return (
    <div className="min-h-screen bg-surface">
      <SkipLink />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col justify-between bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.06)] lg:flex">
        <div className="flex flex-col">
          <div className="flex h-16 items-center gap-space-sm px-space-lg">
            <Logo className="h-8 w-8 shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-headline-sm text-on-surface">Arquitetura</span>
              <span className="font-mono text-code-sm text-on-surface-variant">Enterprise Core</span>
            </div>
          </div>
          <div className="px-space-md py-space-sm">
            <p className="px-space-sm pb-space-xs text-label-sm text-outline uppercase tracking-wider">Governança</p>
            <AppNav />
          </div>
        </div>
        <div className="bg-surface-container-low/60 p-space-md">
          <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-lowest p-space-sm shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
            <div className="flex min-w-0 items-center gap-space-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-label-sm font-bold text-on-primary">
                {initials}
              </div>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-label-md font-semibold text-on-surface">{label}</span>
                {user.email ? (
                  <span className="truncate font-mono text-code-sm text-outline">{user.email}</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
              <form action={signOutAction}>
                <button
                  type="submit"
                  title="Sair"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    logout
                  </span>
                  <span className="sr-only">Sair</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <header className="border-b border-outline-variant bg-surface-container-lowest lg:hidden">
        <div className="flex items-center justify-between gap-space-sm px-space-md py-space-sm">
          <div className="flex items-center gap-space-sm">
            <Logo className="h-7 w-7" />
            <span className="text-headline-sm text-on-surface">Arquitetura</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="sr-only">Usuário autenticado: {label}. </span>
                Sair
              </button>
            </form>
          </div>
        </div>
        <AppNav orientation="horizontal" />
      </header>

      <div className="lg:pl-64">
        <main id="conteudo-principal" tabIndex={-1} className="min-w-0 focus:outline-none">
          <div className="mx-auto w-full max-w-[1800px] px-space-md py-space-lg lg:px-gutter-lg lg:py-space-xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
