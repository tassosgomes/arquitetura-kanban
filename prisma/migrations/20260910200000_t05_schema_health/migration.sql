-- T05 placeholder. T06 replaces this schema with the full relational model.
CREATE TABLE "SchemaHealth" (
    "id" UUID NOT NULL,
    "checkedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchemaHealth_pkey" PRIMARY KEY ("id")
);
