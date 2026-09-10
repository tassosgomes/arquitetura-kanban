# Guia de validação de realtime (SSE + LISTEN/NOTIFY)

**Task:** T04  
**Versão:** 1.0  
**Data:** 2026-09-10  
**Status:** Guia escrito. Spike local **passou** (2026-09-10). Provas externas (Vercel, Kubernetes) **pendentes de acesso**.  
**Desenho do hub:** [docs/realtime.md](../realtime.md)  
**Spike local:** [spikes/realtime/](../../spikes/realtime/)

Este guia deve ser usado **antes** de qualquer prova em homologação ou produção. Não contém credenciais. O responsável pelo projeto providencia contas, banco, cluster e acessos. Quem executa a prova **não** marca Vercel ou Kubernetes como aceitos só porque o desenho é coerente.

A Tech Spec permanece: SSE + `LISTEN`/`NOTIFY` + `RealtimeEvent` persistido + replay por `Last-Event-ID` + retenção de 7 dias. Esta task **não** troca o protocolo. Se um ambiente não sustentar SSE longo, isso vira **ajuste de infraestrutura** (T10 / T29), não redesenho do hub (decisão 11 de 10/09/2026).

---

## 1. Objetivo da prova

Demonstrar, em cada runtime previsto, que o caminho abaixo é viável **ou** registrar a limitação com evidência:

1. Mutação confirmada grava `RealtimeEvent` na mesma transação.
2. `NOTIFY` ocorre só depois do `COMMIT` (rollback não acorda ouvintes).
3. O cliente abre um stream SSE autenticado.
4. Desconexão e reconexão retomam a partir de `Last-Event-ID`.
5. Replay cobre a janela de retenção; cursor fora da janela provoca `resync`.
6. Duas instâncias da aplicação (quando existirem) vêem o mesmo fato via PostgreSQL, não via memória de processo.

A prova mínima **local** pode ser o spike em `spikes/realtime/` (Node + `pg`). Não exige a aplicação Next.js (T05). A prova em Vercel e Kubernetes usa o mesmo contrato, no runtime real, quando o acesso existir.

## 2. O que esta prova não é

- Não é a implementação do hub de produção (T21).
- Não é o CronJob de limpeza (T29).
- Não autoriza `create-next-app`, Docker Compose da aplicação, nem Prisma no spike.
- Não autoriza declarar homologação/produção “validadas” sem executar os passos da seção 6 no ambiente correspondente.

---

## 3. Recursos e acessos necessários

Segredos ficam no gerenciador do ambiente (`.env` local não versionado, variáveis da Vercel, Secrets do cluster). Aqui só nomes e o que o responsável precisa criar.

### 3.1 Local (Docker Compose no futuro; spike agora)

| Recurso | Quem providencia | Para quê |
| --- | --- | --- |
| Docker Engine | desenvolvedor | PostgreSQL 17 one-shot do spike (`postgres:17`) |
| Node.js 22+ (preferir 24 LTS, como T01) | desenvolvedor | executar `spikes/realtime` |
| Porta TCP livre (padrão do spike: `55432`) | desenvolvedor | mapear `5432` do container |
| Logto / OIDC | **não** nesta prova local | o spike não autentica HTTP |

Quando T05 existir, o Compose (`app` + `postgres`) substitui o Postgres one-shot. O contrato de `LISTEN` continua o mesmo.

### 3.2 Homologação (Vercel)

O responsável pelo projeto providencia. Sem estes itens a prova Vercel permanece **pendente**.

| Recurso | Observação |
| --- | --- |
| Projeto Vercel (plano conhecido: Hobby / Pro / Enterprise) | o plano define `maxDuration` máximo; ver seção 5 |
| Fluid Compute habilitado (padrão em projetos novos) | SSE longo em Function exige invocação que permanece aberta |
| Deploy da aplicação (T05/T10) com rota `/api/realtime/sse` | T04 não cria essa rota; a prova HTTP espera T21, ou um spike HTTP combinado depois |
| PostgreSQL do ambiente, com **URL de sessão direta** | ver seção 4; pool transacional **não** serve para `LISTEN` |
| Variáveis `DATABASE_URL` (queries) e `DATABASE_URL_LISTEN` (sessão dedicada) | nomes; valores só no painel Vercel |
| Aplicação OIDC Logto e sessão válida de um usuário autorizado | o stream de produção é autenticado |
| Região da Function próxima do banco | latência e limites de conexão |
| Acesso aos logs da Function (`FUNCTION_INVOCATION_TIMEOUT`, abort) | evidência de corte por duração |

