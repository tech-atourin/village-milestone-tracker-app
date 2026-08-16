import { emailShell, escapeHtml, h1, p } from "./layout";

const BRAND = { ink: "#0f172a", muted: "#64748b", border: "#e2e8f0", soft: "#f8fafc" };

// Kotak kredensial: label + nilai monospace, gaya "detail transaksi".
function credsBox(email: string, password: string): string {
  return `<tr><td style="padding:2px 0 18px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.soft}; border:1px solid ${BRAND.border}; border-radius:12px;">
      <tr>
        <td style="padding:14px 16px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:${BRAND.muted}; width:96px;">Email</td>
        <td style="padding:14px 16px; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size:14px; color:${BRAND.ink}; word-break:break-all;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:14px 16px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:${BRAND.muted}; border-top:1px solid ${BRAND.border};">Password</td>
        <td style="padding:14px 16px; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size:14px; color:${BRAND.ink}; border-top:1px solid ${BRAND.border}; word-break:break-all;">${escapeHtml(password)}</td>
      </tr>
    </table>
  </td></tr>`;
}

export function invitationHtml(
  fullName: string,
  email: string,
  password: string,
  appName: string,
  appUrl: string,
): string {
  const loginUrl = `${appUrl}/login`;
  const content = [
    h1(`Halo ${fullName},`),
    p(
      `Akun Anda di <strong>${escapeHtml(
        appName,
      )}</strong> sudah aktif. Gunakan kredensial berikut untuk masuk:`,
    ),
    credsBox(email, password),
    p(
      `Demi keamanan, ganti password Anda setelah login pertama melalui menu Profil.`,
    ),
  ].join("");

  return emailShell({
    preheader: `Kredensial login akun ${appName} Anda sudah siap.`,
    contentHtml: content,
    cta: { label: "Login Sekarang", url: loginUrl },
    appName,
    appUrl,
  });
}

export function invitationText(
  fullName: string,
  email: string,
  password: string,
  appName: string,
  appUrl: string,
): string {
  return [
    `Halo ${fullName},`,
    "",
    `Akun Anda di ${appName} sudah aktif. Gunakan kredensial berikut untuk masuk:`,
    "",
    `Email    : ${email}`,
    `Password : ${password}`,
    "",
    `Login: ${appUrl}/login`,
    "",
    "Demi keamanan, ganti password Anda setelah login pertama melalui menu Profil.",
    "",
    "Email ini dikirim otomatis. Mohon tidak membalas.",
  ].join("\n");
}
