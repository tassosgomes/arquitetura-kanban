# Guias de operação

| Guia | Task | Status | Conteúdo |
| --- | --- | --- | --- |
| [oidc.md](oidc.md) | T03 | Escrito | Logto (DEV/TEST) e CyberArk (PROD): aplicações, issuer/discovery, callbacks, logout, scopes, claims, restrição de usuários, variáveis, segredos, validação |
| [realtime-validation.md](realtime-validation.md) | T04 | Escrito | Prova de SSE + LISTEN/NOTIFY por ambiente; acessos, proxy, evidências, limites de runtime |
| [local-development.md](local-development.md) | T05 | Escrito | Pré-requisitos, Compose (`app` + PostgreSQL), variáveis, migrations/seeds, Logto externo, diagnóstico |
| [homologation.md](homologation.md) | T10 | Escrito | Vercel, PostgreSQL de homologação, GitHub Actions, migrations no build, callbacks Logto, SSE degradado, recuperação de deploy. **Deploy real pendente de contas.** |
| [production.md](production.md) | T29 | Escrito | Kubernetes, registry, DNS/TLS, ingress/SSE, secrets, Postgres gerenciado, CyberArk (via [oidc.md](oidc.md)), pipeline, Job de migrate (não o modelo Vercel), CronJob de 7 dias, observabilidade, rollout/rollback. **Cluster e login CyberArk não validados.** |
| [backup-restore.md](backup-restore.md) | T29 | Escrito | Responsabilidade da infra, o que não apagar (`audit_events`), procedimento e exercício de restore. **Restore real não executado.** |
| [adoption.md](adoption.md) | T30 | Escrito | Mapeamento da planilha → sistema, preparação, carga assistida na UI, limites do histórico, roteiro dos cinco usuários, checklist de virada. **Homologação com pessoas reais e planilha pendentes do responsável.** Sem importador. |

Contrato normativo de identidade (T03), usado por T06/T07/T09/T13: [identity.md](../identity.md).

Desenho do hub de realtime (T04), usado por T06/T21/T29: [realtime.md](../realtime.md). Spike local: `spikes/realtime/`. Vercel e Kubernetes permanecem pendentes de prova com acesso.

Arquitetura e ADRs: [architecture.md](../architecture.md), [adr/](../adr/README.md).

Manifests e SQL de produção: `deploy/k8s/`, `deploy/sql/cleanup-realtime-events.sql`. Imagem: `docker build --target production`. Compose local usa `--target development`.

Nenhum guia deve conter credenciais reais. Segredos ficam no gerenciador do ambiente (local `.env` não versionado, secrets da Vercel, secrets do cluster). Login SSO real **não** está validado: o responsável preenche issuer, apps e allowlists conforme [oidc.md](oidc.md).
