# Backup e restore (produção)

**Task:** T29  
**Versão:** 1.0  
**Status:** Procedimento. **Nenhum exercício de restore foi feito nesta task.** Backup e restore são responsabilidade da **infraestrutura**; a aplicação não executa dump nem PITR.  
**Produção:** [production.md](production.md)  
**Realtime / retenção:** [realtime.md](../realtime.md) §10  
**Auditoria:** [audit.md](../audit.md)

Este guia define o que a infra precisa garantir, o que **nunca** se apaga, e como conduzir um restore de prova. Não contém credenciais nem nomes internos de appliance da empresa.

---

## 1. Responsabilidade

| Quem | O quê |
| --- | --- |
| Infraestrutura (DBA / plataforma do PostgreSQL gerenciado) | política de backup, retenção, criptografia em repouso, PITR/snapshot, restore, teste periódico, acesso ao console do fornecedor |
| Aplicação (este repositório) | schema via Prisma Migrate; **não** inclui sidecar de backup, `pg_dump` no CronJob, nem backup de `RealtimeEvent` como requisito |
| Responsável pelo projeto | coordenar a janela, confirmar RPO/RTO **com a infra** (não inventar SLA neste repo), autorizar restore em produção |

O volume do Kanban no MVP (cinco usuários) não justifica um agente de backup dentro do pod. O artefato a proteger é o **PostgreSQL gerenciado**.

