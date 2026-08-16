import { emailShell, escapeHtml, h1, p } from "./layout";

const BRAND = { purple: "#7c3aed", muted: "#64748b" };

export function resetPasswordHtml(
  fullName: string,
  actionUrl: string,
  appName: string,
): string {
  const salam = fullName ? `Halo ${fullName},` : "Halo,";
  const content = [
    h1(salam),
    p(
      `Kami menerima permintaan untuk menyetel ulang password akun Anda di <strong>${escapeHtml(
        appName,
      )}</strong>. Klik tombol di bawah untuk membuat password baru.`,
    ),
    p(
      `<span style="color:${BRAND.muted}; font-size:13px;">Tautan ini hanya berlaku sementara dan sekali pakai. Jika tombol tidak berfungsi, salin tautan berikut ke browser Anda:</span>`,
    ),
    p(
      `<span style="font-size:12px; color:${BRAND.purple}; word-break:break-all;">${actionUrl}</span>`,
    ),
    p(
      `<span style="color:${BRAND.muted}; font-size:13px;">Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.</span>`,
    ),
  ].join("");

  return emailShell({
    preheader: `Setel ulang password akun ${appName} Anda.`,
    contentHtml: content,
    cta: { label: "Setel Ulang Password", url: actionUrl },
    appName,
  });
}

export function resetPasswordText(
  fullName: string,
  actionUrl: string,
  appName: string,
): string {
  const salam = fullName ? `Halo ${fullName},` : "Halo,";
  return [
    salam,
    "",
    `Kami menerima permintaan untuk menyetel ulang password akun Anda di ${appName}.`,
    "Buka tautan berikut untuk membuat password baru (berlaku sementara, sekali pakai):",
    "",
    actionUrl,
    "",
    "Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.",
    "",
    "Email ini dikirim otomatis. Mohon tidak membalas.",
  ].join("\n");
}
