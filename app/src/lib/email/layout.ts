// =====================================================
// Shell email transaksional VMT.
//
// Prinsip agar masuk INBOX/Primary (bukan Promotions/Updates/Spam):
// - Layout berbasis <table> + CSS inline (kompatibel semua klien email).
// - Nyaris tanpa gambar (rasio teks tinggi); brand pakai wordmark teks,
//   bukan hero image -> menghindari kategori Promotions di Gmail.
// - Satu CTA tunggal, nada transaksional, tanpa kata promo/diskon.
// - Ada preheader tersembunyi + versi plaintext (sinyal kuat ke inbox).
// - Font system stack (tanpa webfont eksternal) -> ringan & konsisten.
// Domain pengirim di-verifikasi di Resend (SPF/DKIM) untuk otentikasi.
// =====================================================

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND = {
  purple: "#7c3aed",
  btn: "#7068d5",
  ink: "#0f172a",
  muted: "#64748b",
  bg: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  soft: "#f8fafc",
};

type Cta = { label: string; url: string };

/**
 * Bungkus konten (contentHtml) dengan header + footer responsif.
 * contentHtml sudah berupa HTML aman (dirakit pemanggil, sudah di-escape
 * di bagian yang berasal dari input pengguna).
 */
export function emailShell(opts: {
  preheader: string;
  contentHtml: string;
  cta?: Cta;
  appName?: string;
  /** Basis URL untuk aset logo (default dari NEXT_PUBLIC_APP_URL). */
  appUrl?: string;
}): string {
  const appName = opts.appName ?? "Village Milestone Tracker";
  const year = "2026";
  const base = (opts.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  // Logo PNG (klien email tidak render SVG). Kalau base URL kosong, jatuh ke
  // wordmark teks agar tidak ada gambar rusak.
  const logoImg = base
    ? `<img src="${base}/logo/vmt/vmt-app-icon-192.png" width="38" height="38" alt="VMT" style="display:block; border:0; border-radius:9px;">`
    : "";
  const headerInner = base
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:12px; vertical-align:middle;">${logoImg}</td>
                  <td style="vertical-align:middle; font-size:18px; font-weight:800; letter-spacing:-0.3px; color:${BRAND.purple};">
                    VMT<span style="color:${BRAND.muted}; font-weight:600; font-size:13px;">&nbsp;by Atourin</span>
                  </td>
                </tr>
              </table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:19px; font-weight:800; letter-spacing:-0.3px; color:${BRAND.purple};">
                    VMT<span style="color:${BRAND.muted}; font-weight:600; font-size:13px;">&nbsp;by Atourin</span>
                  </td>
                </tr>
              </table>`;

  const ctaHtml = opts.cta
    ? `
      <tr>
        <td style="padding: 8px 0 4px 0;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${opts.cta.url}" style="height:46px;v-text-anchor:middle;width:280px;" arcsize="18%" strokecolor="${BRAND.btn}" fillcolor="${BRAND.btn}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(opts.cta.label)}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${opts.cta.url}" style="display:inline-block; background:${BRAND.btn}; color:#ffffff; font-size:15px; font-weight:bold; text-decoration:none; padding:13px 28px; border-radius:10px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${escapeHtml(opts.cta.label)}</a>
          <!--<![endif]-->
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="id" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(appName)}</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @media only screen and (max-width: 600px) {
    .vmt-card { width: 100% !important; border-radius: 0 !important; }
    .vmt-pad { padding: 24px 20px !important; }
    .vmt-cta a { display: block !important; text-align: center !important; }
  }
  a { color: ${BRAND.purple}; }
</style>
</head>
<body style="margin:0; padding:0; background:${BRAND.bg}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:${BRAND.bg};">
    ${escapeHtml(opts.preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" class="vmt-card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:${BRAND.card}; border:1px solid ${BRAND.border}; border-radius:16px; overflow:hidden;">
          <!-- header -->
          <tr>
            <td class="vmt-pad" style="padding:24px 32px 0 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              ${headerInner}
            </td>
          </tr>
          <!-- content -->
          <tr>
            <td class="vmt-pad" style="padding:20px 32px 28px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:${BRAND.ink}; font-size:15px; line-height:1.6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="vmt-cta">
                ${opts.contentHtml}
                ${ctaHtml}
              </table>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding:18px 32px 26px 32px; border-top:1px solid ${BRAND.border}; background:${BRAND.soft}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <p style="margin:0; color:${BRAND.muted}; font-size:12px; line-height:1.6;">
                Email ini dikirim otomatis oleh ${escapeHtml(appName)}. Mohon tidak membalas email ini.
              </p>
              <p style="margin:6px 0 0 0; color:${BRAND.muted}; font-size:12px; line-height:1.6;">
                &copy; ${year} Atourin
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Paragraf konten standar (untuk dirakit ke contentHtml). */
export function p(html: string): string {
  return `<tr><td style="padding:0 0 14px 0;">${html}</td></tr>`;
}

/** Judul di dalam kartu. */
export function h1(text: string): string {
  return `<tr><td style="padding:0 0 12px 0; font-size:20px; font-weight:800; letter-spacing:-0.3px; line-height:1.3; color:#0f172a;">${escapeHtml(
    text,
  )}</td></tr>`;
}
