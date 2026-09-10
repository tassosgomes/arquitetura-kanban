import { assertPostgresReachableInCi } from "@/infrastructure/db/connect-postgres-for-tests";

await assertPostgresReachableInCi();
