"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// =====================================================
// RouteProgress — top-of-page nprogress-style bar that
// shows during client-side navigations. Triggered by:
// - Any anchor click whose href starts with "/"
// - Any pathname/searchParams change (completion)
// =====================================================

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset on route change (navigation completed)
  useEffect(() => {
    setProgress(100);
    const t = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  // Intercept clicks on internal links to start the bar
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Ignore right-click, meta-click, etc.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== "A") el = el.parentElement;
      if (!el) return;
      const a = el as HTMLAnchorElement;
      const href = a.getAttribute("href");
      if (!href) return;
      // Only internal navigations
      if (!href.startsWith("/") || href.startsWith("//")) return;
      // Skip target=_blank
      if (a.target === "_blank") return;
      // Skip current URL (no actual navigation)
      const target = href.split("#")[0];
      if (target === pathname) return;
      setActive(true);
      setProgress(15);
      // Animate to ~80 over time
      let p = 15;
      const interval = window.setInterval(() => {
        p = Math.min(80, p + 5 + Math.random() * 10);
        setProgress(p);
        if (p >= 80) window.clearInterval(interval);
      }, 150);
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-0.5">
      <div
        className="h-full bg-atr-purple shadow-[0_0_8px_rgba(112,104,213,0.5)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
