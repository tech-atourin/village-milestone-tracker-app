import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// Magic-link / OTP callback handler.
// Exchanges the code from Supabase Auth for a session,
// then sends the user to the right scope dashboard based
// on global_role. Full role-based routing is wired in
// Checkpoint 2; for now we just complete the exchange and
// land on the public root.
// =====================================================
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
