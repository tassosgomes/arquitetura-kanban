import { signInWithSso } from "@/app/actions/auth";
import { getAuthErrorMessage } from "@/app/(auth)/login/auth-errors";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = getAuthErrorMessage(error);

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
        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <form action={signInWithSso}>
          <PrimaryButton type="submit">Entrar com SSO</PrimaryButton>
        </form>
      </section>
    </main>
  );
}
