import { requireActiveUser } from "@/infrastructure/auth/require-active-user";
import {
  activityRepository,
  areaRepository,
  auditRepository,
  catalogUserRepository,
  domainRepository,
  projectRepository,
} from "@/infrastructure/composition";
import { handleReportsCsvGet } from "@/infrastructure/csv/handle-reports-csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleReportsCsvGet(request, {
    authenticate: requireActiveUser,
    activities: activityRepository,
    audit: auditRepository,
    users: catalogUserRepository,
    areas: areaRepository,
    domains: domainRepository,
    projects: projectRepository,
  });
}
