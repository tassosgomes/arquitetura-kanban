export default function AuthenticatedHomePage() {
  return (
    <main className="px-6 py-12">
      <section className="flex max-w-xl flex-col gap-4">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Sessão autenticada</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Área autenticada</h1>
        <p className="text-lg leading-7 text-zinc-700">
          Login e autorização no servidor estão ativos. A navegação completa do Kanban entra na
          próxima entrega.
        </p>
      </section>
    </main>
  );
}
