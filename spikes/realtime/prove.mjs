#!/usr/bin/env node
/**
 * Spike T04 — prova local de INSERT → COMMIT → NOTIFY → LISTEN + replay.
 * Não é o hub Next.js (T21).
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const CHANNEL = "realtime"
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://spike:spike@127.0.0.1:55432/realtime_spike"

const __dirname = dirname(fileURLToPath(import.meta.url))

let passed = 0
let failed = 0

function pass(name, detail = "") {
  passed += 1
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`)
}

function fail(name, detail) {
  failed += 1
  console.log(`FAIL  ${name} — ${detail}`)
}

function assert(name, cond, detail = "assertion failed") {
  if (cond) pass(name)
  else fail(name, detail)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function waitForNotification(client, { timeoutMs, predicate } = {}) {
  const timeout = timeoutMs ?? 4000
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off("notification", onNotification)
      reject(new Error(`timeout ${timeout}ms waiting for NOTIFY`))
    }, timeout)

    function onNotification(msg) {
      if (predicate && !predicate(msg)) return
      clearTimeout(timer)
      client.off("notification", onNotification)
      resolve(msg)
    }

    client.on("notification", onNotification)
  })
}

async function expectNoNotification(clients, ms, label) {
  const seen = []
  const handlers = clients.map((client, index) => {
    const handler = (msg) => {
      seen.push({ replica: index + 1, channel: msg.channel, payload: msg.payload })
    }
    client.on("notification", handler)
    return handler
  })
  await sleep(ms)
  clients.forEach((client, index) => client.off("notification", handlers[index]))
  if (seen.length === 0) {
    pass(label)
  } else {
    fail(label, `recebeu ${JSON.stringify(seen)}`)
  }
}

async function waitForReady(url, attempts = 30) {
  for (let i = 1; i <= attempts; i += 1) {
    const probe = new pg.Client({ connectionString: url })
    try {
      await probe.connect()
      await probe.query("SELECT 1")
      await probe.end()
      return
    } catch (error) {
      try {
        await probe.end()
      } catch {
        /* ignore */
      }
      if (i === attempts) {
        const hint =
          "Suba o Postgres do README (docker run … -p 55432:5432) e defina DATABASE_URL."
        throw new Error(
          `PostgreSQL indisponível em ${url.replace(/:[^:@/]+@/, ":***@")} após ${attempts} tentativas: ${error.message}. ${hint}`,
        )
      }
      await sleep(500)
    }
  }
}

async function fetchById(client, id) {
  const result = await client.query(
    "SELECT id, type, payload, created_at FROM realtime_event WHERE id = $1",
    [id],
  )
  return result.rows[0] ?? null
}

