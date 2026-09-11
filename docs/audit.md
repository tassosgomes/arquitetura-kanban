# Auditoria transacional e concorrência

**Task:** T12  
**Versão:** 1.0  
**Data:** 2026-09-10  
**Status:** Contrato do mecanismo compartilhado (MVP)  
**Referências:** [domain-rules.md](domain-rules.md) (retrato, DE-04, DE-20); [architecture.md](architecture.md) §§4.2, 7 e 10; [data-model.md](data-model.md) (`AuditEvent`, `version`); [realtime.md](realtime.md)

Este documento é o contrato para T11, T13, T14, T15 e T23. Não reabre as regras de retrato da T02.

---

## 1. API pública

Implementação: `src/infrastructure/db/audited-transaction.ts`.  
Tipos e formato de `changes`: `src/application/audit`.

```ts
import { runAuditedMutation } from "@/infrastructure/db/audited-transaction"
import {
  AuditAction,
  AuditEntityKind,
  buildCreatedChanges,
  buildUpdatedChanges,
} from "@/application/audit"

await runAuditedMutation({
  prisma,
  actor,              // { id: localUserId } — vira actorUserId
  expectedVersion,   // omitir na criação
  versioned,          // { model: "project" | "activity" | "valueDelivery", id } — junto de expectedVersion
  load,
  mutate,
  audit,
  publishRealtime,    // opcional; T21 chama após COMMIT (depois do NOTIFY)
  notifyRealtime,     // opcional; default pg_notify('realtime', id)
  clock,              // opcional; default systemClock
})
```

`load` / `mutate` / `audit` correm na **mesma** `$transaction` Prisma (READ COMMITTED). Falha em qualquer passo faz rollback: sem mutação visível e sem `AuditEvent` órfão.

### 1.1 Versão (optimistic lock)

O helper, **antes** de `mutate`, executa:

```sql
UPDATE … SET version = version + 1
WHERE id = $id AND version = $expected
```

Zero linhas → `ConflictError`. Não use `find` + `update` sem o predicado de versão para avançar `version`. `mutate` **não** deve incrementar `version` (o helper já o fez). Depois do lock, a linha está `expectedVersion + 1`.

| Aggregate | `versioned.model` | Quem sobe `version` |
| --- | --- | --- |
| Project | `"project"` | T11 (edição/cancelamento) |
| Activity | `"activity"` | T13, T14, T15 (checklist) |
| ValueDelivery | `"valueDelivery"` | T23 |
| ActivityTask | — | T15 usa `versioned` da **Activity** |

Criação: omitir `expectedVersion` e `versioned`. A coluna começa em 1 (schema).

`load` retornando `null`/`undefined` **com** `versioned` → `NotFoundError` (recurso some ou id inválido), não `ConflictError`.

### 1.2 Auditoria na mesma transação

O helper só faz **INSERT** em `audit_events`. Preenche `actorUserId`, `occurredAt` (relógio injetável) e deixa `sequence` com o `BIGSERIAL`. `audit()` devolve um evento ou uma lista:

| Campo | Origem |
| --- | --- |
| `actorUserId` | `actor.id` |
| `occurredAt` | `clock.now()` (um instante por mutação) |
| `entityKind` / `entityId` / `action` | retorno de `audit` |
| `activityId` / `projectId` | quando couber (ActivityTask também preenche `activityId`) |
| `changes` | JSON (seção 2) |

Lista vazia → `InvariantError` (não existe “salvar sem histórico”). No-op de domínio (T14) **não** chama o helper.

Falha no insert de `AuditEvent` aborta a mutação.

### 1.3 Imutabilidade

Nenhum fluxo de aplicação faz `UPDATE` ou `DELETE` de `AuditEvent`. Não há Server Action de editar auditoria. Testes de integração podem apagar linhas só no cleanup.

Ordenação da timeline e do retrato (DE-20): `(occurredAt ASC, sequence ASC)`. Empate de instante: vence o **maior `sequence`**. Não ordenar pelo UUID `id`.

---

## 2. Formato de `changes` (jsonb)

T25 reconstrói o retrato com DE-04: último evento com `occurred_at < fechamento_exclusivo` que menciona o campo.

