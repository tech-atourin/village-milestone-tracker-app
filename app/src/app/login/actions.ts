"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { scopeHomePath } from "@/lib/auth/rbac";
import type { GlobalRole } from "@/types/supabase";

const signInSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  redirectTo: z.string().optional(),
});

export type SignInResult = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export async function signInAction(
  _prev: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: f.email?.[0],
        password: f.password?.[0],
      },
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Email atau password salah. Silakan coba lagi." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = (profile as { global_role?: GlobalRole } | null)?.global_role;

  if (!role) {
    // Account exists in auth but no vmt.users row → orphan account
    await supabase.auth.signOut();
    return {
      error:
        "Akun Anda belum diaktifkan. Hubungi admin organisasi atau tim Atourin.",
    };
  }

  // Update last_login_at (best-effort, ignore error)
  await supabase
    .from("users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  const target = parsed.data.redirectTo?.startsWith("/")
    ? parsed.data.redirectTo
    : scopeHomePath(role);

  redirect(target);
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const forgotSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

export type ForgotResult = {
  error?: string;
  success?: boolean;
};

export async function forgotPasswordAction(
  _prev: ForgotResult | null,
  formData: FormData,
): Promise<ForgotResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Format email tidak valid." };
  }

  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${appUrl}/auth/callback?next=/reset-password` },
  );

  if (error) return { error: error.message };

  // Always show success - don't leak whether the email exists.
  return { success: true };
}
