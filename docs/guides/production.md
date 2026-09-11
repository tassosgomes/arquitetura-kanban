# Produção (Kubernetes)

**Task:** T29  
**Versão:** 1.0  
**Status:** Procedimento para o responsável. **Nenhum cluster, login CyberArk, SSE entre réplicas, CronJob nem restore foi executado nesta task.** Infraestrutura e IdP de produção são **dependências externas**, não validações concluídas.  
**OIDC:** [oidc.md](oidc.md) §4 (CyberArk)  
**Homologação:** [homologation.md](homologation.md) — **não** promover o projeto Vercel a produção  
**Realtime:** [realtime.md](../realtime.md) — produção é o ambiente **alvo** de SSE longo  
**Backup:** [backup-restore.md](backup-restore.md)  
**Arquitetura:** [architecture.md](../architecture.md)

Este guia descreve o que criar **fora do repositório** e como aplicar os manifests em `deploy/k8s/`. Não contém credenciais. Use os placeholders `CHANGEME` e `<…>`.

A aplicação **não** ramifica em `if (cyberark)`. Produção é o mesmo binário de homologação, com `OIDC_*` apontando para o CyberArk.

---

## 0. Como usar este guia

1. O responsável providencia o que está na [§1](#1-pré-requisitos-externos-o-responsável-providencia). **Antes** disso, ninguém marca T29 como validada.
2. Preencha o Secret a partir de `deploy/k8s/secret.yaml.example` **fora do git** ([§5](#5-secrets)).
3. Substitua `CHANGEME_REGISTRY`, `CHANGEME_TAG` e `CHANGEME_DNS` nos manifests.
4. Aplique migrations com o **Job** ([§9](#9-migrations--não-no-modelo-vercel)) **antes** de atualizar o Deployment.
5. Só então execute o [roteiro de validação](#14-roteiro-de-validação). Enquanto o cluster não existir, **não** marque login, SSE, cleanup nem backup como validados.

Nunca cole secrets em issue, PR, este arquivo ou logs.

---

## 1. Pré-requisitos externos (o responsável providencia)

Nada disto é assumido como já existente:

| Recurso | Para quê |
| --- | --- |
| Cluster Kubernetes (1.27+ se quiser `timeZone` no CronJob) | runtime de produção; ≥ 2 nós preferível para anti-affinity |
| Namespace dedicado (manifesto: `arquitetura-kanban`) | isolamento; RBAC de quem aplica |
| Registry de imagens (GHCR, Harbor, ACR, …) + permissão de push/pull | artefato do [workflow Image](../../.github/workflows/image.yml) |
| DNS público e certificado TLS (cert-manager ou certificado da empresa) | `APP_URL` HTTPS |
| Ingress controller **ingress-nginx** (ou equivalente com os mesmos timeouts/buffer) | HTTP + SSE |
| PostgreSQL **17** gerenciado, **separado** do Compose e da Vercel | dados de produção; PITR/snapshot — [backup-restore.md](backup-restore.md) |
| URL **direta** (ou PgBouncer em **session mode**) para `LISTEN` | hub SSE; pooler em transaction mode **não** serve |
| Aplicação OIDC CyberArk (web app customizada, Authorization Code + secret) | SSO de produção — [oidc.md §4](oidc.md#4-cyberark--produção) |
| Rede dos pods até o well-known do CyberArk e até o Postgres | discovery OIDC e `LISTEN` |
| Permissão na infra para backup/restore e um exercício de restore | aceite de T29 com infraestrutura |
| Variáveis GitHub `IMAGE_REGISTRY` / `IMAGE_REPOSITORY` e secrets `IMAGE_REGISTRY_USERNAME` / `IMAGE_REGISTRY_PASSWORD` | push da imagem (opcional até o registry existir) |

Ainda **não** é necessário para *preparar* o repo (já está neste checkout): Dockerfile de produção, manifests, SQL de cleanup, probes.

Homologação Vercel **não** substitui este ambiente.

---

## 2. Cluster, namespace e registry

1. Confirme o contexto: `kubectl config current-context` aponta para o cluster de **produção**, não um laboratório compartilhado com dados de teste misturados.
2. Aplique o namespace:

   ```bash
   kubectl apply -f deploy/k8s/namespace.yaml
   ```

3. Crie `imagePullSecret` no namespace se o registry for privado. Referencie-o no Deployment (não versionar a senha do registry).
4. Imagem de produção:

   ```bash
   docker build --target production -t <registry>/arquitetura-kanban:<git-sha> .
   docker push <registry>/arquitetura-kanban:<git-sha>
   ```

   O stage `development` é só o Compose local (`npm run dev`). Pods de produção usam `USER node` (uid 1000), `node server.js` e o `HEALTHCHECK` em `/api/health/live`.

5. Substitua a imagem nos manifests (`kustomization.yaml` → `images`, e o mesmo tag no CronJob / Job de migrate).

O workflow [`.github/workflows/image.yml`](../../.github/workflows/image.yml) **compila** a imagem em `main` e tags `v*`. **Push** só ocorre se `IMAGE_REGISTRY` e as credenciais existirem. Build da imagem no Actions **não** é deploy no cluster.

---

## 3. DNS e TLS

1. Escolha o host estável: `https://<dns-producao>` **sem** barra final. Esse valor é `APP_URL` e o `host` do Ingress.
2. Crie o registro DNS (A/CNAME) para o Load Balancer / IP do ingress.
3. TLS: Secret `arquitetura-kanban-tls` (já referenciado no Ingress) **ou** anote `cert-manager.io/cluster-issuer` quando o issuer da empresa existir. Não commitar o `.pem`.
4. Cadastre o **mesmo** host no CyberArk ([oidc.md §4.3](oidc.md#43-trust-urls-e-secret)):

   | Campo | Valor |
   | --- | --- |
   | Redirect URI | `https://<dns-producao>/api/auth/callback/corporate` |
   | Post-logout | `https://<dns-producao>/` |

   Match **exato**. Sem curinga. `http` ≠ `https`.

---

## 4. Ingress e SSE

Produção precisa de SSE **longo** (jornada de trabalho), ao contrário da Vercel (`maxDuration` 300 s). O Route Handler continua `GET /api/realtime/sse`; o teto da Function **não** se aplica no cluster.

Contrato do Ingress (já no manifesto `deploy/k8s/ingress.yaml`, pensado para **ingress-nginx**):

| Anotação | Valor | Motivo |
| --- | --- | --- |
| `proxy-buffering` | `off` | nginx default **on** segura o SSE até o buffer encher |
| `proxy-request-buffering` | `off` | alinhado ao stream |
| `proxy-read-timeout` | `3600` | default 60 s mata SSE ocioso; heartbeat da app é 15 s |
| `proxy-send-timeout` | `3600` | idem |
| `proxy-http-version` | `1.1` | hop até o pod |

A rota já envia `X-Accel-Buffering: no` e `Cache-Control: no-transform` ([realtime.md](../realtime.md) §11.3).

Regras:

- **Não** use sticky session como “conserto” de realtime. Cada pod faz `LISTEN` no mesmo PostgreSQL.
- Service: `sessionAffinity: None` (já no manifesto).
- CDN / WAF na frente: **bypass de buffer** (e, se possível, de timeout curto) para `/api/realtime/sse`. Sem isso o Ingress correto não basta.
- Probes apontam para `/api/health/live` e `/api/health/ready`, **nunca** para o SSE. Stream aberto **não** é critério de unhealth.
- `terminationGracePeriodSeconds: 45` (Deployment) + `preStop` de 5 s: o cliente reconecta; replay por `Last-Event-ID` cobre o buraco.
- Réplicas: **≥ 2** (manifesto já tem `replicas: 2`). PDB `minAvailable: 1`.

Se o controller **não** for ingress-nginx, o responsável traduz o contrato (buffer off, timeouts ≥ 3600 s) para as anotações daquele controller. Não invente nomes de CRD da empresa neste repo.

---

## 5. Secrets

Copie `deploy/k8s/secret.yaml.example` para `secret.yaml` (gitignored) **ou** use Sealed Secrets / External Secrets / cofre da empresa. `kubectl apply -k deploy/k8s` **não** aplica o Secret — de propósito.

| Variável | Obrigatória | Notas |
| --- | --- | --- |
| `APP_URL` | sim | `https://<dns-producao>` sem barra final |
| `DATABASE_URL` | sim | pool / Prisma (queries, mutações, `NOTIFY` curto) |
| `DATABASE_URL_LISTEN` | sim | sessão **direta** ou PgBouncer **session**. Se omitida, o hub cai em `DATABASE_URL` (errado atrás de pooler transacional) |
| `OIDC_ISSUER` | sim | Issuer URL do Trust CyberArk, igual ao JSON `"issuer"` |
| `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | sim | client da app de **produção**; ≠ Logto |
| `OIDC_SCOPES` | sim | `openid profile email` |
| `AUTH_SECRET` | sim | `openssl rand -base64 32` (mín. 32). ≠ local ≠ Vercel |
| `OIDC_*_ENDPOINT` | só se discovery falhar | [oidc.md §4.6](oidc.md#46-variáveis-no-cluster) |

ConfigMap (`deploy/k8s/configmap.yaml`): `APP_TIME_ZONE=America/Sao_Paulo`, `NODE_ENV`, `PORT`, `HOSTNAME`, `AUTH_TRUST_HOST`. Sem secrets.

Não criar `AUTH_LOGTO_*`, `if (provider === "cyberark")`, nem copiar o `.env` local / Vercel para o cluster.

Rotação: atualize o Secret, `kubectl rollout restart deployment/arquitetura-kanban`. Trocar `AUTH_SECRET` derruba cookies Auth.js (esperado).

---

## 6. PostgreSQL gerenciado

1. Instância **só** de produção. Credenciais ≠ Compose ≠ Neon/Vercel de homologação.
2. PostgreSQL 17; `LISTEN` / `NOTIFY` habilitados.
3. Duas URLs, se o fornecedor separar pooler:

   | Variável | Modo |
   | --- | --- |
   | `DATABASE_URL` | pooled / Prisma |
   | `DATABASE_URL_LISTEN` | unpooled / sessão |

4. Allowlist de rede: CIDR dos nós / NAT do cluster. Sem `0.0.0.0/0` se a política da empresa proibir — peça o caminho correto à infra.
5. Extensões extras **não** são requisito do MVP.
6. Backup contínuo / PITR: responsabilidade da **infraestrutura** ([backup-restore.md](backup-restore.md)). A aplicação não faz dump.

Teste rápido de `LISTEN` (numa workstation com a URL **unpooled**, sem colar a URL na issue): uma sessão `LISTEN realtime;` outra `NOTIFY realtime, '1';` — o aviso deve chegar. Se não chegar, a URL está pooled ou o parâmetro está bloqueado.

---

## 7. CyberArk

Siga **somente** [oidc.md §4](oidc.md#4-cyberark--produção) e a planilha da §5 daquele guia. Resumo operacional para o cluster:

1. Web app OpenID Connect customizada, Authorization Code, client com secret.
2. Redirect `https://<dns-producao>/api/auth/callback/corporate`.
3. Permissions = allowlist dos cinco integrantes (e gestor, se couber). Quem não estiver aí **não** entra; a app não provisiona.
4. Cole issuer / client id / secret no Secret do Kubernetes. **Zero** SDK CyberArk; **zero** `if (cyberark)` no código.

Validação de login real: [§14](#14-roteiro-de-validação). **Pendente** até existir portal + DNS + pods.

Usuário local de produção é **outro** `User` (`oidcIssuer` CyberArk ≠ Logto). Não há fusão por e-mail.

---

## 8. Pipeline

```text
feature/*  →  PR  →  GitHub Actions CI (verify → build)
                         │
                         ▼  squash merge em main
              workflow Image: docker build --target production
                         │
                         ▼  (quando IMAGE_REGISTRY existir)
              docker push <registry>/arquitetura-kanban:<sha>
                         │
                         ▼  operador / CD da empresa
              1. Job `prisma migrate deploy`  (imagem NOVA, Job em deploy/k8s)
              2. Só se o Job Succeeded: rollout do Deployment + CronJob (mesmo tag)
                         │
                         ▼
              https://<dns-producao>
```

O CI de PR **não** migra o banco de produção e **não** publica no cluster. O job `verify` só migra o Postgres **efêmero** do runner ([homologation.md §5](homologation.md#5-github-actions)).

CD nativo da empresa (Argo CD, Flux, pipeline interna) pode substituir o `kubectl apply` manual, desde que preserve a ordem **migrate Job → Deployment** e **não** aplique `secret.yaml.example` com `CHANGEME`.

---

## 9. Migrations — não no modelo Vercel

**Escolha:** em produção, `npx --no-install prisma migrate deploy` corre num **Job Kubernetes** com a imagem nova, **antes** do rollout. Nunca `prisma db push`. Nunca `prisma migrate dev`. Nunca `prisma migrate reset`. Nunca `npm run vercel-build` no cluster.

O Deployment **não** roda migrate no `CMD`. Os pods só executam `node server.js`. O Compose local continua migrate-on-start via `docker-entrypoint.sh` — isso **não** se replica em produção.

### Por que não no mesmo modelo da Vercel

Homologação aplica `migrate deploy` **no build** (`npm run vercel-build`). Isso foi aceitável lá porque: dados não são os de produção; não havia token/registry; um único comando amarra schema e bundle. O risco documentado em [homologation.md §7](homologation.md#7-estratégia-de-migration) permanece: **se o migrate passar e o `next build` falhar, o schema avança e o Instant Rollback não desfaz SQL**.

Em produção esse risco é inaceitável:

| Vercel (homologação) | Kubernetes (produção) |
| --- | --- |
| migrate no **build** da plataforma | Job **separado**, com `backoffLimit: 1` |
| Falha de build depois do migrate → schema à frente do código ainda no ar | Job falhou → **não** se atualiza o Deployment; pods antigos seguem no schema antigo |
| Rollback de deployment não reverte SQL | Rollback de Deployment também **não** reverte SQL — por isso o Job é o gate, e migrations devem ser **só para frente** e preferencialmente **aditivas** |
| Seed no build a cada deploy | Seed **não** entra no Job padrão; os seis domínios: uma vez no primeiro go-live (`npx prisma db seed` num Job extra, idempotente) |

Modelo do Job: `deploy/k8s/migrate-job.yaml.example`. Copie para `migrate-job.yaml` (gitignored), coloque o **mesmo** tag da imagem que será publicada, apague o Job anterior se o nome colidir, aplique, espere `Complete`.

```bash
kubectl -n arquitetura-kanban wait --for=condition=complete job/arquitetura-kanban-migrate --timeout=180s
```

Se o Job falhar, **pare**. Corrija a migration no git, CI verde, nova imagem, novo Job. Não “consertar” com `db push` na base de produção.

Migration **destrutiva** (DROP COLUMN, rewrite): exige backup recente confirmado pela infra ([backup-restore.md](backup-restore.md)) e janela combinada. O Instant/rollout rollback de pods **não** é plano de undo de SQL.

---

## 10. CronJob de cleanup (7 dias)

| Item | Valor |
| --- | --- |
| Manifesto | `deploy/k8s/cronjob-cleanup.yaml` |
| Agenda | `0 3 * * *` com `timeZone: America/Sao_Paulo` |
| Comando | `node scripts/cleanup-realtime-events.mjs` |
| SQL | `deploy/sql/cleanup-realtime-events.sql` (embutido na imagem) |
| Alvo | **somente** `"realtime_event"` com `"createdAt" < now() - 7 days` |
| Fora de escopo | `audit_events` e qualquer tabela de domínio |

O script é **idempotente** (segunda execução apaga zero linhas na mesma janela) e **recusa** SQL que faça `DELETE` em `audit_events`.

Manual (emergência, workstation com a URL de produção — **não** no laptop de desenvolvimento apontando para prod por engano):

```bash
DATABASE_URL=postgresql://… npm run db:cleanup-realtime
```

Não rode o cleanup contra um restore que ainda está em conferência se a infra precisar inspecionar `realtime_event` antigo — a auditoria **não** é afetada de qualquer forma.

Clientes SSE com cursor mais velho que 7 dias recebem `event: resync` ([realtime.md](../realtime.md) §8), não um buraco silencioso.

---

## 11. Observabilidade e diagnóstico

Mínimo do MVP (cinco usuários):

- `kubectl -n arquitetura-kanban logs` nos pods da app (stdout/stderr do Next.js).
- `kubectl describe pod` / Events: probes, image pull, OOM.
- Logs do Job de migrate e do CronJob de cleanup (`deleted N realtime_event row(s)`).
- Logs do ingress-nginx: 499/504 em `/api/realtime/sse` → timeout/buffer ainda errados.

**Não** habilitar debug que imprima ID Token, `AUTH_SECRET`, `DATABASE_URL`, cookies ou authorization codes.

| Sintoma | Verificação |
| --- | --- |
| Probe `live` falha, `ready` ok | processo caiu; não use SSE como probe |
| `ready` 503, `live` 200 | Postgres / `DATABASE_URL` (rede, senha, allowlist) |
| `Invalid environment variables` | Secret incompleto; `APP_URL` com barra final; `AUTH_SECRET` &lt; 32 |
| `redirect_uri mismatch` | CyberArk ≠ `{APP_URL}/api/auth/callback/corporate` |
| Login IdP ok, 403 na app | Permissions CyberArk; `User.isActive`; issuer divergente do well-known |
| SSE só atualiza depois de dezenas de segundos | buffering ainda ligado (Ingress, CDN, WAF) |
| SSE cai ~60 s | `proxy-read-timeout` ainda no default |
| Uma aba atualiza, a outra não | o segundo pod não fez `LISTEN`; `DATABASE_URL_LISTEN` pooled |
| `too many connections` | `LISTEN` por aba em vez de um client por processo — defeito; não subir réplicas à toa |

Não há APM obrigatório neste MVP. Se a empresa já tiver coletor de logs, apontar o stdout dos pods para ele **sem** alterar o formato para incluir headers `Authorization`.

---

## 12. Rollout e rollback

### 12.1 Rollout (código)

1. CI verde em `main`.
2. Imagem `<sha>` no registry.
3. Job de migrate com **essa** imagem → `Complete`.
4. Atualize a imagem do Deployment (e do CronJob) para o mesmo `<sha>`.
5. `kubectl -n arquitetura-kanban rollout status deployment/arquitetura-kanban`.
6. `maxUnavailable: 0` mantém pelo menos um pod durante o rolling update.

### 12.2 Rollback de **código**

```bash
kubectl -n arquitetura-kanban rollout undo deployment/arquitetura-kanban
```

Isso restaura o ReplicaSet anterior. **Não** desfaz `migrate deploy`. Só é seguro se a migration da versão nova for **aditiva** (código antigo ainda lê o schema novo).

Se o código antigo **quebra** no schema novo: **não** dê undo cego. Priorize hotfix de código compatível com o schema atual, ou restore de banco **coordenado** com a infra ([backup-restore.md](backup-restore.md) §4).

### 12.3 Rollback de **schema**

Não existe `migrate down` neste MVP. Plano: backup anterior + restore, ou migration compensatória só para frente. Os dois exigem a infra e uma janela.

### 12.4 Segredo vazou

Rotacionar no CyberArk (novo secret do client), no Postgres e `AUTH_SECRET`; aplicar Secret; rollout. Não commitar o valor.

---

## 13. Artefatos neste repositório

| Caminho | Função |
| --- | --- |
| `Dockerfile` (`--target production`) | imagem non-root, healthcheck, `node server.js` |
| `deploy/k8s/*.yaml` | Namespace, ConfigMap, Deployment (≥2), Service, Ingress SSE, PDB, CronJob |
| `deploy/k8s/secret.yaml.example` | template de Secret |
| `deploy/k8s/migrate-job.yaml.example` | Job de `prisma migrate deploy` |
| `deploy/sql/cleanup-realtime-events.sql` | SQL idempotente |
| `scripts/cleanup-realtime-events.mjs` | runner do CronJob / `npm run db:cleanup-realtime` |
| `.github/workflows/image.yml` | build (e push condicional) da imagem |

`kubectl apply -k deploy/k8s` **não** inclui Secret nem Job de migrate.

---

## 14. Roteiro de validação

**Nenhum item abaixo está concluído neste repositório.** Marque na issue só depois de executar de verdade. Evidência: data, ambiente, passou/falhou. **Não** cole tokens, cookies nem connection strings.

### 14.1 Sem a app no ar (infra)

1. Namespace existe; registry pull funciona a partir do cluster.
2. Postgres de produção alcançável a partir de uma máquina confiável; `LISTEN` comprovado na URL unpooled.
3. Well-known CyberArk abre a partir de uma rede que os **pods** também alcançam; `OIDC_ISSUER` = `"issuer"`.
4. Redirect URI = `{APP_URL}/api/auth/callback/corporate`.
5. Backup automático do fornecedor está **ligado** (a infra confirma; ver [backup-restore.md](backup-restore.md)).

### 14.2 Depois do primeiro deploy (responsável + implementador)

6. Job de migrate `Complete`; pods `Ready` (2/2); `/api/health/live` 200; `/api/health/ready` 200.
7. Usuário **na** Permissions CyberArk completa SSO e vê o shell autenticado.
8. Usuário **fora** da allowlist não entra.
9. `User.isActive = false` no banco de produção: sessão recusada; histórico permanece.
10. Duas sessões (dois browsers), eventualmente em pods diferentes: mutação numa aparece na outra via SSE **sem** recarregar; ingress não atrasa dezenas de segundos.
11. Derrubar um pod: cliente reconecta; `Last-Event-ID` recupera eventos na janela de 7 dias.
12. CronJob: `kubectl create job --from=cronjob/arquitetura-kanban-realtime-cleanup` (ensaio). Contagem de `audit_events` **igual** antes/depois; só `realtime_event` antigo some.
13. Logs sem secrets.
14. Exercício de restore com a infra — [backup-restore.md](backup-restore.md) §5. **Não** marcar este item sem a infra.

---

## 15. Relação com outras tasks

| Task | Uso deste guia |
| --- | --- |
| T03 / T07 | mesmo adapter `corporate`; CyberArk só via env |
| T10 | homologação Vercel **não** é produção; migrate no build fica só lá |
| T21 | hub SSE; `DATABASE_URL_LISTEN`; réplicas via `NOTIFY` |
| T28 | E2E de produto; este guia é operação |
| T30 | adoção só depois de login real e cluster estáveis |

---

## 16. Status nesta task (T29)

| Item | Estado |
| --- | --- |
| Guias `production.md` e `backup-restore.md` | escritos |
| Manifests, SQL, Dockerfile non-root + health, workflow de imagem | no repositório |
| Cluster / namespace / registry / DNS / TLS | **pendente** de infra |
| Login e autorização CyberArk | **não validado** |
| SSE / replay entre réplicas no cluster | **não validado** |
| CronJob no cluster | **não validado** (SQL e teste de invariante no repo) |
| Backup / restore com a infra | **não validado** |
| Push da imagem para registry corporativo | **pendente** de `IMAGE_REGISTRY` |

Credenciais e cluster ausentes = dependência. Não tratar este documento como aceite de produção no ar.
