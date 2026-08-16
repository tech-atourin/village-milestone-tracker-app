function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function resetPasswordHtml(
  fullName: string,
  actionUrl: string,
  appName: string,
): string {
  const salam = fullName ? `Halo ${escapeHtml(fullName)},` : "Halo,";
  return `
<!doctype html>
<html lang="id">
  <body style="font-family: -apple-system, system-ui, sans-serif; color:#0f172a; max-width:560px; margin:0 auto; padding:24px;">
    <h2 style="color:#7c3aed;">${salam}</h2>
    <p>Kami menerima permintaan untuk menyetel ulang password akun Anda di <strong>${escapeHtml(appName)}</strong>. Klik tombol di bawah untuk membuat password baru:</p>
    <p style="margin: 24px 0;">
      <a href="${actionUrl}" style="background:#7c3aed; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:600;">Setel Ulang Password</a>
    </p>
    <p style="color:#475569; font-size:13px;">Tautan ini hanya berlaku sementara dan sekali pakai. Jika tombol tidak berfungsi, salin dan tempel tautan berikut di browser Anda:</p>
    <p style="word-break:break-all; font-size:12px; color:#7c3aed;">${actionUrl}</p>
    <p style="color:#94a3b8; font-size:12px; margin-top:32px;">Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.</p>
  </body>
</html>`.trim();
}
