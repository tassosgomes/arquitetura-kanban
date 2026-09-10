# ADR-019 — Datas e fuso America/Sao_Paulo (implementação técnica)

**Status:** Aceito
**Data:** 2026-09-10
**Task:** T01
**Consulta:** 2026-09-10 (Node 24 LTS; Temporal nativo no Node 26 Current; Safari ainda sem Temporal estável)

## Contexto

A decisão 2 de 10/09/2026 fixou: fuso **America/Sao_Paulo**; semana de segunda a domingo; dias inicial e final inclusivos; auditoria em instantes; datas de planejamento como **dias de calendário**. As regras de interseção, retrato histórico e preenchimento automático são **T02**. Este ADR só escolhe tipos e persistência para T05/T06 não misturarem “dia” com “instante UTC”.

`Date` do JavaScript não representa um dia civil. O fuso do processo Node (UTC no container) não é o fuso da aplicação. Em 10/09/2026, Temporal é estável na linguagem, nativo no Node 26, mas o runtime alvo é **Node 24 LTS**.

## Decisão

1. Constante única `APP_TIME_ZONE = "America/Sao_Paulo"` em `src/infrastructure/calendar`.
2. Tipos:
   - dia de planejamento / referência → `Temporal.PlainDate` ↔ PostgreSQL `DATE`;
   - auditoria, login, realtime → `Temporal.Instant` ↔ `TIMESTAMPTZ` (UTC);
   - limite de período (“início desta semana”) → `Temporal.ZonedDateTime` no fuso da aplicação.
3. Dependência: `@js-temporal/polyfill` 0.5.x no servidor e no cliente que fizer conta de calendário. Não usar `Date` para aritmética de período.
4. “Hoje” e atalhos (esta semana, este mês, …) resolvem-se no fuso da aplicação, não no fuso do browser nem do host.
5. Início da semana (segunda) é parâmetro técnico do helper; T02 confirma a regra de produto já aprovada.
6. Relógio injetável (`Clock` port) nos serviços, para testes de T02/T19.

Helpers de calendário **não** implementam retrato histórico nem preenchimento de datas de atividade — só conversão, limites de intervalo e serialização.

## Consequências

- T06: `DATE` vs `TIMESTAMPTZ` conforme a tabela acima. Não gravar previsão de término como `timestamptz` à meia-noite UTC.
- T19: testes de virada de dia e de DST brasileiro usam o polyfill + `APP_TIME_ZONE`.
- CSV (T27): dias `YYYY-MM-DD`; instantes ISO-8601 UTC.
- UI pode formatar com `Intl` em `pt-BR`, sempre a partir de `PlainDate` / `Instant` já convertidos.

## Alternativas consideradas

| Alternativa | Motivo de recusa |
| --- | --- |
| `date-fns` + `@date-fns/tz` | Sólido, mas `Date` continua ambíguo para “dia civil” |
| Luxon | Mais uma API; Temporal cobre Instant/PlainDate/ZonedDateTime |
| Temporal nativo sem polyfill | Node 24 e Safari não são Baseline |
| Fuso do servidor / `TZ=UTC` só | Quebraria “hoje” e semanas em America/Sao_Paulo |
