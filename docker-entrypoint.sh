#!/bin/sh
# Local Compose only (Dockerfile target `development`). Production pods run `node server.js`
# and apply schema with the Kubernetes Job in deploy/k8s/migrate-job.yaml.example.
set -e

npx prisma generate
npx prisma migrate deploy
npx prisma db seed

exec npm run dev
