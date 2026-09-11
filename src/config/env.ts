import { z } from "zod";

/**
 * Validated environment configuration
 * (docs/architecture/07_Repository_Structure.md: "config/ — validated at
 * startup"). Parsing is lazy (on first call to getEnv(), cached after) —
 * NOT at module import time. A module that merely imports this file (e.g.
 * transitively, via a barrel export) must not be forced to have every
 * secret configured; only code that actually needs a configuration value
 * pays the cost of validating it. This matters concretely for
 * src/modules/auth/index.ts, whose pure domain exports (Role,
 * AuthenticatedActor, permission functions) must stay importable — by other
 * modules and by tests — without a database URL or JWT secret ever being
 * set. A missing/invalid variable still fails loudly, just at first real
 * use rather than at import time.
 */

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL: z.string().default("30d"),
    BCRYPT_COST_FACTOR: z.coerce
      .number()
      .int()
      .min(12, "bcrypt cost factor must be >= 12 (docs/security/14_Security_Architecture.md)")
      .default(12),

    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Email provider selection is a deliberately open decision (see
    // docs/planning/18_Open_Questions.md Q2) — only "console" (a dev logger)
    // is implemented today. "resend" and "smtp" are accepted here so that
    // .env.example's documented options validate, but selecting them throws
    // a clear error from the notifications module's provider factory until
    // a concrete implementation is added (additive infrastructure work,
    // zero application-layer changes required).
    EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
    EMAIL_FROM_ADDRESS: z.string().default("noreply@tnparch.in"),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    // Background Job Processing System (src/modules/jobs). Optional — the
    // worker has sane built-in defaults; these exist so poll frequency/batch
    // size can be tuned per-environment without a code change.
    JOB_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
    JOB_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(5),

    FILE_STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
    FILE_STORAGE_ROOT: z.string().default("storage/uploads"),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_REGION: z.string().min(1).optional(),
    STORAGE_BUCKET: z.string().min(1).optional(),
    STORAGE_ACCESS_KEY_ID: z.string().min(1).optional(),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  })
  .refine((value) => value.JWT_ACCESS_SECRET !== value.JWT_REFRESH_SECRET, {
    message: "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ",
    path: ["JWT_REFRESH_SECRET"],
  })
  .superRefine((value, ctx) => {
    if (value.FILE_STORAGE_DRIVER === "local" && !value.FILE_STORAGE_ROOT) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["FILE_STORAGE_ROOT"], message: "FILE_STORAGE_ROOT is required when FILE_STORAGE_DRIVER=local" });
    }
    if (value.FILE_STORAGE_DRIVER === "r2") {
      for (const key of ["STORAGE_ENDPOINT", "STORAGE_REGION", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY_ID", "STORAGE_SECRET_ACCESS_KEY"] as const) {
        if (!value[key]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required when FILE_STORAGE_DRIVER=r2` });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}
