export default function ExecutiveBookLoading() {
  return (
    <div className="flex flex-col gap-space-lg" aria-busy="true" aria-label="Carregando Book">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-container" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-container-lowest" />
      <div className="grid gap-space-lg lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="h-64 animate-pulse rounded-xl bg-surface-container-lowest" />
        <div className="h-[32rem] animate-pulse rounded-xl bg-surface-container-lowest" />
      </div>
    </div>
  );
}
