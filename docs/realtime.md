# Hub de realtime — desenho para T06 e T21

**Task:** T04 / T21  
**Versão:** 1.1  
**Data:** 2026-09-10  
**Status:** Contrato e implementação do hub (`src/infrastructure/realtime`, `GET /api/realtime/sse`). Board ainda não consome o stream (T22).  
**Guia de prova:** [guides/realtime-validation.md](guides/realtime-validation.md)  
**Arquitetura (visão resumida):** [architecture.md §9](architecture.md)

Este documento é o que T06 (modelo) e T21 (hub na aplicação) devem seguir. Não reabre a decisão 11 de 10/09/2026: SSE, replay persistido e retenção de 7 dias permanecem. O que a prova e as fontes de 10/09/2026 mudam é **onde** o stream longo vive com qualidade plena, não o protocolo.

---

## 1. Decisão preservada e adequação de infra

| Item | Permanência |
| --- | --- |
| Transporte cliente | SSE (`text/event-stream`) em `GET /api/realtime/sse` |
| Sinal entre processos | PostgreSQL `LISTEN` / `NOTIFY` no canal `realtime` |
| Fonte da verdade do replay | tabela `RealtimeEvent`, não memória |
| Cursor | `Last-Event-ID` = `RealtimeEvent.id` (decimal) |
| Retenção | 7 dias; cleanup **não** toca `AuditEvent` |
| Protocolo nesta task | **não** migrar para WebSocket, Socket.IO, Redis Pub/Sub ou polling como substituto |

**Adequação de infraestrutura (explícita antes de T21):**

