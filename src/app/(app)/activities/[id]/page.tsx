import { notFound } from "next/navigation";
import { getActivity } from "@/application/activities";
import { activityRepository, requireActiveUser } from "@/infrastructure/composition";
import { ActivityDetail } from "@/ui/activities/ActivityDetail";

type ActivityPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActivityDetailPage({ params }: ActivityPageProps) {
  const { id } = await params;
  const actor = await requireActiveUser();
  const activity = await getActivity(actor, id, activityRepository);

  if (!activity) {
    notFound();
  }

  return <ActivityDetail activity={activity} />;
}
