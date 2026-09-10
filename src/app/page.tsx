import { getAppStatus } from "@/infrastructure/composition";
import { AppStatus } from "@/ui/feedback/AppStatus";

export default function HomePage() {
  const status = getAppStatus();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <AppStatus title={status.title} message={status.message} />
    </main>
  );
}
