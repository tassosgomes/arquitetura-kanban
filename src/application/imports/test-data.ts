import { createHash } from "node:crypto";
import { z } from "zod";
import { isCivilDateString } from "@/domain/calendar/civil-date";
import { ARCHITECTURE_DOMAIN_NAMES } from "@/domain/catalog/architecture-domains";

const date = z.string().refine(isCivilDateString, "Data civil inválida");
const text = z.string().trim().min(1);
const classification = {
  nature: z.enum(["STRATEGIC", "OPERATIONAL"]),
  architectureRole: z.enum(["RESPONSIBLE", "CONTRIBUTOR"]),
};
export const testDataSchema = z.object({
  batchId: z.literal("massa-dados-teste-v1"),
  referenceDate: date,
  synthetic: z.literal(true),
  actorEmail: z.email(),
  decisions: z.array(text),
  projects: z.array(z.object({
    key: text, name: text, area: text, ...classification,
    status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]),
  }).strict()).min(1),
  activities: z.array(z.object({
    key: text, sourceLine: z.number().int().positive(), sourceText: text,
    projectKey: text, area: text, title: text,
    description: z.string(), observations: z.string(), ownerEmail: z.email(),
    domain: z.enum(ARCHITECTURE_DOMAIN_NAMES), ...classification,
    status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "WAITING", "BLOCKED", "DONE"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    startDate: date.nullable(), expectedEndDate: date.nullable(), completedDate: date.nullable(),
    tasks: z.array(text),
  }).strict()).min(1),
}).strict().superRefine((data, ctx) => {
  for (const [label, rows] of [["projects", data.projects], ["activities", data.activities]] as const) {
    if (new Set(rows.map((row) => row.key)).size !== rows.length) {
      ctx.addIssue({ code: "custom", message: `Chaves duplicadas em ${label}` });
    }
  }
  const names = data.projects.map((p) => p.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", message: "Projetos com nomes duplicados" });
  const keys = new Set(data.projects.map((p) => p.key));
  for (const activity of data.activities) {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message: `${activity.key}: ${message}` });
    if (!keys.has(activity.projectKey)) fail("projeto inexistente");
    if (activity.startDate && activity.expectedEndDate && activity.startDate > activity.expectedEndDate) fail("previsão anterior ao início");
    if (activity.completedDate && activity.startDate && activity.completedDate < activity.startDate) fail("conclusão anterior ao início");
    if (activity.completedDate && activity.completedDate > data.referenceDate) fail("conclusão futura");
    if (activity.startDate && activity.startDate > data.referenceDate) fail("início futuro");
    if (activity.status === "DONE" && !activity.completedDate) fail("concluída sem data");
    if (activity.status !== "DONE" && activity.completedDate) fail("conclusão em atividade aberta");
    if (activity.status === "IN_PROGRESS" && !activity.startDate) fail("em andamento sem início explícito");
  }
});

export type TestData = z.infer<typeof testDataSchema>;
export function testDataHash(data: TestData): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export function summarizeTestData(data: TestData) {
  const count = (values: string[]) => values.reduce<Record<string, number>>((out, value) => {
    out[value] = (out[value] ?? 0) + 1;
    return out;
  }, {});
  return {
    batchId: data.batchId, referenceDate: data.referenceDate,
    projects: data.projects.length, activities: data.activities.length,
    tasks: data.activities.reduce((n, a) => n + a.tasks.length, 0),
    owners: count(data.activities.map((a) => a.ownerEmail)),
    statuses: count(data.activities.map((a) => a.status)),
  };
}
