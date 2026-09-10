type LoadingStateProps = {
  title?: string;
  message?: string;
};

export function LoadingState({
  title = "Carregando",
  message = "Aguarde enquanto os dados são preparados.",
}: LoadingStateProps) {
  return (
    <section
      className="flex max-w-xl flex-col gap-4"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">Aguarde</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
      <p className="text-lg leading-7 text-zinc-700">{message}</p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-400" />
      </div>
    </section>
  );
}