```ts
type AuditFieldChange = { before: AuditJsonValue; after: AuditJsonValue }

type AuditChanges = {
  snapshot?: Record<string, AuditJsonValue>  // só na criação
  fields: Record<string, AuditFieldChange>
}
```

### 2.1 Criação (`AuditAction.created`)

`buildCreatedChanges` / `buildActivityCreatedChanges`:

```json
{
  "snapshot": {
    "status": "BACKLOG",
    "responsavelId": "<uuid>",
    "participanteIds": [],
    "areaSolicitanteId": "<uuid>",
    "areaEnvolvidaIds": [],
    "dominioId": "<uuid>",
    "natureza": "STRATEGIC",
    "papelArquitetura": "RESPONSIBLE",
    "tipo": "AD_HOC",
    "projetoId": null,
    "esforco": null,
    "prioridade": "MEDIUM",
    "dataInicio": null,
    "dataConclusao": null,
    "dataCancelamento": null,
    "previsaoTermino": null
  },
  "fields": {
    "status": { "before": null, "after": "BACKLOG" }
  }
}
```

(`fields` contém as mesmas chaves que `snapshot`.)

### 2.2 Alteração

`buildUpdatedChanges` / `buildActivityUpdatedChanges`. Sem `snapshot`. Incluir **todas** as dimensões do retrato, inclusive as inalteradas (`before === after`):

```json
{
  "fields": {
    "status": { "before": "IN_PROGRESS", "after": "DONE" },
    "responsavelId": { "before": "<ana>", "after": "<ana>" },
    "dataConclusao": { "before": null, "after": "2026-09-18" }
  }
}
```

### 2.3 Chaves do retrato da atividade (T02 §10.2)

`ACTIVITY_PORTRAIT_FIELDS` em `src/application/audit/portrait.ts`:

`status`, `responsavelId`, `participanteIds`, `areaSolicitanteId`, `areaEnvolvidaIds`, `dominioId`, `natureza`, `papelArquitetura`, `tipo`, `projetoId`, `esforco`, `prioridade`, `dataInicio`, `dataConclusao`, `dataCancelamento`, `previsaoTermino`.

Datas civis: `YYYY-MM-DD` ou `null` (`toAuditDate`). Listas de ids: UUID ordenados (`toAuditIdList`). Instante de auditoria (`occurredAt`) **não** entra em `changes`; vive na coluna.

Projetos (T11) usam chaves próprias (`PROJECT_AUDIT_FIELDS`: nome, status, dono, área, natureza, papel, participantes, datas). Entrega de Valor (T23) usa as do próprio aggregate (`title`, `referenceDate`, `contentMarkdown`, `projectId`, `authorId`, …).

Reconstrução (T25):

```
relevantes := eventos com occurredAt < fechamento_exclusivo
              e (campo em snapshot ou em fields)
último := max por (occurredAt, sequence)
valor := último.snapshot[campo] ?? último.fields[campo].after
```

---

## 3. Realtime (T21 — persistir na transação, NOTIFY após COMMIT)

`RealtimeEvent` **não** é `AuditEvent` ([realtime.md](realtime.md) §2). T21 grava o sinal de invalidação na **mesma** transação, a partir dos writes de auditoria (`entityKind` + `action`):

1. Depois do INSERT de `AuditEvent`, o helper faz INSERT de `RealtimeEvent` (payload mínimo; sem copiar `changes`).
2. `runAuditedMutation` retorna ⇒ COMMIT já ocorreu.
3. Só então `pg_notify('realtime', id)` com o id decimal. **Não** NOTIFY de dentro da transação.
4. O parâmetro `notifyRealtime` substitui o `NOTIFY` nos testes. `publishRealtime`, se passado, corre depois do commit.

Rollback não deixa `RealtimeEvent` nem `AuditEvent` e não notifica. Duplicatas no cliente (mesmo `id` duas vezes) são toleradas.

Tipos emitidos: `activity.created` / `updated` / `status_changed` / `checklist_changed`, `project.changed`, `catalog.changed`, `value_delivery.changed`.

---

## 4. Como T11 e T13 chamam o helper

### 4.1 T11 — criar projeto

