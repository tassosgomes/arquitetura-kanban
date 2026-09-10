# Spike T04 — LISTEN/NOTIFY + replay

Prova **isolada** da publicação realtime. Não é o hub da aplicação (T21). Não cria Next.js. Não usa Docker Compose do produto (T05).

Contrato: [docs/realtime.md](../../docs/realtime.md) · guia: [docs/guides/realtime-validation.md](../../docs/guides/realtime-validation.md)

## O que o script demonstra

1. Duas conexões `LISTEN` no canal `realtime` (duas “réplicas”).
2. `INSERT` + `ROLLBACK` **sem** `NOTIFY` da aplicação → ninguém é acordado.
3. `INSERT` + `NOTIFY` **dentro** da transação + `ROLLBACK` → o PostgreSQL também não entrega (semântica oficial).
4. `INSERT` + `COMMIT` + `NOTIFY` só com o **id** → as duas conexões recebem e buscam a linha.
5. Replay `WHERE id > :cursor ORDER BY id`.
6. Cursor anterior a `MIN(id)` → condição de `resync` (sem inventar eventos de domínio).

## Pré-requisitos

- Docker Engine (imagem `postgres:17`)
- Node.js 22+ (24 LTS alinhado a T01)

## Subir o Postgres (one-shot)

Não adicione este container ao Compose da aplicação.

```bash
docker run --rm -d --name t04-realtime-pg \
  -e POSTGRES_USER=spike \
  -e POSTGRES_PASSWORD=spike \
  -e POSTGRES_DB=realtime_spike \
  -p 55432:5432 \
  postgres:17
```

Aguardar o ready (exemplo):

```bash
until docker exec t04-realtime-pg pg_isready -U spike -d realtime_spike; do sleep 1; done
```

## Rodar a prova

```bash
cd spikes/realtime
npm install
DATABASE_URL=postgres://spike:spike@127.0.0.1:55432/realtime_spike npm run prove
```

Saída esperada: todas as linhas `PASS` e `RESULT: ALL PASSED`. Qualquer `FAIL` ou exceção = prova local falhou; registrar o erro no guia, sem credenciais.

Última execução nesta máquina de T04 (2026-09-10): `RESULT: ALL PASSED  (11 pass, 0 fail)` com Node v24.19.0 e `postgres:17`. Isso **não** aceita Vercel nem Kubernetes.

## Encerrar

```bash
docker stop t04-realtime-pg
```

## Se Docker ou Node não estiverem disponíveis

Não inventar sucesso. Anotar no registro de evidência de [realtime-validation.md](../../docs/guides/realtime-validation.md): comando tentado, mensagem de erro, o que faltou. Vercel e Kubernetes continuam pendentes de acesso mesmo se o spike local passar.
