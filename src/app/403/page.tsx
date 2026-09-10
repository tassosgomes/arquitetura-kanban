import { dismissForbidden } from "@/app/actions/auth";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="flex max-w-md flex-col gap-4">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">403</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Acesso recusado</h1>
        <p className="text-lg leading-7 text-zinc-700">
          Sua conta local está inativa ou não está autorizada a usar esta aplicação. O histórico
          existente é preservado. Fale com quem administra o acesso se precisar reativar.
        </p>
        <form action={dismissForbidden}>
          <button type="submit" className="text-sm font-medium text-zinc-900 underline">
            Voltar ao login
          </button>
        </form>
      </section>
    </main>
  );
}
