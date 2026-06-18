export const metadata = { title: "Users" };

import Link from "next/link";
import { Upload, Users as UsersIcon } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/server";
import { listOrgsDetailed } from "@/server/queries/orgs";
import type { UserListRow } from "@/server/queries/users";
import { UsersTable } from "@/app/atourin/users/users-table";
import { AddUserButton } from "@/app/atourin/users/add-user-button";

const MITRA_ROLE_FILTERS = [
  { value: "peserta", label: "Peserta" },
  { value: "narasumber", label: "Narasumber" },
  { value: "desa_wisata", label: "Desa Wisata" },
];

export default async function MitraUsersListPage() {
  await requireRole("mitra_admin");

  // Admin client bypasses RLS on vmt.users (mitra anon role can't read other
  // users' rows). Scope: only roles relevant to a mitra — peserta, narasumber,
  // desa_wisata. Superadmin + mitra_admin tidak ditampilkan.
  const admin = createAdminClient();
  const [{ data }, orgs] = await Promise.all([
    admin
      .from("users")
      .select(
        "id, full_name, email, email_artificial, phone, global_role, created_at, last_login_at, organization:organizations(id, name)",
      )
      .in("global_role", ["peserta", "narasumber", "desa_wisata"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
    listOrgsDetailed(),
  ]);
  const users = (data ?? []) as unknown as UserListRow[];
  const orgOptions = orgs.map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-atr-fg">
            Users
          </h1>
          <p className="text-sm text-atr-fg-muted">
            Daftar peserta, narasumber, dan desa wisata yang terdaftar di
            platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddUserButton
            orgOptions={orgOptions}
            allowedRoles={["peserta", "narasumber", "desa_wisata"]}
          />
          <Link
            href="/mitra/users/bulk-import"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-outline bg-white px-4 text-sm font-bold text-atr-fg transition hover:bg-atr-bg-soft"
          >
            <Upload className="h-4 w-4" />
            Bulk Import
          </Link>
        </div>
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
        <UsersTable
          users={users}
          detailHrefBase="/mitra/users"
          roleFilterOptions={MITRA_ROLE_FILTERS}
        />
      )}
    </div>
  );
}
