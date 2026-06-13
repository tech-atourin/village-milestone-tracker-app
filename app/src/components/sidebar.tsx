"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function Sidebar({
  items,
  scopeLabel,
}: {
  items: SidebarItem[];
  scopeLabel: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-atr-outline bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-atr-outline px-5">
        <Image
          src="/logo/vmt/vmt-app-icon.svg"
          alt="Village Milestone Tracker"
          width={40}
          height={40}
          className="rounded-lg shadow-atr-1"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight tracking-tight text-atr-fg">
            Village Milestone Tracker
          </div>
          <div className="text-xs text-atr-fg-muted">
            by Atourin · <span className="font-bold text-atr-purple">{scopeLabel}</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-bold transition",
                active
                  ? "bg-atr-purple-50 text-atr-purple-600"
                  : "text-atr-fg hover:bg-atr-bg-soft",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-atr-purple" : "text-atr-fg-muted",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-atr-outline px-4 py-3 text-[11px] text-atr-fg-muted">
        © 2026 Atourin · v0.1
      </div>
    </aside>
  );
}