| Ambiente | SSE como protocolo | Conexão longa | O que T10 / T29 precisam saber |
| --- | --- | --- | --- |
| Local (Compose, T05) | sim | sim, processo Node | um `pg.Client` de `LISTEN` por container `app` |
| Homologação Vercel | sim, **sem troca de protocolo** | **não** de forma ilimitada: teto de Function 300 s (Hobby) ou até 800 s / 1800 s beta (Pro/Enterprise), consulta [Vercel duration](https://vercel.com/docs/functions/configuring-functions/duration) em 2026-09-10 | realtime **degradado**: o cliente reconecta no corte; replay por `Last-Event-ID` cobre o buraco; `maxDuration` explícito na rota; URL **unpooled** para `LISTEN`; não vender homologação como “SSE o dia inteiro” |
| Produção Kubernetes | sim | sim, com ingress sem buffer e timeouts altos | ambiente **alvo** de SSE longo; ≥ 2 réplicas ouvindo o mesmo PG; CronJob de 7 dias (T29) |

A prova Vercel/K8s com HTTP autenticado está **pendente de acesso**. A conclusão acima é análise de runtime + spike local, não um aceite externo. Se a prova futura mostrar que a homologação Vercel é inutilizável mesmo com reconexão (por exemplo `LISTEN` bloqueado no banco), T10 registra o bloqueio e a opção operacional é homologar realtime no cluster (ou em Compose) **sem** abandonar SSE.

---

## 2. `RealtimeEvent` não é `AuditEvent`

Dois registros distintos, gravados na **mesma transação** da mutação quando ambos se aplicam.

| | `AuditEvent` (T12) | `RealtimeEvent` (T06 / T21) |
| --- | --- | --- |
| Função | retrato histórico, timeline, conformidade | acordar UIs e invalidar queries |
| Retenção | permanente no MVP | 7 dias |
| Payload | antes/depois das dimensões do retrato | ids mínimos para invalidar cache |
| Consumidor | relatórios, histórico da atividade | hub SSE + cliente |
| Cleanup T29 | **nunca** apagar | `DELETE` por `createdAt` |

Não reutilizar `AuditEvent` como fila de realtime: o volume, o formato e o ciclo de vida são outros. Não copiar o JSON de auditoria para o evento realtime.

### 2.1 Modelo conceitual (T06 materializa)

```text
RealtimeEvent
-------------
id          BIGINT  PK  gerado pelo banco (IDENTITY / BIGSERIAL)
                        monotônico na instância PostgreSQL desta aplicação
type        VARCHAR     nome estável do evento de domínio (não é o campo SSE "resync")
payload     JSONB       só ids e chaves de invalidação; sem snapshot de entidade
createdAt   TIMESTAMPTZ not null, default now()
```

Índices:

- PK em `id` (replay: `WHERE id > $cursor ORDER BY id ASC`).
- `createdAt` (cleanup: `WHERE createdAt < now() - interval '7 days'`).

Sem FK para Atividade/Projeto: o evento é efêmero; cleanup não deve brigar com integridade referencial. Sem enum PostgreSQL em `type`: T21 pode acrescentar tipos sem migration. Sem `actorId` obrigatório: autoria vive na auditoria.

`id` no fio SSE é a representação decimal em ASCII (`id: 1842`), para caber em `Last-Event-ID` (string UTF-8 sem NUL/CR/LF, [HTML LS §9.2.4](https://html.spec.whatwg.org/multipage/server-sent-events.html)). No TypeScript, tratar como `bigint` internamente e **string** na borda HTTP/JSON.

### 2.2 `type` persistido (vocabulário inicial)

São sinais de invalidação, não transições de workflow. T21 emite quando a mutação correspondente existir. T06 **não** precisa de uma linha por tipo.

| `type` | Quando (T21) | `payload` mínimo |
| --- | --- | --- |
| `activity.created` | atividade criada | `{ "entityKind": "activity", "entityId": "<uuid>" }` |
| `activity.updated` | edição de campos / participantes / datas | idem; `projectId` se vinculado |
| `activity.status_changed` | T14 (board, conclusão, cancelamento, reabertura) | idem + `projectId` opcional |
| `activity.checklist_changed` | T15 | `{ "entityKind": "task", "entityId": "<uuid-tarefa-ou-atividade>", "activityId": "<uuid>" }` |
| `project.changed` | criação/edição/cancelamento de projeto | `{ "entityKind": "project", "entityId": "<uuid>" }` |
| `catalog.changed` | área ou domínio | `{ "entityKind": "area" \| "domain", "entityId": "<uuid>" }` |
| `value_delivery.changed` | Entrega de Valor (T23/T28) | `{ "entityKind": "valueDelivery", "entityId": "<uuid>", "projectId": "<uuid>" }` |

T21 pode acrescentar tipos no mesmo formato (`entidade.verbo`). Não criar tipos “fake” para preencher buraco de cursor (`resync` **não** é linha nesta tabela).

Não persistir heartbeat, `connected`, ping nem `hello`.

### 2.3 Evento de controle (somente SSE)

| SSE `event:` | Persistido? | Significado |
| --- | --- | --- |
| `resync` | **não** | cursor fora da janela de 7 dias (ou id anterior a tudo o que ainda existe). O cliente descarta o cursor, recarrega as queries da tela e reconecta **sem** `Last-Event-ID` (ou com o novo máximo após o reload). **Não inventar** eventos de domínio para “reconstruir” o que o replay não tem. |
| *(omisso / `message`)* | sim, via `RealtimeEvent` | frame de domínio; `event:` pode repetir `type` para o `EventSource` filtrar |

Heartbeat: linha de comentário SSE `: keepalive` a cada 15 s. Não dispara handler de evento no browser ([HTML LS](https://html.spec.whatwg.org/multipage/server-sent-events.html): linhas que começam com `:` são ignoradas).

Campo `retry:` no início do stream (ex.: `3000`) para o `EventSource` nativo.

---

## 3. Publicação

```text
BEGIN
  mutação da entidade (com version, T12)
  INSERT AuditEvent
  INSERT RealtimeEvent        -- mesmo COMMIT
COMMIT                      -- se qualquer passo falhar, nada ficou visível

pg_notify('realtime', to_char(novo_id))   -- só depois do COMMIT, outra ida ao banco
```

Regras:

1. O `INSERT` de `RealtimeEvent` usa a **mesma** transação Prisma `$transaction` da mutação e da auditoria (`architecture.md` §4.2). Falha no insert aborta a mutação.
2. `NOTIFY` é **pós-commit** no código do adapter de realtime (`src/infrastructure/realtime`), não um trigger obrigatório. Motivo: o comando de aplicação controla o momento; testes conseguem afirmar “rollback não chama notify”; o Prisma não mistura `LISTEN` no client da transação.
3. Semântica PostgreSQL de reserva: um `NOTIFY` **dentro** de uma transação abortada **também** não é entregue ([documentação NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)). O spike cobre os dois caminhos. O caminho oficial da app é “não chamar `NOTIFY` se o commit falhou”.
4. Se o processo morrer **entre** `COMMIT` e `NOTIFY`, o aviso some mas a **linha** permanece. Mitigações obrigatórias em T21 (não são opcionais):
   - no `LISTEN` (e de novo após o `LISTEN` estar ativo), catch-up `SELECT * FROM ... WHERE id > lastSeen ORDER BY id`;
   - no cliente, reconexão com `Last-Event-ID`;
   - duplicatas toleradas (mesmo `id` duas vezes).
5. Não publicar a partir da UI, nem de query de leitura.

`pg_notify` / `SELECT pg_notify($1, $2)` na conexão do **pool de queries** (curta) é aceitável: `NOTIFY` não precisa de sessão dedicada. Só `LISTEN` precisa.

---

## 4. Canal `LISTEN` / `NOTIFY`

| Item | Valor | Justificativa |
| --- | --- | --- |
| Nome do canal | `realtime` | já está em `architecture.md` §9; um canal só no MVP (cinco usuários, um board) |
| Payload | **somente o id decimal** (`"1842"`) | (1) limite 8000 bytes; (2) a tabela é a fonte da verdade — o ouvinte faz `SELECT` da linha já visível; (3) `NOTIFY` com payload idêntico na **mesma** transação é colapsado pelo Postgres — irrelevante se o notify é pós-commit e um por evento; (4) não duplicar o JSON do payload no bus |
| Quem escuta | **um** `pg.Client` por processo Node | não um client por aba; fan-in in-process para os `ReadableStream` SSE daquele processo |
| Quem publica | qualquer replica, após commit | o Postgres espalha o aviso a **todos** os backends que fizeram `LISTEN realtime` |

Ouvinte, ao receber o aviso:

1. Parse do payload como `bigint`.
2. `SELECT` da linha; se não existir ainda (não deve, pós-commit), ignorar — o catch-up cobre.
3. Entregar o frame a todos os SSE conectados **naquele** processo.

Não filtrar por PID do remetente para “ignorar eco”: outras sessões no mesmo processo também precisam do evento (o publisher pode não ter clientes SSE). Eco é barato; o cliente é idempotente no `id`.

---

## 5. Route Handler SSE

Rota estável (T01 / `architecture.md` §5.3):

```text
GET /api/realtime/sse
```

Arquivo previsto: `src/app/api/realtime/sse/route.ts` (T21). Runtime **Node.js**, nunca Edge.

Esboço de contrato (T21 implementa; T04 não cria a app):

```ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // T10 ajusta ao plano Vercel; em K8s o teto da Function não se aplica
```

Fluxo do `GET`:

1. Autenticar (seção 6). Recusar 401/403 **antes** de abrir o stream.
2. Ler cursor: header `Last-Event-ID` (padrão do `EventSource`). Query `?lastEventId=` só como escape para clientes que não sejam `EventSource`; o canônico é o header.
3. Se cursor presente e **expirado** (seção 8): escrever um único evento `event: resync`, `data: {}`, e pode encerrar ou manter o stream após o cliente recarregar — preferir enviar `resync` e **não** replayar um prefixo inventado.
4. Se cursor válido: replay `id > cursor AND createdAt >= now() - interval '7 days' ORDER BY id ASC`. Cada linha vira um frame SSE com `id: <id>`, `event: <type>`, `data: <payload json>`.
5. Catch-up após `LISTEN` ativo (fecha a janela check-then-watch).
6. Entrar no modo live: frames iguais aos do replay, origem = hub in-process alimentado pelo `LISTEN`.
7. Heartbeat `: keepalive\n\n` a cada 15 s.
8. `request.signal` abort → parar de enqueue; **não** derrubar o `LISTEN` do processo (outros clientes podem estar no mesmo isolate). Envolver `controller.enqueue` em try/catch: abort no App Router pode lançar de forma síncrona ([next.js#56529](https://github.com/vercel/next.js/issues/56529), ainda citado em 2026).

Headers: ver [guia](guides/realtime-validation.md) §5.2.

Não usar Server Action para o stream. Não cachear a rota.

---

## 6. Autenticação do stream

A mesma política de páginas, Server Actions e CSV (`architecture.md` §8; T03/T07):

1. Sessão Auth.js em cookie HTTP-only (mesmo origin).
2. Cliente: `new EventSource('/api/realtime/sse', { withCredentials: true })`. O `EventSource` nativo **não** permite `Authorization` arbitrário; por isso o MVP usa cookie, não bearer no header do stream.
3. Servidor: sessão presente → identidade normalizada → usuário local `isActive`. Inativo ou não autorizado: **401/403**, sem `text/event-stream`.
4. Não persistir tokens OIDC no hub. Não aceitar query-string com token (vaza em logs de proxy).
5. Revalidar sessão periodicamente no stream longo (T21: a cada N heartbeats, ou no `maxDuration` da Vercel a reconexão já reautentica). Se a sessão cair no meio: encerrar o stream; o cliente vai ao login.

Cinco usuários no MVP: autorização é binária (pode / não pode usar a app), não há filtragem por “só minhas atividades” no hub. O cliente aplica os filtros de tela sobre os dados recarregados. O payload mínimo existe para invalidar o cache certo, não para autorizar linha a linha no SSE.

---

## 7. `Last-Event-ID`, ordenação, reconexão, janela de 7 dias

| Tema | Contrato |
| --- | --- |
| Cursor | `RealtimeEvent.id`, não timestamp, não índice da conexão, não `AuditEvent.id` |
| Ordem | `ORDER BY id ASC`. O `id` monotônico do Postgres é a ordem de commit visível para replay. Não ordenar por `createdAt` (empate / relógio). |
| Frame SSE | sempre incluir `id:`. Sem `id:`, o browser **não** atualiza `Last-Event-ID` daquele evento. |
| Reconexão nativa | o user agent reenvia `Last-Event-ID` automaticamente ([HTML LS §9.2.3–9.2.4](https://html.spec.whatwg.org/multipage/server-sent-events.html)) |
| Janela | linhas com `createdAt >= now() - 7 days`. Replay nunca devolve linha mais velha, mesmo que o `id` ainda exista por atraso de cleanup |
| Passagem replay → live | catch-up `id > max(id já enviado neste GET)` depois do `LISTEN`; duplicata no fio é permitida e **esperada** (commit+NOTIFY vs catch-up, réplicas, reconexão). O cliente T22 aplica por `id` já visto e ignora repetição. |
| Relógio | `createdAt` em `TIMESTAMPTZ`; cleanup usa o relógio do banco |

O cliente T22:

- guarda o último `id` aplicado;
- ignora `id` ≤ último;
- em `error` do `EventSource`, deixa o browser reconectar (ou recria o objeto se `CLOSED`);
- em `resync`, invalida queries (board, detalhe, dashboard ligado) e **não** tenta replay local.

---

## 8. Cursor expirado → `resync`

O cursor está expirado quando **qualquer** uma for verdadeira:

1. `Last-Event-ID` não é um inteiro positivo.
2. Não existe mais linha com `id = cursor` **e** `cursor < MIN(id)` atualmente retido (o id foi limpo ou nunca existiu neste banco).
3. A linha do cursor existe mas `createdAt < now() - 7 days` (cleanup atrasado ainda não removeu).

Não está expirado: cursor ausente (primeira conexão) — não replayar o mundo; o cliente já carregou as queries RSC. Só entrar em live (+ catch-up curto). Não despejar 7 dias de eventos numa aba nova.

Não está expirado: cursor presente, linha ainda na janela — replay `id > cursor`.

Comportamento:

```text
event: resync
data: {"reason":"cursor_expired"}

```

(`data` mínimo; `reason` estável para log de cliente. **Não** incluir lista inventada de entidades.)

O cliente recarrega queries e reconecta sem cursor antigo. T22 formaliza o invalidate; T04 só fecha o sinal.

---

## 9. Comportamento entre réplicas

```text
[Browser A]──SSE──►[Pod 1]──LISTEN──┐
                                    │
[Browser B]──SSE──►[Pod 2]──LISTEN──┼── PostgreSQL
                                    │     RealtimeEvent
[mutação no Pod 1]──INSERT+COMMIT───┤     NOTIFY realtime
                 └──NOTIFY──────────┘
```

- Toda réplica (Compose: 1; K8s: N; Vercel: N isolates) executa `LISTEN realtime` na **mesma** base.
- Não há EventEmitter global de cluster, Redis, nem `globalThis` compartilhado entre pods.
- Sticky session **não** é requisito de correção. Pode existir no ingress por outros motivos; o hub não pode depender dela.
- Duas abas no mesmo pod recebem via fan-in in-process; duas abas em pods diferentes recebem porque **as duas** ouviram o `NOTIFY` e leram a tabela.
- Publicar só em memória do Pod 1 faria o Browser B ficar stale — isso é defeito, não “otimização”.

Vercel: cada isolate com SSE aberto precisa do `LISTEN` desse isolate (Fluid pode reutilizar o isolate e o client módulo-scoped). Ainda assim a publicação é tabela + `NOTIFY`.

---

## 10. Cleanup (7 dias)

| Item | Contrato |
| --- | --- |
| O quê | `DELETE FROM realtime_event WHERE created_at < now() - interval '7 days'` (nomes Prisma/T06) |
| Onde | CronJob Kubernetes (T29). Homologação Vercel: Cron Job da plataforma **ou** aceitar crescimento até alguém rodar o mesmo SQL; T10 documenta a escolha. Local: opcional / manual |
| O que nunca apagar | `AuditEvent` e entidades de domínio |
| Efeito no stream | clientes com cursor antigo recebem `resync` (seção 8), não “buraco silencioso” |

Não implementar o CronJob em T04.

---

## 11. Limites conhecidos (fontes, 2026-09-10)

### 11.1 Vercel serverless / Fluid Compute / duração / SSE

- Invocação de Function, **incluindo stream**, morre em `maxDuration`. Default Fluid 300 s; Hobby teto 300 s; Pro/Enterprise 800 s GA e 1800 s beta por função. Estouro → 504 `FUNCTION_INVOCATION_TIMEOUT`. Fontes: [duration](https://vercel.com/docs/functions/configuring-functions/duration), [limitations](https://vercel.com/docs/functions/limitations).
- Fluid Compute reusa instâncias e cobra memória provisionada o tempo todo em que a instância existe; espera de I/O não conta como CPU ativa ([Fluid](https://vercel.com/docs/fluid-compute)). SSE ocioso com `LISTEN` aberto **segura** isolate + conexão PG.
- HTTP/2: a plataforma envia `PING` em handlers longos ociosos; HTTP/1.1 precisa de heartbeat no body (mesma página de duration).
- Edge: stream ≤ 300 s e sem `pg` de sessão longa — **fora** deste hub.
- WebSocket em Functions está em beta na documentação de limitações (2026); **não** é o transporte do MVP.
- Conclusão T04: Vercel **não** sustenta SSE de jornada de trabalho contínua. Sustenta SSE **curto** com reconexão e replay. Isso **não** autoriza trocar SSE. Homologação opera em modo degradado. Produção plena é Kubernetes.

### 11.2 Next.js Route Handlers e streams

- App Router: `GET` devolve `Response` + `ReadableStream` (Web Streams), não `res.write` de Pages Router. Documentação de [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
- `dynamic = "force-dynamic"` para não cachear o GET.
- Abort do cliente pode lançar ao fazer `enqueue` depois do close (issue Next.js 56529; relatos em Next 16.x). T21: flag `closed` + try/catch em todo write.
- Middleware Edge **não** segura o stream; autenticação do SSE vai no próprio Route Handler (pode ler o cookie JWT sem round-trip extra).

### 11.3 Proxies que bufferizam SSE

- nginx: `proxy_buffering` default **on**; a resposta só flui quando o buffer enche. Desligar com `proxy_buffering off` e/ou header de resposta `X-Accel-Buffering: no` ([módulo proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)).
- ingress-nginx: `proxy-read-timeout` / `proxy-send-timeout` default **60 s** — mata SSE ocioso. Anotar `3600` (ou mais) na rota, como já se faz para WebSocket ([guia miscellaneous](https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/miscellaneous.md)).
- `Cache-Control: no-transform` reduz surpresa de proxies intermediários. gzip no stream SSE deve ser evitado (`Content-Encoding` identidade).
- CDN na frente do cluster: exigir bypass de buffer para `/api/realtime/sse` (T29).

### 11.4 Múltiplas réplicas no Kubernetes

- `NOTIFY` é broadcast: cada sessão `LISTEN` recebe ([NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)). N réplicas ⇒ N entregas do mesmo aviso ⇒ cada uma empurra aos seus clientes SSE. Correto.
- Pooler em transaction mode na URL de `LISTEN` quebra a inscrição em silêncio. Produção: conexão direta ou session mode só para o hub.
- Reload de config do ingress-nginx pode encerrar workers após `worker-shutdown-timeout` (~240 s). O cliente reconecta; replay cobre. Não é motivo para sticky.
- Não usar `replicas: 1` como “solução de realtime”. A prova T29 pede duas réplicas.

---

## 12. Ajustes para T10, T21 e T29

| Task | Ajuste |
| --- | --- |
| **T06** | Criar o modelo da seção 2.1. `type` string; `payload` Json; `id` BigInt identity; índice em `createdAt`. Não modelar `resync` como linha. |
| **T10** | `maxDuration` na rota SSE; Fluid Compute; `DATABASE_URL_LISTEN` unpooled; documentar no guia de homologação que o realtime **reconecta no teto da Function** e que a prova longa fica para o cluster. Não tratar preview Vercel como aceite de SSE de produção. |
| **T21** | Implementar este documento. Hub singleton por processo; `NOTIFY` pós-commit; catch-up; frames com `id:`; `resync`; cookies; Node runtime. Testes: rollback sem publish; duas conexões `LISTEN`; cursor expirado. **Não** considerar o spike como o hub. |
| **T29** | Ingress sem buffer + timeouts longos; duas réplicas; CronJob 7 dias **só** `RealtimeEvent`; probes que **não** considerem SSE aberto como unhealthy à toa; `terminationGracePeriodSeconds`; URL de listen fora do pooler transacional. |

---

## 13. Contrato resumido para o Prisma (T06)

Campos obrigatórios na primeira migration:

```prisma
model RealtimeEvent {
  id        BigInt   @id @default(autoincrement())
  type      String
  payload   Json
  createdAt DateTime @default(now()) @db.Timestamptz(6)

  @@index([createdAt])
  @@map("realtime_event")
}
```

Nomes Prisma podem seguir a convenção que T06 escolher (`@@map` incluso ou tabela `RealtimeEvent`); o hub T21 usa o client, não o nome SQL do spike. O spike usa `realtime_event` só para a prova.

---

## 14. Fora desta task

- Código em `src/` da aplicação Next, Route Handler, Auth.js, Prisma de produto.
- CronJob, manifests, projeto Vercel.
- Troca de SSE por outro transporte.
- Commit / push.
