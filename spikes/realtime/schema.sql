-- Spike T04 apenas. T06 cria o modelo Prisma da aplicação.
CREATE TABLE IF NOT EXISTS realtime_event (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS realtime_event_created_at_idx
  ON realtime_event (created_at);
