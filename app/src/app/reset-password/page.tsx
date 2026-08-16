export const metadata = { title: "Setel Ulang Password" };

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-form";

export default async function ResetPasswordPage() {
  // Link reset melewati /auth/callback yang menukar code jadi sesi recovery,
  // lalu mendarat di sini. Kalau tidak ada sesi, link kedaluwarsa/tidak valid.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-atr-bg-soft px-6 py-12">
      <div className="mx-auto max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-atr-fg-muted hover:text-atr-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke login
        </Link>

        <div className="mt-6 rounded-2xl border border-atr-outline bg-white p-7 shadow-atr-1 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="Village Milestone Tracker"
              width={40}
              height={40}
              className="rounded-lg shadow-atr-1"
            />
            <div>
              <div className="text-sm font-bold leading-tight tracking-tight text-atr-fg">
                Setel ulang password
              </div>
              <div className="text-xs text-atr-fg-muted">
                Village Milestone Tracker
              </div>
            </div>
          </div>

          {user ? (
            <>
              <p className="mb-6 text-sm text-atr-fg-muted">
                Buat password baru untuk akun{" "}
                <strong className="text-atr-fg">{user.email}</strong>.
              </p>
              <ResetPasswordForm />
            </>
          ) : (
            <div className="rounded-lg border border-atr-red/30 bg-atr-red/10 px-4 py-3 text-sm text-atr-red">
              Link reset tidak valid atau sudah kedaluwarsa. Silakan{" "}
              <Link
                href="/forgot-password"
                className="font-bold underline hover:no-underline"
              >
                minta link reset baru
              </Link>
              .
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
