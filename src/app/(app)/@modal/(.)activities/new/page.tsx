import NewActivityPage from "@/app/(app)/activities/new/page";
import { ActivityModal } from "@/app/(app)/@modal/ActivityModal";

type InterceptedActivityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InterceptedActivityPage({
  searchParams,
}: InterceptedActivityPageProps) {
  const params = await searchParams;
  const projectId = typeof params.projectId === "string" ? params.projectId : undefined;

  return (
    <ActivityModal initiallyOpen>
      <NewActivityPage
        searchParams={Promise.resolve({ projectId })}
        presentation="panel"
      />
    </ActivityModal>
  );
}
