import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { createPrismaClient } from "../src/infrastructure/db/create-prisma-client";
import { notifyRealtimeAfterCommit } from "../src/infrastructure/realtime/notify";
import { importTestData } from "../src/application/imports/import-test-data";
import { summarizeTestData, testDataSchema } from "../src/application/imports/test-data";

async function main() {
  const { values } = parseArgs({ options: {
    apply: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    validate: { type: "boolean", default: false },
    file: { type: "string", default: "docs/massa-dados.normalizada.json" },
  } });
  if (values.apply && (values["dry-run"] || values.validate)) throw new Error("Use apenas um modo: --apply, --dry-run ou --validate.");
  const data = testDataSchema.parse(JSON.parse(readFileSync(values.file!, "utf8")));
  if (values.validate) {
    console.log(JSON.stringify({ ...summarizeTestData(data), outcome: "validated-offline" }, null, 2));
    return;
  }
  config({ path: ".env", quiet: true });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Configure DATABASE_URL no .env ou no ambiente.");
  const target = new URL(url);
  if (!["postgres:", "postgresql:"].includes(target.protocol)) throw new Error("DATABASE_URL deve apontar para PostgreSQL.");
  console.log(`Destino: ${target.hostname}:${target.port || "5432"}${target.pathname}; modo: ${values.apply ? "APLICAR" : "SIMULAR"}`);
  const prisma = createPrismaClient(url);
  try {
    const result = await importTestData(prisma, data, {
      apply: values.apply,
      notify: (ids) => notifyRealtimeAfterCommit(ids, url),
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.notificationWarning) console.warn("Carga confirmada, mas a notificação falhou. Atualize o Kanban no navegador.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Prisma/driver errors can contain connection details; never dump them or causes.
  const message = error instanceof Error ? error.message : "Falha desconhecida";
  const safe = /prisma|postgres|password|connection|connect|TLS|SSL|ECONN|P100|P200|P202/i.test(message)
    ? "Falha de conexão ou persistência. Verifique DATABASE_URL, conectividade e migrations do ambiente. Nenhuma carga parcial foi confirmada."
    : message;
  console.error(safe);
  process.exitCode = 1;
});
