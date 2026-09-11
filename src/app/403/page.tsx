import { dismissForbidden } from "@/app/actions/auth";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <section className="flex w-full max-w-md flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-xl shadow-lg">
        <p className="font-mono text-code-sm uppercase tracking-wider text-error">403</p>
        <h1 className="text-headline-lg text-on-surface">Acesso recusado</h1>
        <p className="text-body-lg leading-7 text-on-surface-variant">
          Sua conta local está inativa ou não está autorizada a usar esta aplicação. O histórico
          existente é preservado. Fale com quem administra o acesso se precisar reativar.
        </p>
        <form action={dismissForbidden}>
          <button type="submit" className="text-label-md font-semibold text-primary underline">
            Voltar ao login
          </button>
        </form>
      </section>
    </main>
  );
}
