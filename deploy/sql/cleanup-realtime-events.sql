-- T29 — cleanup de RealtimeEvent (retenção de 7 dias).
-- Idempotente: a segunda execução na mesma janela apaga zero linhas.
-- NÃO apaga audit_events, nem entidades de domínio (users, activities, …).
-- Contrato: docs/realtime.md §10; docs/guides/production.md; docs/guides/backup-restore.md.

WITH deleted AS (
  DELETE FROM "realtime_event"
  WHERE "createdAt" < (CURRENT_TIMESTAMP - INTERVAL '7 days')
  RETURNING id
)
SELECT count(*)::bigint AS deleted_count FROM deleted;