```ts
await runAuditedMutation({
  prisma,
  actor: { id: actor.id },
  load: async () => null,
  mutate: (tx) => tx.project.create({ data: { …, createdById: actor.id, updatedById: actor.id } }),
  audit: ({ result }) => ({
    entityKind: AuditEntityKind.Project,
    entityId: result.id,
    action: AuditAction.created,
    projectId: result.id,
    changes: buildCreatedChanges({ name: result.name, status: result.status, /* … */ }),
  }),
})
```

### 4.2 T11 — editar projeto

```ts
await runAuditedMutation({
  prisma,
  actor: { id: actor.id },
  expectedVersion: input.version,
  versioned: { model: "project", id: input.id },
  load: (tx) => tx.project.findUnique({ where: { id: input.id } }),
  mutate: async (tx, loaded) => {
    if (!loaded) throw new NotFoundError()
    return tx.project.update({
      where: { id: loaded.id },
      data: { name, nameNormalized, updatedById: actor.id }, // sem version
    })
  },
  audit: ({ loaded, result }) => ({
    entityKind: AuditEntityKind.Project,
    entityId: result.id,
    action: AuditAction.field_changed,
    projectId: result.id,
    changes: buildUpdatedChanges(toProjectAudit(loaded!), toProjectAudit(result), PROJECT_AUDIT_FIELDS),
  }),
})
```

Cancelar: `action: AuditAction.cancelled`, `data.status = CANCELLED`.

### 4.3 T13 — criar / editar atividade

Igual, com `versioned: { model: "activity", id }` nas edições. `entityKind: Activity`, `activityId: result.id`, `projectId` se `PROJECT`. `changes` via `buildActivityCreatedChanges` / `buildActivityUpdatedChanges` (todas as chaves do §2.3, inclusive participantes e áreas envolvidas). Correção de datas: mesmos campos; `occurredAt` é o instante da **correção**, não o dia civil corrigido.

### 4.4 T14 / T15 / T23

- **T14** status / conclusão / reabertura / cancelamento: `AuditAction.status_changed` ou `cancelled`; mesmo lock da Activity; no-op não gera evento.
- **T15** checklist: `versioned` da Activity; `mutate` altera `ActivityTask`; `entityKind: ActivityTask` com `activityId` preenchido.
- **T23** Entrega de Valor: `versioned: { model: "valueDelivery", id }`, `projectId` obrigatório.

Erros: `ConflictError` (409 na borda), `NotFoundError`, `InvariantError`. Falha de Prisma fora desses tipos vira `InfrastructureError` (architecture.md §7.2).

---

## 5. T09: wrap feito (Area / Domain)

Os commands `createArea`, `renameArea`, `deactivateArea`, `createDomain`, `renameDomain` e `deactivateDomain` passam por `runCatalogAudited` → `runAuditedMutation`. **Sem** `expectedVersion` / `versioned` (cadastros não têm `version`).

A unicidade ativa (`assertUniqueActiveName` + UNIQUE parcial) corre **dentro** da mesma transação (`load` no `tx`). `P2002` continua mapeado para `ValidationError`.

| Fluxo | `entityKind` | `action` | `changes` |
| --- | --- | --- | --- |
| criar | `Area` / `Domain` | `created` | `snapshot` + `fields` de `name` e `isActive` |
| renomear | `Area` / `Domain` | `field_changed` | `name` (e `isActive` inalterado) |
| inativar | `Area` / `Domain` | `deactivated` | `isActive` `true` → `false` |
| inativar já inativo | — | — | no-op; sem evento |

Inativar usuário (`User.isActive`) continua fora deste wrap (T07/T09 listagem).

Helpers: `CATALOG_AUDIT_FIELDS`, `catalogAuditSnapshot`.

---

## 6. Aceite desta task

- Edição com versão antiga → `ConflictError`, dados intactos.
- Duas edições simultâneas no mesmo `Project`: uma commita, a outra `ConflictError`; só os `AuditEvent` da vencedora.
- Falha simulada no insert de `AuditEvent` reverte a mutação (0 eventos, `version` inalterada).
- Eventos imutáveis no fluxo da app. T21: `RealtimeEvent` na mesma transação; `NOTIFY` só após commit.