Imagens Docker no registry **não** substituem backup de dados. Rollback de Deployment restaura código, não o banco ([production.md §12](production.md#12-rollout-e-rollback)).

---

## 2. O que precisa existir (a infra confirma)

Pedir por escrito (issue interna / ticket), sem copiar connection strings:

1. Backup **automático** da instância de produção (snapshot diário no mínimo; PITR preferível).
2. Retenção alinhada à política da empresa (o MVP não fixa dias — a infra informa o número).
3. Restore para **outro** nome/instância (clone) sem destruir a primária.
4. Criptografia em repouso e controle de quem pode disparar restore.
5. Janela e contato de plantão para o primeiro go-live e para o exercício da [§5](#5-exercício-de-restore).

Se o fornecedor **não** tiver PITR, registre a limitação (RPO = “desde o último snapshot”) e **não** marque restore pontual a um instante arbitrário como validado.

A aplicação assume:

- `audit_events` e entidades de domínio sobrevivem a deploys e ao CronJob de realtime.
- `realtime_event` pode ser perdido: retenção de 7 dias; clientes fazem `resync`.

---

## 3. O que não apagar

| Objeto | Backup / restore | Cleanup T29 |
| --- | --- | --- |
| `audit_events` | **obrigatório** no backup | **nunca** apagar |
| `users`, `areas`, `architecture_domains`, `projects`, `activities`, checklists, `value_deliveries` e tabelas de junção | obrigatório | não são alvo do CronJob |
| `realtime_event` | opcional (efêmero; 7 dias) | `DELETE` só com `createdAt` &lt; 7 dias |
| Secrets Kubernetes / `AUTH_SECRET` / client CyberArk | cofre da empresa, **não** o Postgres | n/a |
| Logs de pod | política de logs da plataforma | n/a |

Não usar `TRUNCATE` / `migrate reset` / `DROP DATABASE` em produção como “limpeza”. O CronJob só executa `deploy/sql/cleanup-realtime-events.sql`.

Uma restauração **não** deve ser seguida de um `DELETE` manual em `audit_events` “para diminuir o dump”. Retrato histórico e timeline dependem desses eventos (T02 / T12 / T25).

Seeds (`prisma db seed`) **não** recriam auditoria, usuários nem atividades. Depois de um restore, **não** rode seed achando que reconstói o histórico — o seed só faz upsert dos seis domínios.

---

## 4. Restore em incidente (produção)

Ordem combinada com a infra. A aplicação fica em manutenção até o banco consistir com uma imagem conhecida.

1. **Congelar writes:** scale o Deployment para 0 **ou** coloque o Ingress em página de manutenção (a infra escolhe). Objetivo: ninguém grava em cima do restore.
2. Suspenda ou não dispare o CronJob de cleanup durante a conferência (`kubectl -n arquitetura-kanban suspend` no CronJob, ou espere o restore acabar — o cleanup **não** remove auditoria, mas altera `realtime_event`).
3. A infra restaura o PostgreSQL (PITR para o instante combinado **ou** último snapshot bom).
4. Confirme que `DATABASE_URL` / `DATABASE_URL_LISTEN` ainda apontam para a instância restaurada (ou atualize o Secret se o host mudou).
5. **Não** rode `migrate deploy` “para adiantar” até saber **qual** revision o backup contém. Se o backup é de **antes** da última migration, ou você restaura também o código daquele tag, ou aplica as migrations **faltantes** com o Job, na ordem, depois de a infra declarar o banco acessível.
6. Scale de volta para **2** réplicas. Probes `/api/health/ready` devem voltar a 200.
7. Conferência mínima (sem PII na issue):

   | Checagem | Esperado |
   | --- | --- |
   | `SELECT count(*) FROM audit_events` | &gt; 0 se já havia operação real; **não** zerado por “limpeza” |
   | `SELECT count(*) FROM users` | cinco integrantes (ou o n da allowlist) se já tinham logado |
   | Login CyberArk | um usuário da Permissions entra |
   | Uma mutação + SSE | após restore, `LISTEN` na URL unpooled ainda funciona |

8. Só então reative o CronJob.

Rollback de **código** no meio do restore: ver [production.md §12](production.md#12-rollout-e-rollback). Restore de banco **não** é `kubectl rollout undo`.

---

## 5. Exercício de restore (obrigatório para o aceite, ainda pendente)

Fazer **antes** de tratar a aplicação como fonte principal (T30). Preferir clone / instância de exercício, **não** o primeiro teste em cima da primária.

### 5.1 Preparação

1. Infra confirma que existe pelo menos um backup completo posterior ao último `migrate deploy` de produção (ou, no primeiro go-live, um snapshot vazio + seed + um login de prova).
2. Combinar: instante alvo, nome da instância clone, quem aplica, quem confere a app.
3. Anotar o tag da imagem e a revision Prisma (`prisma migrate status`) do ambiente **de origem**.

### 5.2 Execução (infra + responsável)

1. Restaurar para o clone.
2. (Opcional) apontar um Deployment de exercício no cluster (outro namespace / outro `APP_URL`) **ou** conferir só via `psql` se a empresa não quiser um segundo Ingress. O importante é **ler o banco restaurado**.
3. Contagens: `audit_events`, `users`, `activities`, `projects`. Guardar os números **na issue**, não os dumps.
4. Confirmar que `realtime_event` pode estar menor (cleanup / janela de 7 dias) — isso **não** é falha de backup.
5. Confirmar que **não** faltam linhas de `audit_events` em relação à origem no instante escolhido (amostra: uma atividade cuja timeline ainda faça sentido).
6. Destruir o clone segundo a política da infra. **Não** deixar o clone com Secret de produção copiado para um namespace aberto.

### 5.3 Evidência

Na issue T29: data, “clone restore passou/falhou”, contagens agregadas, nome de quem da infra executou. **Não** anexar SQL dump, `.pgdump`, nem CSV com nomes de pessoas.

Enquanto este exercício não ocorrer, o item “responsável por backup e procedimento de restore confirmados com infraestrutura” permanece **pendente**.

---

## 6. Diagnóstico

| Sintoma | O que verificar |
| --- | --- |
| Restore “ok” mas login falha | `AUTH_SECRET` do cluster **atual** não estava no backup (não fica no Postgres). Secret Kubernetes / cofre é outro artefato |
| Issuer CyberArk mudou | `users.oidcIssuer` do backup antigo pode não bater — não fundir usuários na mão |
| Timeline vazia, cards existem | restore parcial ou alguém apagou `audit_events`; **incidente** — não “reprocessar” inventando eventos |
| SSE mudo após restore | `LISTEN` na URL nova; pooler; pods ainda no host antigo |
| CronJob rodou no clone e “sumiram eventos” | só `realtime_event` velho; auditoria intacta se o SQL oficial foi usado |

---

## 7. Status nesta task (T29)

| Item | Estado |
| --- | --- |
| Responsabilidade e o que não apagar | documentados |
| Política de backup ligada no fornecedor | **pendente** da infra |
| Exercício de restore | **não executado** |
| RPO/RTO numéricos | **não declarados** neste repo (a infra informa) |

Não tratar este arquivo como aceite de recuperação comprovada.