async function main() {
  console.log("T04 spike — canal:", CHANNEL)
  await waitForReady(DATABASE_URL)

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8")
  const setup = new pg.Client({ connectionString: DATABASE_URL })
  const replicaA = new pg.Client({ connectionString: DATABASE_URL })
  const replicaB = new pg.Client({ connectionString: DATABASE_URL })
  const publisher = new pg.Client({ connectionString: DATABASE_URL })

  const clients = [setup, replicaA, replicaB, publisher]
  try {
    await Promise.all(clients.map((client) => client.connect()))
    await setup.query(schema)
    await setup.query("TRUNCATE realtime_event RESTART IDENTITY")

    await replicaA.query(`LISTEN ${CHANNEL}`)
    await replicaB.query(`LISTEN ${CHANNEL}`)
    pass("E7  duas réplicas LISTEN no mesmo canal")

    // --- E6a: app não chama NOTIFY após rollback ---
    await publisher.query("BEGIN")
    await publisher.query(
      `INSERT INTO realtime_event (type, payload)
       VALUES ('activity.created', '{"entityKind":"activity","entityId":"00000000-0000-4000-8000-000000000001"}')`,
    )
    await publisher.query("ROLLBACK")
    await expectNoNotification(
      [replicaA, replicaB],
      800,
      "E6  rollback da aplicação não publica (sem NOTIFY)",
    )

    const countAfterRollback = await publisher.query(
      "SELECT count(*)::int AS n FROM realtime_event",
    )
    assert(
      "E6  rollback não deixa RealtimeEvent",
      countAfterRollback.rows[0].n === 0,
      `count=${countAfterRollback.rows[0].n}`,
    )

    // --- E6b: NOTIFY dentro da transação abortada (semântica PostgreSQL) ---
    await publisher.query("BEGIN")
    const inside = await publisher.query(
      `INSERT INTO realtime_event (type, payload)
       VALUES ('activity.updated', '{"entityKind":"activity","entityId":"00000000-0000-4000-8000-000000000002"}')
       RETURNING id`,
    )
    await publisher.query("SELECT pg_notify($1, $2)", [
      CHANNEL,
      String(inside.rows[0].id),
    ])
    await publisher.query("ROLLBACK")
    await expectNoNotification(
      [replicaA, replicaB],
      800,
      "E6  NOTIFY intra-transação + ROLLBACK não entrega",
    )

    // --- Commit + NOTIFY pós-commit ---
    const waitA = waitForNotification(replicaA, {
      predicate: (msg) => msg.channel === CHANNEL,
    })
    const waitB = waitForNotification(replicaB, {
      predicate: (msg) => msg.channel === CHANNEL,
    })

    await publisher.query("BEGIN")
    const inserted = await publisher.query(
      `INSERT INTO realtime_event (type, payload)
       VALUES ($1, $2::jsonb)
       RETURNING id, type, payload`,
      [
        "activity.status_changed",
        JSON.stringify({
          entityKind: "activity",
          entityId: "00000000-0000-4000-8000-000000000003",
        }),
      ],
    )
    const committedId = inserted.rows[0].id
    await publisher.query("COMMIT")
    await publisher.query("SELECT pg_notify($1, $2)", [CHANNEL, String(committedId)])

    const [msgA, msgB] = await Promise.all([waitA, waitB])
    assert(
      "E1  réplica A recebeu NOTIFY após COMMIT",
      msgA.payload === String(committedId),
      `payload=${msgA.payload}`,
    )
    assert(
      "E1  réplica B recebeu NOTIFY após COMMIT",
      msgB.payload === String(committedId),
      `payload=${msgB.payload}`,
    )
    assert(
      "payload do canal é só o id",
      msgA.payload === String(committedId) && !msgA.payload.includes("{"),
      msgA.payload,
    )

    const rowA = await fetchById(replicaA, committedId)
    const rowB = await fetchById(replicaB, committedId)
    assert(
      "ouvinte busca a linha pelo id do NOTIFY",
      rowA?.type === "activity.status_changed" && rowB?.id === committedId,
      JSON.stringify(rowA),
    )

    // segundo evento para replay
    await publisher.query("BEGIN")
    const second = await publisher.query(
      `INSERT INTO realtime_event (type, payload)
       VALUES ('project.changed', '{"entityKind":"project","entityId":"00000000-0000-4000-8000-000000000004"}')
       RETURNING id`,
    )
    await publisher.query("COMMIT")
    const secondId = second.rows[0].id
    await publisher.query("SELECT pg_notify($1, $2)", [CHANNEL, String(secondId)])
    // dreno opcional: não falhar se as réplicas ainda processam
    await Promise.allSettled([
      waitForNotification(replicaA, {
        timeoutMs: 2000,
        predicate: (msg) => msg.payload === String(secondId),
      }),
      waitForNotification(replicaB, {
        timeoutMs: 2000,
        predicate: (msg) => msg.payload === String(secondId),
      }),
    ])

    const replay = await replicaA.query(
      `SELECT id, type
       FROM realtime_event
       WHERE id > $1
       ORDER BY id ASC`,
      [committedId],
    )
    assert(
      "E4  replay por id > Last-Event-ID ordenado",
      replay.rows.length === 1 && replay.rows[0].id === secondId,
      JSON.stringify(replay.rows),
    )

    // cursor expirado: id abaixo do mínimo retido
    await publisher.query("DELETE FROM realtime_event WHERE id = $1", [committedId])
    const bounds = await publisher.query(
      "SELECT min(id) AS min_id, max(id) AS max_id FROM realtime_event",
    )
    const minId = bounds.rows[0].min_id
    const staleCursor = committedId
    const staleMissing = await publisher.query(
      "SELECT 1 FROM realtime_event WHERE id = $1",
      [staleCursor],
    )
    const expired =
      staleMissing.rowCount === 0 && minId !== null && staleCursor < minId
    assert(
      "E5  cursor anterior a MIN(id) ⇒ resync (sem inventar domínio)",
      expired,
      `cursor=${staleCursor} min=${minId}`,
    )

    pass("E3  reconexão simulada via SELECT id > cursor (Last-Event-ID)")
  } finally {
    await Promise.all(
      clients.map(async (client) => {
        try {
          await client.end()
        } catch {
          /* ignore */
        }
      }),
    )
  }

  console.log("")
  console.log(`RESULT: ${failed === 0 ? "ALL PASSED" : "FAILED"}  (${passed} pass, ${failed} fail)`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error("ERROR", error.message)
  process.exitCode = 1
})
