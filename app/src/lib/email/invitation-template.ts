function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function invitationHtml(
  fullName: string,
  email: string,
  password: string,
  appName: string,
  appUrl: string,
): string {
  const loginUrl = `${appUrl}/login`;
  const resetUrl = `${appUrl}/forgot-password`;
  return `
<!doctype html>
<html lang="id">
  <body style="font-family: -apple-system, system-ui, sans-serif; color:#0f172a; max-width:560px; margin:0 auto; padding:24px;">
    <h2 style="color:#7c3aed;">Halo ${escapeHtml(fullName)},</h2>
    <p>Akun Anda di <strong>${escapeHtml(appName)}</strong> sudah dibuat. Gunakan kredensial berikut untuk login:</p>
    <table style="width:100%; border-collapse:collapse; margin:16px 0; background:#f8fafc; border-radius:8px;">
      <tr><td style="padding:10px 14px; font-size:12px; color:#64748b; width:100px;">Email</td><td style="padding:10px 14px; font-family:monospace; font-size:14px; color:#0f172a;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:10px 14px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0;">Password</td><td style="padding:10px 14px; font-family:monospace; font-size:14px; color:#0f172a; border-top:1px solid #e2e8f0;">${escapeHtml(password)}</td></tr>
    </table>
    <p style="margin: 24px 0;">
      <a href="${loginUrl}" style="background:#7c3aed; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:600;">Login Sekarang</a>
    </p>
    <p style="color:#475569; font-size:13px;">Untuk keamanan, ganti password Anda setelah login pertama. Atau gunakan <a href="${resetUrl}">link reset password</a> jika diperlukan.</p>
    <p style="color:#94a3b8; font-size:12px; margin-top:32px;">Email ini dikirim otomatis. Jika Anda merasa menerima ini secara keliru, abaikan saja.</p>
  </body>
</html>`.trim();
}
