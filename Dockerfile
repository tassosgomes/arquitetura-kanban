# Local Compose uses target `development` (`npm run dev` via docker-entrypoint.sh).
# Kubernetes / CI image: `docker build --target production` (non-root, `node server.js`).
FROM node:24-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN npm ci

# Bind-mounted source in Compose; keep root so host UID can write.
FROM deps AS development

COPY . .
RUN chmod +x docker-entrypoint.sh \
  && npx prisma generate

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]

FROM deps AS builder

COPY . .

# Dummy env only for this RUN (not baked into the production image).
RUN export APP_URL=http://localhost:3000 \
    APP_TIME_ZONE=America/Sao_Paulo \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    OIDC_ISSUER=https://build.example.test/oidc \
    OIDC_CLIENT_ID=build-client \
    OIDC_CLIENT_SECRET=build-secret \
    OIDC_SCOPES="openid profile email" \
    AUTH_SECRET=build-dummy-auth-secret-min-32-chars \
    NODE_ENV=production \
  && mkdir -p public \
  && npx prisma generate \
  && npm run build

FROM base AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/.next/cache /tmp \
  && chown -R node:node /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node deploy/sql ./deploy/sql
COPY --chown=node:node scripts/cleanup-realtime-events.mjs ./scripts/cleanup-realtime-events.mjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health/live || exit 1

CMD ["node", "server.js"]
