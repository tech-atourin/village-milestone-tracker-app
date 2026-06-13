export const metadata = { title: "Narasumber" };

import { Users, GraduationCap, Mail, Phone } from "lucide-react";
import { listUsers } from "@/server/queries/users";

export default async function NarasumberPage() {
  const narasumber = await listUsers({ role: "narasumber" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Narasumber
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Pool mentor & narasumber yang bisa di-assign ke project sebagai
          subject-matter expert.
        </p>
      </header>

      {narasumber.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <Users className="mx-auto mb-3 h-6 w-6 text-atr-fg-muted" />
          <p className="text-sm font-bold text-atr-fg">Belum ada narasumber</p>
          <p className="mt-1 text-xs text-atr-fg-muted">
            Tandai user dengan role &quot;narasumber&quot; saat bulk import
            untuk menambahkan mereka di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {narasumber.map((u) => (
            <article
              key={u.id}
              className="rounded-2xl border border-atr-outline bg-white p-5 shadow-atr-1"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-atr-yellow/25 text-atr-fg">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-atr-fg">
                    {u.full_name}
                  </h3>
                  {u.organization?.name && (
                    <p className="truncate text-xs text-atr-fg-muted">
                      {u.organization.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-atr-fg-muted">
                {u.email && !u.email_artificial && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                )}
                {u.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{u.phone}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled
                className="mt-4 inline-flex h-9 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-atr-outline bg-atr-bg-soft px-3 text-xs font-bold text-atr-fg-muted"
                title="Direct booking hadir di Phase 4 ekstensi"
              >
                Request sebagai narasumber
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
