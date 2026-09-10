type AppStatusProps = {
  title: string;
  message: string;
};

export function AppStatus({ title, message }: AppStatusProps) {
  return (
    <section className="flex max-w-xl flex-col gap-4">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Ambiente local
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
      <p className="text-lg leading-7 text-zinc-700">{message}</p>
    </section>
  );
}
