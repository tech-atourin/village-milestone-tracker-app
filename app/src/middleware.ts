import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// =====================================================
// Route protection rules
// =====================================================
// Public routes are reachable without auth.
// Scoped routes require a matching global_role.
//
// global_role → allowed prefix:
//   superadmin   → /atourin
//   mitra_admin  → /mitra
//   peserta      → /peserta
//   narasumber   → /peserta (treated as participant scope for now)
//
// Anyone landing on a scoped prefix they don't own is
// redirected to /forbidden.
// =====================================================

const PUBLIC_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth", // magic-link + reset callback
  "/forbidden",
  "/public", // shareable dashboards (Phase 3)
];

const SCOPE_PREFIXES = {
  superadmin: "/atourin",
  mitra_admin: "/mitra",
  peserta: "/peserta",
  narasumber: "/narasumber",
  desa_wisata: "/desa",
} as const;

type GlobalRole = keyof typeof SCOPE_PREFIXES;

function isPublic(path: string) {
  if (path === "/") return true;
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function ownsScope(role: GlobalRole | null, path: string) {
  if (!role) return false;
  const allowed = SCOPE_PREFIXES[role];
  return path === allowed || path.startsWith(`${allowed}/`);
}

function isScopedPath(path: string) {
  // /profile is shared across all roles - not gated to one scope.
  if (path === "/profile" || path.startsWith("/profile/")) return false;
  return Object.values(SCOPE_PREFIXES).some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { supabase, response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  if (isPublic(path)) return response;

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  if (!isScopedPath(path)) return response;

  // Look up role. Canonical source is vmt.users.global_role.
  const { data: profile } = await supabase
    .from("users")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.global_role ?? null) as GlobalRole | null;

  if (!ownsScope(role, path)) {
    const forbidden = request.nextUrl.clone();
    forbidden.pathname = "/forbidden";
    return NextResponse.redirect(forbidden);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
