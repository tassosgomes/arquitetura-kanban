// Conversion of this specific legacy fixture, not a generic natural-language parser.
// Prints JSON to stdout; never accesses the database.
import { readFileSync } from "node:fs";
import { testDataSchema } from "../src/application/imports/test-data";

const emails = ["bruno.dias@tasso.dev.br", "ira.lee@tasso.dev.br", "luiz.gustavo@tasso.dev.br", "tasso.gomes@tasso.dev.br"];
const referenceDate = process.argv[2] ?? "2026-09-17";
const clean = (s: string) => s.trim().replace(/\s+/g, " ").replace(/\.$/, "");
const key = (s: string) => clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const day = (offset: number) => {
  const d = new Date(`${referenceDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
type Raw = { line: number; area: string; project: string; status: string; title: string; description: string; observations: string; priority: boolean; raw: string[]; bullets: string[] };
const rows: Raw[] = [];
let current: Raw | undefined;
let area = "";
let priority = false;
let field: "description" | "observations" | "title" | undefined;
const lines = readFileSync("docs/massa-dados.txt", "utf8").split(/\r?\n/);
for (const [i, line] of lines.entries()) {
  const trimmed = line.trim();
  if (/^área solicitante:/i.test(trimmed) || /^Sensedia -/i.test(trimmed)) {
    area = /^Sensedia/.test(trimmed) ? "Arquitetura" : clean(trimmed.split(":").slice(1).join(":"));
    if (area.startsWith("Arquitetura -")) area = "Arquitetura";
    current = undefined;
    field = undefined;
    continue;
  }
  if (/^Prioridade!/i.test(trimmed)) { priority = true; continue; }
  const match = trimmed.match(/^-\s*(projeto|status|atividades?|descrição|descriação|observação):\s*(.*)$/i);
  if (match?.[1].toLowerCase() === "projeto") {
    current = { line: i + 1, area, project: clean(match[2]), status: "", title: "", description: "", observations: "", priority, raw: [line], bullets: [] };
    rows.push(current);
    priority = false;
    field = undefined;
    continue;
  }
  if (!current) continue;
  current.raw.push(line);
  if (match) {
    const label = match[1].toLowerCase();
    if (label === "status") { current.status = clean(match[2]); field = undefined; }
    else {
      field = label.startsWith("ativ") ? "title" : label.startsWith("descr") ? "description" : "observations";
      current[field] = match[2].trim();
    }
  } else if (trimmed) {
    if (field === "title") current.observations += `${current.observations ? "\n" : ""}${trimmed}`;
    else if (field) current[field] += `${current[field] ? "\n" : ""}${trimmed}`;
    if (/^-\s+/.test(trimmed)) current.bullets.push(trimmed.replace(/^-\s+/, ""));
  }
}
const aliases: Record<string, string> = {
  "construcao-das-esteiras-do-github-com-o-padrao-corporativo-ecad": "Esteiras GitHub — padrão corporativo ECAD",
  "captacao-webscraping-prefeituras": "Captação — webscraping prefeituras",
  "projeto-captacao-webscraping-prefeituras": "Captação — webscraping prefeituras",
  "projeto-captacao-webscraping-fase-2": "Captação — webscraping — fase 2",
  "maestro-dominio-de-dados": "Maestro — domínio de dados",
  "control-m": "Control-M",
};
const seen = new Set<string>();
const activities = rows.filter((r) => r.title).flatMap((r) => {
  const signature = JSON.stringify([r.area, r.project, r.title, r.description, r.observations]);
  if (seen.has(signature)) return [];
  seen.add(signature);
  return [r];
}).map((r, i) => {
  const project = aliases[key(r.project)] ?? r.project;
  const searchable = `${project} ${r.title}`.toLowerCase();
  const domain = /\bia\b|llm|finops/.test(searchable) ? "IA e Automação"
    : /segura|siem|mfa|sso|auditoria/.test(searchable) ? "Segurança e Compliance"
    : /dados|analytics|fabric|ogg|metadata|modelagem/.test(searchable) ? "Dados"
    : /s3|armazenamento|build|esteira|netscaler|control-m/.test(searchable) ? "Infraestrutura e Operação"
    : /api|portal|integra/.test(searchable) ? "Desenvolvimento e Integração" : "Arquitetura";
  const status = /aguardando/i.test(`${r.status} ${r.title} ${r.observations}`) && !/conclu/i.test(r.status) ? "WAITING"
    : /conclu/i.test(r.status) || /\(feito\)/i.test(r.title) ? "DONE"
    : /em andamento/i.test(r.status) ? "IN_PROGRESS" : "BACKLOG";
  const age = 20 + (i * 13) % 65;
  const started = status !== "BACKLOG";
  return {
    key: `atividade-${String(i + 1).padStart(3, "0")}`, sourceLine: r.line, sourceText: r.raw.join("\n").trim(),
    projectKey: key(project), area: r.area, title: r.title,
    description: r.description, observations: r.observations, ownerEmail: emails[i % emails.length],
    domain, nature: /maestro|moderniza|governan|apiops/i.test(searchable) ? "STRATEGIC" : "OPERATIONAL",
    architectureRole: r.area === "Arquitetura" ? "RESPONSIBLE" : "CONTRIBUTOR",
    status, priority: r.priority ? "HIGH" : "MEDIUM",
    startDate: started ? day(-age) : null,
    expectedEndDate: day(started ? -age + 15 : -(i % 12)),
    completedDate: status === "DONE" ? day(-age + 10) : null,
    tasks: r.bullets.filter((b) => /^(realizar|criar|alinhar|divulgar|enviar|cancelar|listar|reenvi|fazer|reunir|marcar|construção|macrocronograma)/i.test(b)),
  };
});
const projects = [...new Map(activities.map((a) => {
  const r = rows.find((r) => r.line === a.sourceLine)!;
  return [a.projectKey, { key: a.projectKey, name: aliases[key(r.project)] ?? r.project, area: a.area,
    nature: a.nature, architectureRole: a.architectureRole,
    // Synthetic project status is explicitly independent of activity completion.
    status: "IN_PROGRESS" }];
})).values()];
const data = testDataSchema.parse({
  batchId: "massa-dados-teste-v1", referenceDate, synthetic: true,
  actorEmail: "tasso.gomes@tasso.dev.br",
  decisions: [
    "Dados de teste; datas e classificações são fictícias. Projetos assumidos em andamento.",
    "Responsáveis distribuídos em rodízio entre os quatro e-mails; autor da carga: tasso.gomes@tasso.dev.br.",
    "Arquitetura - maestro, Arquitetura - gerais e agrupamentos Sensedia usam área Arquitetura.",
    "GSIM-NG e GSIM-G permanecem áreas distintas. Captação fase 2 permanece projeto distinto.",
    "API rematch de pedido, sem atividade própria, não gera projeto; atividade seguinte pertence à API sonorização.",
    "Duplicata exata de disponibilizar as consultas para o ECAD removida; títulos S3 iguais preservados pelos contextos diferentes.",
    "Ausência de status vira BACKLOG; (Feito) vira DONE; indicação de espera vira WAITING, exceto status explicitamente concluído.",
    "Prioridade!!! vira HIGH; demais MEDIUM. Listas de ações claras viram checklist; texto original preservado.",
    "Datas de início/conclusão/previsão nos 90 dias anteriores à referência; previsões vencidas exercitam indicadores de atraso.",
    "Auditoria registra o instante real da importação; não simula alterações históricas do quadro.",
  ], projects, activities,
});
console.log(JSON.stringify(data, null, 2));
