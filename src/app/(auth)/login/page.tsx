import { signInWithSso } from "@/app/actions/auth";
import { getAuthErrorMessage } from "@/app/(auth)/login/auth-errors";
import { Logo } from "@/ui/layout/Logo";
import { PrimaryButton } from "@/ui/forms/PrimaryButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = getAuthErrorMessage(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <section className="flex w-full max-w-md flex-col gap-space-lg rounded-2xl bg-surface-container-lowest p-space-xl shadow-lg">
        <Logo className="h-10 w-10" />
        <div className="flex flex-col gap-2">
          <p className="text-label-sm uppercase tracking-wider text-outline">Acesso</p>
          <h1 className="text-headline-lg text-on-surface">Gestão de Atividades de Arquitetura</h1>
          <p className="text-body-lg leading-7 text-on-surface-variant">
            Entre com a identidade corporativa (SSO) para continuar.
          </p>
        </div>
        {errorMessage ? (
          <p
            className="rounded-xl border border-secondary-container/40 bg-secondary-container/10 px-4 py-3 text-body-sm leading-6 text-on-surface"
            role="alert"
          >
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
