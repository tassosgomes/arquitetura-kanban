import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/domain/errors";
import { requireActiveUser } from "@/infrastructure/composition";
import { AppShell } from "@/ui/layout/AppShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadActiveUser() {
  try {
    return await requireActiveUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof ForbiddenError) {
      redirect("/403");
    }
    throw error;
  }
}

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await loadActiveUser();

  return <AppShell user={user}>{children}</AppShell>;
}
