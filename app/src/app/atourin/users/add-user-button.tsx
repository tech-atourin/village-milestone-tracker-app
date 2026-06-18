"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  UserFormDialog,
  type OrgOption,
  type DesaOption,
  type UserFormRole,
} from "@/components/users/user-form-dialog";

export function AddUserButton({
  orgOptions,
  desaOptions,
  allowedRoles,
}: {
  orgOptions: OrgOption[];
  desaOptions?: DesaOption[];
  allowedRoles?: UserFormRole[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-atr-purple/40 bg-atr-purple-50 px-4 text-sm font-bold text-atr-purple-600 transition hover:bg-atr-purple-light/40"
      >
        <Plus className="h-4 w-4" />
        Tambah User
      </button>
      <UserFormDialog
        open={open}
        onClose={() => setOpen(false)}
        orgOptions={orgOptions}
        desaOptions={desaOptions}
        allowedRoles={allowedRoles}
      />
    </>
  );
}
