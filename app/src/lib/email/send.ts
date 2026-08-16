import "server-only";

// =====================================================
// Central email sender - Resend REST API.
// Dipakai semua email keluar aplikasi (undangan/kredensial, reset password,
// dan notifikasi bila diaktifkan). Tidak pernah throw: kembalikan hasil
// terstruktur supaya pemanggil bisa menghitung sukses/gagal.
//
// Butuh env RESEND_API_KEY dan RESEND_FROM_EMAIL (domain harus terverifikasi
// di Resend, atau pakai onboarding@resend.dev untuk uji coba). RESEND_FROM_NAME
// opsional (default nama aplikasi).
// =====================================================

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  // Versi plaintext. Sangat disarankan diisi: multipart text+html adalah
  // sinyal kuat agar email masuk INBOX (bukan Promotions/Spam).
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName =
    process.env.RESEND_FROM_NAME ??
    process.env.NEXT_PUBLIC_APP_NAME ??
    "Atourin Milestone Tracker";

  if (!apiKey) return { ok: false, error: "RESEND_API_KEY belum dikonfigurasi" };
  if (!fromEmail)
    return { ok: false, error: "RESEND_FROM_EMAIL belum dikonfigurasi" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      let msg = `Resend HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) msg = body.message;
      } catch {
        // abaikan body yang tidak bisa di-parse
      }
      return { ok: false, error: msg };
    }

    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
