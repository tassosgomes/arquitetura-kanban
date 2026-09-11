import { z } from "zod";

const optionalEndpoint = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.url().optional(),
);

export const envSchema = z.object({
  APP_URL: z
    .url()
    .refine((value) => !value.endsWith("/"), "APP_URL must not end with a slash"),
  APP_TIME_ZONE: z.literal("America/Sao_Paulo").default("America/Sao_Paulo"),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  DATABASE_URL_LISTEN: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    z
      .string()
      .min(1)
      .refine(
        (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
        "DATABASE_URL_LISTEN must be a PostgreSQL connection string",
      )
      .optional(),
  ),
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_SCOPES: z.string().min(1).default("openid profile email"),
  OIDC_AUTHORIZATION_ENDPOINT: optionalEndpoint,
  OIDC_TOKEN_ENDPOINT: optionalEndpoint,
  OIDC_USERINFO_ENDPOINT: optionalEndpoint,
  OIDC_LOGOUT_ENDPOINT: optionalEndpoint,
  AUTH_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;
