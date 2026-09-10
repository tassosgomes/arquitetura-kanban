# Guias de operação

| Guia | Task | Status | Conteúdo |
| --- | --- | --- | --- |
| [oidc.md](oidc.md) | T03 | Escrito | Logto (DEV/TEST) e CyberArk (PROD): aplicações, issuer/discovery, callbacks, logout, scopes, claims, restrição de usuários, variáveis, segredos, validação |
| [realtime-validation.md](realtime-validation.md) | T04 | Escrito | Prova de SSE + LISTEN/NOTIFY por ambiente; acessos, proxy, evidências, limites de runtime |
| [local-development.md](local-development.md) | T05 | Escrito | Pré-requisitos, Compose (`app` + PostgreSQL), variáveis, migrations/seeds, Logto externo, diagnóstico |
| [homologation.md](homologation.md) | T10 | Pendente | Vercel, PostgreSQL, GitHub Actions, migrations, callbacks, recuperação de deploy |
| [production.md](production.md) | T29 | Pendente | Kubernetes, ingress/SSE, CyberArk, CronJob de retenção, rollout/rollback |
| [backup-restore.md](backup-restore.md) | T29 | Pendente | Responsabilidade de backup, exercício de restore, o que não apagar (auditoria) |
| [adoption.md](adoption.md) | T30 | Pendente | Mapeamento da planilha, carga assistida, limites do histórico, roteiro dos cinco usuários |

Contrato normativo de identidade (T03), usado por T06/T07/T09/T13: [identity.md](../identity.md).

Desenho do hub de realtime (T04), usado por T06/T21/T29: [realtime.md](../realtime.md). Spike local: `spikes/realtime/`. Vercel e Kubernetes permanecem pendentes de prova com acesso.

Arquitetura e ADRs: [architecture.md](../architecture.md), [adr/](../adr/README.md).

Nenhum guia deve conter credenciais reais. Segredos ficam no gerenciador do ambiente (local `.env` não versionado, secrets da Vercel, secrets do cluster). Login SSO real **não** está validado: o responsável preenche issuer, apps e allowlists conforme [oidc.md](oidc.md).
