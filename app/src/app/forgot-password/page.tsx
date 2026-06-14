export const metadata = { title: "Lupa Password" };

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
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
                Reset password
              </div>
              <div className="text-xs text-atr-fg-muted">
                Village Milestone Tracker
              </div>
            </div>
          </div>
          <p className="mb-6 text-sm text-atr-fg-muted">
            Masukkan email yang terdaftar. Kami akan kirim link reset password
            ke kotak masuk Anda.
          </p>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