Até T21 existir, o responsável **não** precisa fingir que o Route Handler passou. Pode-se, no máximo, repetir o spike Node **contra o mesmo PostgreSQL de homologação** (INSERT → NOTIFY → LISTEN) para validar o banco, e deixar o SSE HTTP como pendência T21 neste runtime.

### 3.3 Produção (Kubernetes)

O responsável pelo projeto providencia. Sem estes itens a prova K8s permanece **pendente**.

| Recurso | Observação |
| --- | --- |
| Cluster, namespace, registry, DNS/TLS | T29 |
| Deployment com **pelo menos duas réplicas** do processo Node | evidência de fan-out |
| PostgreSQL gerenciado | `LISTEN`/`NOTIFY` habilitados; sem pooler em modo transação na URL de listen |
| URL direta ou PgBouncer em **session mode** só para o hub | seção 4 |
| Ingress (nginx ou equivalente) com buffering desligado na rota SSE | seção 5 |
| Service HTTP estável para `/api/realtime/sse` | sticky session **não** é requisito de correção (ver [realtime.md](../realtime.md)) |
| Dois browsers/sessões autenticadas (CyberArk em prod; na prova de infra pode ser o spike) | duas “réplicas” de cliente |
| Permissão para aplicar um CronJob de cleanup (exercício; implementação T29) | não apagar `AuditEvent` |

---

## 4. Conexão PostgreSQL: direta vs pool

`LISTEN` é estado de **sessão**. A inscrição vive na conexão TCP até `UNLISTEN`, término da sessão ou morte do backend.

| Caminho | Serve para queries Prisma? | Serve para `LISTEN`? |
| --- | --- | --- |
| Pool Prisma / `pg.Pool` de curta duração | sim | **não** — a inscrição some quando o cliente volta ao pool |
| PgBouncer / pooler em **transaction** ou **statement** | em geral sim | **não** — a sessão real é trocada entre clientes |
| PgBouncer em **session** | sim, com menos multiplexação | aceitável, se a sessão não for recicada no meio do `LISTEN` |
| `pg.Client` dedicado, URL direta ao Postgres | possível, mas não é o pool da app | **sim** — este é o contrato |

Regras para todos os ambientes:

1. A aplicação terá **duas** formas de conectar: pool de queries (`DATABASE_URL`, Prisma + `@prisma/adapter-pg`) e **uma** conexão `pg.Client` por processo Node para `LISTEN` (`DATABASE_URL_LISTEN` ou `DIRECT_URL`).
2. Prisma **não** substitui `LISTEN`. Não usar `$queryRaw\`LISTEN realtime\`` no client transacional.
3. O payload de `NOTIFY` é só o id (texto decimal). O ouvinte busca a linha já commitada. Limite oficial do payload: 8000 bytes na configuração padrão ([NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)).
4. `NOTIFY` **depois** do `COMMIT` da mutação (código da aplicação). Se a transação abortar, o código **não** chama `NOTIFY`. Mesmo um `NOTIFY` feito *dentro* da transação só seria entregue no commit — o spike demonstra os dois fatos.

Nomes de variáveis (sem valores):

```text
DATABASE_URL              # pool / Prisma
DATABASE_URL_LISTEN       # sessão dedicada; direta ou session-mode
```

Se o provedor gerenciado só expuser uma URL pooled (comum em alguns produtos serverless), o responsável precisa da URL **unpooled** / “direct”. Sem ela, a prova de `LISTEN` neste ambiente falha por configuração, não por defeito do desenho.

---

## 5. Runtime, proxy, HTTP/2 e sessões

### 5.1 Local

| Tema | Configuração esperada |
| --- | --- |
| Processo | Node longo (`next start` / `next dev` no Compose, T05); spike = processo único |
| Proxy | nenhum, ou Traefik/nginx local se alguém colocar na frente — desligar buffer |
| Idle | heartbeat SSE (`: keepalive`) a cada 15 s para não parecer conexão morta |
| Sticky | irrelevante (um processo) |

