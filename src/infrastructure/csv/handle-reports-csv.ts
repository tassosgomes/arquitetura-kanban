import { ForbiddenError, UnauthorizedError, ValidationError } from "@/domain/errors";
import type { LocalUser } from "@/domain/identity/local-user";
import { buildManagementReport } from "@/application/reports/build-management-report";
import type { ManagementSnapshotDeps } from "@/application/reports/compute-management-snapshot";
import { managementReportCsvRecords } from "@/application/reports/report-rows";
import { parseManagementSearchParams } from "@/application/reports/search-params";
import { encodeCsv } from "@/infrastructure/csv/encode";

export type ReportsCsvDeps = ManagementSnapshotDeps & {
  authenticate: () => Promise<LocalUser>;
};

function searchParamsFromUrl(url: URL): Record<string, string> {
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

function authErrorResponse(error: unknown): Response | null {
  if (error instanceof UnauthorizedError) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (error instanceof ForbiddenError) {
    return new Response("Not allowed", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return null;
}

export async function handleReportsCsvGet(
  request: Request,
  deps: ReportsCsvDeps,
): Promise<Response> {
  let actor: LocalUser;
  try {
    actor = await deps.authenticate();
  } catch (error) {
    const refused = authErrorResponse(error);
    if (refused) {
      return refused;
    }
    throw error;
  }

  const parsed = parseManagementSearchParams(searchParamsFromUrl(new URL(request.url)));
  if (parsed.error) {
    return new Response(parsed.error, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const report = await buildManagementReport(actor, parsed.query, deps);
    const body = encodeCsv(managementReportCsvRecords(report.activities));
    return new Response(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="relatorio-atividades.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }
    throw error;
  }
}
