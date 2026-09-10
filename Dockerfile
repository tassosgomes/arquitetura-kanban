FROM node:24-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN npm ci

COPY . .
RUN chmod +x docker-entrypoint.sh \
  && npx prisma generate

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
