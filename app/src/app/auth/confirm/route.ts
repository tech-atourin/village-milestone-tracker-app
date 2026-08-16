import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// =====================================================
// Verifikasi token OTP berbasis token_hash (recovery/email/magiclink).
// Dipakai link reset password (dan link verifikasi lain): membaca token_hash
// + type dari query, memanggil verifyOtp untuk menetapkan sesi, lalu redirect
// ke `next`. Pola resmi @supabase/ssr untuk link email server-rendered.
// =====================================================
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/";
  // Hanya izinkan path relatif same-origin.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
