import { z } from "zod";

// =====================================================
// Server-only env (do NOT import from client components)
// =====================================================
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL_SUMMARY: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_REVIEW: z.string().default("gemini-2.5-flash-lite"),
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default("true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default("Atourin Milestone Tracker"),
  SMTP_FROM_EMAIL: z.string().email().optional().or(z.literal("")),
  FONNTE_API_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Atourin Milestone Tracker"),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "❌ Invalid server environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid server environment variables");
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

// =====================================================
// Client-safe env (only NEXT_PUBLIC_*)
// =====================================================
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Atourin Milestone Tracker"),
});

let cachedClientEnv: z.infer<typeof clientSchema> | null = null;

export function clientEnv() {
  if (cachedClientEnv) return cachedClientEnv;
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing NEXT_PUBLIC_* env vars: " +
        JSON.stringify(parsed.error.flatten().fieldErrors),
    );
  }
  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}
