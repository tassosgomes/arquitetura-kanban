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
      className="flex max-w-xl flex-col gap-space-sm"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <p className="text-label-sm text-outline uppercase tracking-wider">Aguarde</p>
      <h1 className="text-headline-lg text-on-surface">{title}</h1>
      <p className="text-body-lg text-on-surface-variant">{message}</p>
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary-container" />
      </div>
    </section>
  );
}
