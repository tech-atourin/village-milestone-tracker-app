export const metadata = { title: "Users" };

import { Users as UsersIcon } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserListRow } from "@/server/queries/users";
import { UsersTable } from "@/app/atourin/users/users-table";

export default async function MitraUsersListPage() {
  await requireRole("mitra_admin");

  // Admin client bypasses RLS on vmt.users (mitra anon role can't read other
  // users' rows). Scope: only roles relevant to a mitra — peserta, narasumber,
  // desa_wisata. Superadmin + mitra_admin tidak ditampilkan.
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select(
      "id, full_name, email, email_artificial, phone, global_role, created_at, last_login_at, organization:organizations(id, name)",
    )
    .in("global_role", ["peserta", "narasumber", "desa_wisata"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  const users = (data ?? []) as unknown as UserListRow[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
          Users
        </h1>
        <p className="text-sm text-atr-fg-muted">
          Daftar peserta, narasumber, dan desa wisata yang terdaftar di
          platform.
        </p>
      </header>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-atr-outline bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-atr-bg-soft">
            <UsersIcon className="h-5 w-5 text-atr-fg-muted" />
          </div>
          <p className="text-sm font-bold text-atr-fg">Belum ada user</p>
          <p className="mt-1 text-sm text-atr-fg-muted">
            Peserta &amp; narasumber bisa ditambahkan dari menu masing-masing.
          </p>
        </div>
      ) : (
        <UsersTable users={users} />
      )}
    </div>
  );
}