### 5.2 Vercel (consulta 2026-09-10)

Fontes: [Configuring Maximum Duration](https://vercel.com/docs/functions/configuring-functions/duration), [Fluid compute](https://vercel.com/docs/fluid-compute), [Functions limitations](https://vercel.com/docs/functions/limitations).

| Tema | Fato documentado pelo fornecedor | Implicação para a prova |
| --- | --- | --- |
| Duração máxima da invocação | Hobby: 300 s teto. Pro/Enterprise: padrão 300 s, máximo 800 s (GA), 1800 s beta por Function | o SSE **não** fica aberto horas; a Function encerra com `FUNCTION_INVOCATION_TIMEOUT` (504) |
| Streamed responses | a duração inclui o tempo enviando a resposta | heartbeat não “renova” o teto de `maxDuration` |
| Fluid Compute | padrão em projetos novos; reusa instâncias; CPU ativa não conta espera de I/O; memória provisionada **é cobrada** enquanto a instância existe | SSE ocioso custa memória, não CPU; ainda assim a invocação morre no teto |
| HTTP/2 PING | Vercel envia PING em handlers longos ociosos sobre HTTP/2; HTTP/1.1 **não** tem equivalente | clientes e hops HTTP/1.1 ainda precisam de bytes periódicos no stream |
| Edge runtime | começar a responder em 25 s; stream até 300 s | **proibido** para este hub (`LISTEN` TCP + Node `pg`) |
| Corpo 4,5 MB | limite de body de Function | irrelevante para SSE de eventos pequenos |
| File descriptors | 1024 por instância, compartilhados | não abrir `LISTEN` por aba; um `LISTEN` por isolate |
| WebSocket | beta em Functions; outro protocolo | **não** migrar o MVP para WebSocket nesta task |

Configuração mínima da rota quando T21 existir:

```ts
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 800 se o plano Pro/Enterprise estiver confirmado
```

Headers da resposta SSE (todos os ambientes):

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-store, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` é o mecanismo documentado pelo nginx para desligar `proxy_buffering` por resposta ([ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)). Na Vercel não há nginx do cliente, mas o header é inofensivo e obrigatório no contrato da rota para quando o mesmo binário for para o cluster.

### 5.3 Kubernetes

| Tema | Configuração a pedir à infra (T29 aplica) |
| --- | --- |
| Ingress nginx | `nginx.ingress.kubernetes.io/proxy-buffering: "off"` |
| Timeouts | `proxy-read-timeout` e `proxy-send-timeout` ≥ `3600` (padrão do ingress-nginx é 60 s; insuficiente para SSE) |
| HTTP/2 | se o LB terminar HTTP/2, confirmar que idle não mata o stream; heartbeat de 15 s cobre HTTP/1.1 |
| Protocolo até o pod | TCP/HTTP; não forçar buffer de CDN |
| Sticky (`affinity`) | **opcional**. Correção do hub **não** depende de o cliente voltar ao mesmo pod: o estado está na tabela + `NOTIFY` |
| Reload do ingress | `worker-shutdown-timeout` padrão ~240 s pode derrubar streams longos em reload de config — o cliente reconecta com `Last-Event-ID` |
| PDB / drain | `terminationGracePeriodSeconds` maior que o intervalo de heartbeat; no `SIGTERM` o hub fecha o `pg.Client` e o stream |
| Réplicas | ≥ 2 na prova; cada pod com seu `LISTEN` no **mesmo** canal |

Não exigir sticky session como “solução” para múltiplas réplicas. Exigir publicação via tabela.

---

## 6. Passos de execução

### 6.1 Local (spike — pode ser executado sem credenciais corporativas)

Pré-requisitos: Docker e Node 22+.

```bash
cd spikes/realtime
docker run --rm -d --name t04-realtime-pg \
  -e POSTGRES_USER=spike \
  -e POSTGRES_PASSWORD=spike \
  -e POSTGRES_DB=realtime_spike \
  -p 55432:5432 \
  postgres:17

# aguardar o banco aceitar conexões (alguns segundos)
npm install
DATABASE_URL=postgres://spike:spike@127.0.0.1:55432/realtime_spike npm run prove

docker stop t04-realtime-pg
```

Evidências que o script deve imprimir (PASS/FAIL):

1. `LISTEN` em duas conexões (simula duas réplicas).
2. `INSERT` + `ROLLBACK` **sem** `NOTIFY` da aplicação → nenhum aviso.
3. `INSERT` + `NOTIFY` **dentro** da transação + `ROLLBACK` → nenhum aviso (semântica PostgreSQL).
4. `INSERT` + `COMMIT` + `NOTIFY` com o id → as duas conexões recebem.
5. Ouvinte busca a linha pelo id do payload.
6. Replay `WHERE id > :cursor ORDER BY id`.
7. Cursor anterior ao `MIN(id)` retido → condição de `resync`.

Se Docker ou Node faltarem, registrar na seção 8: comando, erro, o que faltou. **Não** marcar o ambiente local como aceito.

### 6.2 Vercel (pendente de acesso; não executar de mentira)

Quando o responsável entregar projeto + banco + (após T21) a rota:

1. Confirmar plano e `maxDuration` efetivo da Function da rota SSE (código > `vercel.json` > dashboard > default Fluid).
2. Confirmar `DATABASE_URL_LISTEN` **unpooled**. Teste SQL: abrir um cliente `LISTEN realtime` a partir de uma máquina com essa URL; `NOTIFY` de outra sessão deve chegar. Se não chegar, a URL está pooled ou `LISTEN` está bloqueado.
3. Com usuário autorizado: `GET /api/realtime/sse` (cookie de sessão). Esperar `Content-Type: text/event-stream` e um comentário `: keepalive` em ≤ 15 s.
4. Encerrar a aba; nos logs, o abort deve encerrar o stream (sem vazar `LISTEN` por isolate — o `LISTEN` do processo permanece).
5. Reabrir com o mesmo cookie. O browser envia `Last-Event-ID` ([HTML Standard, §9.2.4](https://html.spec.whatwg.org/multipage/server-sent-events.html)). Conferir replay dos ids `> cursor`.
6. Forçar cursor velho (header `Last-Event-ID` de um id já limpo ou `0` com tabela cujo `MIN(id)` é maior) → evento `event: resync`.
7. Deixar o stream ocioso até `maxDuration`. Anotar se a Function corta (esperado). O cliente deve reconectar e replayar. **Isso não é falha do protocolo; é o teto do runtime.**
8. **Não** marcar “SSE longo sustentado”. Marcar “SSE com reconexão periódica, teto = N segundos”.

Dois isolates / duas “réplicas” na Vercel: só é evidência se duas invocações distintas de SSE receberem o mesmo `NOTIFY`. Sem acesso ao painel, este item fica pendente.

### 6.3 Kubernetes (pendente de acesso)

1. Subir duas réplicas. Em cada pod, uma sessão `LISTEN realtime` (log do hub).
2. Publicar um `RealtimeEvent` + `NOTIFY` após commit.
3. Confirmar que **os dois** pods registram o aviso e que dois browsers, um eventualmente em cada pod, recebem o SSE.
4. Matar um pod: o cliente reconecta; `Last-Event-ID` evita buraco na janela de 7 dias.
5. Ingress: evento aparece em < 1 s, não só quando o buffer enche. Se atrasar dezenas de segundos, buffering ainda está ligado.
6. Cursor expirado → `resync` (pode-se inserir uma linha antiga, rodá-la para fora da janela com `created_at`, ou apontar o header para um id inexistente abaixo de `MIN(id)`).
7. Cleanup (ensaio): `DELETE` só em `RealtimeEvent` com `created_at < now() - interval '7 days'`. Contagem de `AuditEvent` inalterada.

---

## 7. Evidências esperadas (checklist)

Usar o mesmo checklist nos três ambientes. Status possíveis: `passou` | `falhou` | `não executado` | `pendente de acesso`.

| # | Evidência | Como observar |
| --- | --- | --- |
| E1 | Conexão | Stream abre; primeiro frame é comentário ou `retry:`; HTTP 200 + `text/event-stream` |
| E2 | Desconexão | Cliente aborta; servidor para de escrever; sem exceção não tratada |
| E3 | Reconexão + `Last-Event-ID` | Segundo GET traz header `Last-Event-ID`; eventos com `id > cursor` são reenviados |
| E4 | Replay ordenado | Ordem estrita por `RealtimeEvent.id` crescente; sem buraco entre replay e live (duplicata no fio é aceitável) |
| E5 | Cursor expirado → `resync` | `event: resync`; cliente **não** tenta adivinhar eventos; recarrega queries |
| E6 | Rollback não publica | Transação abortada não gera linha nem aviso |
| E7 | Duas réplicas | Dois `LISTEN` (processos/pods) recebem o mesmo `NOTIFY`; nenhum usa bus in-memory |
| E8 | Teto de runtime | Só Vercel: corte em `maxDuration` documentado; reconexão recupera via E3 |

---

## 8. Registro de evidência

Preenchido na execução de T04. Ambientes sem acesso **não** recebem `passou`.

| Ambiente | Status | Data | Quem | Notas |
| --- | --- | --- | --- | --- |
| Local (spike Node + `pg`) | **passou** | 2026-09-10 | execução T04 | `postgres:17` one-shot na porta `55432`. `npm run prove`: 11 PASS / 0 FAIL. Cobriu duas sessões `LISTEN`, rollback sem publish (app e `NOTIFY` intra-transação), `COMMIT` + `NOTIFY` só com o id, fetch da linha, replay `id > cursor`, cursor `< MIN(id)` → condição de `resync`. **Não** cobre HTTP SSE (sem app Next — T05/T21). |
| Vercel | **pendente de prova com acesso** | — | responsável | sem projeto/credenciais nesta task; análise de teto `maxDuration` em [realtime.md](../realtime.md) §11.1 |
| Kubernetes | **pendente de prova com acesso** | — | responsável | sem cluster nesta task; duas réplicas só simuladas como dois `pg.Client` no spike |

Não copiar senhas, connection strings com password, tokens nem dumps com PII para este arquivo. Colar só códigos de falha, tempos (`maxDuration`), e se `LISTEN` chegou ou não.

---

## 9. Diagnóstico rápido

| Sintoma | Causa mais provável | O que não fazer |
| --- | --- | --- |
| `NOTIFY` nunca chega | URL pooled; `LISTEN` no Prisma pool; canal errado | “corrigir” com polling na T04/T21 como protocolo oficial |
| Chega no publisher, não no outro pod | o outro processo não fez `LISTEN`; bus só em memória | sticky session como “conserto” |
| SSE só atualiza depois de muito tempo | proxy/CDN bufferizando; falta `X-Accel-Buffering: no` | aumentar payload do `NOTIFY` |
| 504 na Vercel após 5–13 min | `maxDuration` — comportamento do produto | trocar SSE por WebSocket nesta task |
| Reconexão perde eventos | `id:` SSE diferente do id persistido; replay só em memória | usar contador por conexão |
| `resync` em sessão normal | cleanup agressivo; relógio; cursor não numérico | inventar eventos de domínio para “completar o buraco” |
| `too many connections` | `LISTEN` por aba / por isolate demais | um `pg.Client` de listen **por processo** |

---

## 10. Fontes consultadas (2026-09-10)

| Fonte | Uso |
| --- | --- |
| [PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html) | entrega só após commit; payload < 8000 bytes; fan-out a todos os `LISTEN` |
| [HTML LS Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) (atualizado 8 set 2026) | `Last-Event-ID`, campo `id:`, `EventSource` |
| [Vercel max duration](https://vercel.com/docs/functions/configuring-functions/duration) | tetos 300 / 800 / 1800 s; HTTP/2 PING |
| [Vercel Fluid compute](https://vercel.com/docs/fluid-compute) | default, billing de memória, reuse de isolate |
| [Vercel Functions limitations](https://vercel.com/docs/functions/limitations) | stream conta no timeout; Edge 300 s; FDs 1024 |
| [nginx proxy_buffering / X-Accel-Buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) | desligar buffer por header ou directive |
| [ingress-nginx websockets / timeouts](https://github.com/kubernetes/ingress-nginx/blob/master/docs/user-guide/miscellaneous.md) | `proxy-read-timeout` padrão 60 s |
| [Next.js App Router Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) | `Response` + `ReadableStream`; runtime Node |

O desenho fechado a partir destas fontes está em [docs/realtime.md](../realtime.md).
