"use server";

import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";

const schema = z
  .object({
    current: z.string().min(1, "Password lama wajib diisi"),
    next: z.string().min(8, "Password baru minimal 8 karakter").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm"],
  })
  .refine((d) => d.current !== d.next, {
    message: "Password baru harus berbeda dari password lama",
    path: ["next"],
  });

export type ChangePasswordResult = {
  error?: string;
  fieldErrors?: Partial<Record<"current" | "next" | "confirm", string>>;
  ok?: boolean;
};

export async function changePassword(input: {
  current: string;
  next: string;
  confirm: string;
}): Promise<ChangePasswordResult> {
  const user = await getCurrentUser();
  if (!user || !user.email) return { error: "Tidak terautentikasi" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        current: f.current?.[0],
        next: f.next?.[0],
        confirm: f.confirm?.[0],
      },
    };
  }

  // Verify current password by attempting re-auth
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (signInErr) {
    return { fieldErrors: { current: "Password lama salah" } };
  }

  // Update via admin client (service role bypasses confirmation flow)
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.next,
  });
  if (error) return { error: error.message };

  return { ok: true };
}
