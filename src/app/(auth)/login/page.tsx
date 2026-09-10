import { signInWithSso } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="flex max-w-md flex-col gap-6">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Acesso</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
          Gestão de Atividades de Arquitetura
        </h1>
        <p className="text-lg leading-7 text-zinc-700">
          Entre com a identidade corporativa (SSO) para continuar.
        </p>
        {error ? (
          <p className="text-sm leading-6 text-red-700" role="alert">
            Não foi possível iniciar o SSO. Confira issuer, client e secret OIDC no ambiente
            (guia operacional). O build não depende do discovery — ele ocorre no login.
          </p>
        ) : null}
        <form action={signInWithSso}>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Entrar com SSO
          </button>
        </form>
      </section>
    </main>
  );
}
