import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().min(1),
  ALLOWED_EMAIL_DOMAINS: z
    .string()
    .transform((value) => value.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean)),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Read lazily so `next build` does not need runtime secrets.
export function getEnv(): Env {
  cached ??= envSchema.parse(process.env);
  return cached;
}
