# Guias de operação

Os guias abaixo são entregáveis de tasks posteriores. **Não** foram escritos em T01.

| Guia | Task | Conteúdo previsto |
| --- | --- | --- |
| [oidc.md](oidc.md) | T03 | Logto (DEV/TEST) e CyberArk (PROD): aplicações, issuer/discovery, callbacks, logout, scopes, claims, restrição de usuários, variáveis, segredos, validação |
| [realtime-validation.md](realtime-validation.md) | T04 | Prova de SSE + LISTEN/NOTIFY por ambiente; acessos, proxy, evidências, limites de runtime |
| [local-development.md](local-development.md) | T05 | Pré-requisitos, Compose (`app` + PostgreSQL), variáveis, migrations/seeds, Logto externo, diagnóstico |
| [homologation.md](homologation.md) | T10 | Vercel, PostgreSQL, GitHub Actions, migrations, callbacks, recuperação de deploy |
| [production.md](production.md) | T29 | Kubernetes, ingress/SSE, CyberArk, CronJob de retenção, rollout/rollback |
| [backup-restore.md](backup-restore.md) | T29 | Responsabilidade de backup, exercício de restore, o que não apagar (auditoria) |
| [adoption.md](adoption.md) | T30 | Mapeamento da planilha, carga assistida, limites do histórico, roteiro dos cinco usuários |

Arquitetura e ADRs: [architecture.md](../architecture.md), [adr/](../adr/README.md).

Nenhum guia deve conter credenciais reais. Segredos ficam no gerenciador do ambiente (local `.env` não versionado, secrets da Vercel, secrets do cluster).
