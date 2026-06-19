"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Folder,
  LayoutTemplate,
  Users,
  GraduationCap,
  ShieldCheck,
  Award,
  Building2,
  Sparkles,
  ClipboardCheck,
  MapPin,
  BarChart3,
  History,
  CalendarDays,
  ListChecks,
  MoreHorizontal,
  X,
  LogOut,
  UserCircle,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/login/actions";
import type { SidebarItem } from "@/components/sidebar";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Folder,
  LayoutTemplate,
  Users,
  GraduationCap,
  ShieldCheck,
  Award,
  Building2,
  Sparkles,
  ClipboardCheck,
  MapPin,
  BarChart3,
  History,
  CalendarDays,
  ListChecks,
};

export type MobileBottomNavUser = {
  full_name: string;
  email: string | null;
  role_label: string;
  avatar_url: string | null;
};

export function MobileBottomNav({
  items,
  scopeLabel,
  user,
  primaryCount = 4,
}: {
  items: SidebarItem[];
  scopeLabel: string;
  user: MobileBottomNavUser;
  primaryCount?: number;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const primary = items.slice(0, primaryCount);
  const rest = items.slice(primaryCount);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  // Active on More: when current path matches any "rest" item
  const moreActive = rest.some(
    (it) => pathname === it.href || pathname.startsWith(`${it.href}/`),
  );

  return (
    <>
      {/* Bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-atr-outline bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.04)] lg:hidden"
        aria-label="Navigasi utama"
      >
        {primary.map((item) => {
          const Icon = ICONS[item.icon] ?? Folder;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition",
                active
                  ? "text-atr-purple-600"
                  : "text-atr-fg-muted hover:text-atr-fg",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-atr-purple")} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition",
            moreActive || drawerOpen
              ? "text-atr-purple-600"
              : "text-atr-fg-muted hover:text-atr-fg",
          )}
        >
          <MoreHorizontal
            className={cn(
              "h-5 w-5",
              (moreActive || drawerOpen) && "text-atr-purple",
            )}
          />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer panel — slides from bottom */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out lg:hidden",
          drawerOpen ? "translate-y-0" : "translate-y-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu lainnya"
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-atr-outline" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo/vmt/vmt-app-icon.svg"
              alt="VMT"
              width={32}
              height={32}
              className="rounded-lg shadow-atr-1"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-atr-fg">
                VMT
              </div>
              <div className="text-[10px] text-atr-fg-muted">
                <span className="font-bold text-atr-purple">{scopeLabel}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-atr-fg-muted hover:bg-atr-bg-soft"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User card */}
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-atr-outline bg-atr-bg-soft/50 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-atr-purple text-sm font-bold text-white">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              user.full_name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-atr-fg">
              {user.full_name}
            </div>
            <div className="truncate text-xs text-atr-fg-muted">
              {user.role_label}
            </div>
          </div>
        </div>

        {/* All nav items */}
        {rest.length > 0 && (
          <div className="px-3 pt-3">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-atr-fg-muted">
              Menu lainnya
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {rest.map((item) => {
                const Icon = ICONS[item.icon] ?? Folder;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                      active
                        ? "border-atr-purple/30 bg-atr-purple-50 text-atr-purple-600"
                        : "border-atr-outline bg-white text-atr-fg hover:bg-atr-bg-soft",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-atr-purple" : "text-atr-fg-muted",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Account actions */}
        <div className="px-3 pb-4 pt-3">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-atr-fg-muted">
            Akun
          </div>
          <div className="space-y-1">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-xl border border-atr-outline bg-white px-3 py-2.5 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
            >
              <UserCircle className="h-4 w-4 text-atr-fg-muted" />
              Profil saya
            </Link>
            <Link
              href="/notifications"
              className="flex items-center gap-2.5 rounded-xl border border-atr-outline bg-white px-3 py-2.5 text-sm font-bold text-atr-fg hover:bg-atr-bg-soft"
            >
              <Bell className="h-4 w-4 text-atr-fg-muted" />
              Notifikasi
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl border border-atr-red/30 bg-white px-3 py-2.5 text-sm font-bold text-atr-red hover:bg-atr-red/5"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
