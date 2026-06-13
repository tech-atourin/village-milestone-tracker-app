"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  User,
  KeyRound,
  Bell,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

export type UserMenuUser = {
  full_name: string;
  email: string | null;
  role_label: string;
  avatar_url: string | null;
};

const ITEMS = [
  { href: "/profile", label: "Profil Saya", icon: User },
  { href: "/profile#ubah-password", label: "Ubah Password", icon: KeyRound },
  { href: "/profile#notifikasi", label: "Notifikasi", icon: Bell },
];

export function UserMenu({
  user,
  variant,
}: {
  user: UserMenuUser;
  variant: "sidebar-up" | "topbar-down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const isSidebar = variant === "sidebar-up";
  const Chevron = open ? (isSidebar ? ChevronDown : ChevronUp) : isSidebar ? ChevronUp : ChevronDown;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full items-center gap-3 transition",
          isSidebar
            ? "rounded-xl border border-atr-outline bg-white p-2.5 pr-3 hover:bg-atr-bg-soft"
            : "rounded-full border border-atr-outline bg-white py-1 pl-1 pr-3 hover:bg-atr-bg-soft",
        )}
      >
        <Avatar
          src={user.avatar_url}
          alt={user.full_name}
          size={isSidebar ? 40 : 32}
        />
        <div className="min-w-0 flex-1 text-left">
          <div
            className={cn(
              "truncate font-bold text-atr-fg",
              isSidebar ? "text-sm" : "text-xs sm:text-sm",
            )}
          >
            {isSidebar ? user.full_name : user.full_name.split(" ")[0]}
          </div>
          {isSidebar && (
            <div className="truncate text-[11px] text-atr-fg-muted">
              {user.role_label}
            </div>
          )}
        </div>
        <Chevron className="h-4 w-4 shrink-0 text-atr-purple" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-64 overflow-hidden rounded-2xl border border-atr-outline bg-white shadow-xl",
            isSidebar
              ? "bottom-full left-0 mb-2"
              : "right-0 top-full mt-2",
          )}
        >
          <div className="flex items-center gap-3 border-b border-atr-outline px-4 py-3">
            <Avatar src={user.avatar_url} alt={user.full_name} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-atr-fg">
                {user.full_name}
              </div>
              <div className="truncate text-xs text-atr-fg-muted">
                {user.email ?? user.role_label}
              </div>
            </div>
          </div>
          <ul className="py-1">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-atr-fg transition hover:bg-atr-bg-soft"
                  >
                    <Icon className="h-4 w-4 text-atr-fg-muted" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <form action={signOutAction} className="border-t border-atr-outline">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-atr-red transition hover:bg-atr-red/5"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Avatar({
  src,
  alt,
  size,
}: {
  src: string | null;
  alt: string;
  size: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = alt.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-atr-purple-50 font-bold text-atr-purple"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initial}
    </div>
  );
}
