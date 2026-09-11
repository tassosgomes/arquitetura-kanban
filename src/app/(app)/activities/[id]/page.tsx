import { notFound } from "next/navigation";
import { getActivity, listActivityHistory } from "@/application/activities";
import {
  activityRepository,
  areaRepository,
  auditRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
  requireActiveUser,
} from "@/infrastructure/composition";
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

  const history = await listActivityHistory(
    actor,
    { activityId: id },
    {
      activities: activityRepository,
      audit: auditRepository,
      users: catalogUserRepository,
      areas: areaRepository,
      domains: domainRepository,
      projects: projectRepository,
    },
  );

  return <ActivityDetail activity={activity} history={history} />;
}
