import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

export type NotifyTemplateKey =
  | "checklist_approved"
  | "checklist_rejected"
  | "evidence_submitted"
  | "baseline_submitted"
  | "project_invitation";

export type NotifyPayload = {
  user_id: string;
  template_key: NotifyTemplateKey;
  channel: "in_app" | "email" | "whatsapp";
  payload: Record<string, unknown>;
};

const TEMPLATES: Record<
  NotifyTemplateKey,
  (p: Record<string, unknown>) => { subject: string; html: string; inAppText: string }
> = {
  checklist_approved: (p) => ({
    subject: `✓ Checklist disetujui: ${p.checklist_title}`,
    inAppText: `${p.checklist_title} di topik ${p.topik_name} telah disetujui Atourin.`,
    html: `<p>Halo,</p><p>Checklist <b>${p.checklist_title}</b> di topik <b>${p.topik_name}</b> sudah disetujui oleh tim Atourin. 🎉</p>`,
  }),
  checklist_rejected: (p) => ({
    subject: `Perlu revisi: ${p.checklist_title}`,
    inAppText: `${p.checklist_title} perlu direvisi. ${p.note ?? ""}`,
    html: `<p>Halo,</p><p>Checklist <b>${p.checklist_title}</b> perlu direvisi.</p><p><b>Feedback Atourin:</b> ${p.note ?? "—"}</p>`,
  }),
  evidence_submitted: (p) => ({
    subject: `Evidence baru di ${p.desa_name}`,
    inAppText: `Evidence baru dari ${p.desa_name} (${p.topik_name}) menunggu review.`,
    html: `<p>Peserta di <b>${p.desa_name}</b> mengirim evidence baru di topik <b>${p.topik_name}</b>.</p>`,
  }),
  baseline_submitted: (p) => ({
    subject: `Baseline desa ${p.desa_name} disubmit`,
    inAppText: `Baseline desa ${p.desa_name} telah disubmit.`,
    html: `<p>Baseline desa <b>${p.desa_name}</b> telah disubmit oleh peserta.</p>`,
  }),
  project_invitation: (p) => ({
    subject: `Anda diundang ke ${p.project_name}`,
    inAppText: `Anda diundang ke project ${p.project_name}.`,
    html: `<p>Anda telah ditambahkan ke project <b>${p.project_name}</b> di Village Milestone Tracker.</p>`,
  }),
};

// =====================================================
// notify() — fire-and-forget. Always writes the in_app row;
// best-effort sends email via Resend when configured.
// Never throws — failures are logged + persisted on the row.
// =====================================================
export async function notify(input: NotifyPayload): Promise<void> {
  const admin = createAdminClient();
  const tpl = TEMPLATES[input.template_key](input.payload);
  const payload = { ...input.payload, _rendered: tpl };

  // Always write an in_app row (status pending or sent)
  await admin.from("notifications").insert({
    user_id: input.user_id,
    channel: input.channel,
    template_key: input.template_key,
    payload,
    status: "pending",
  });

  if (input.channel === "in_app") return; // nothing else to deliver

  // Look up user contact + email-flag
  const { data: user } = await admin
    .from("users")
    .select("email, email_artificial, phone")
    .eq("id", input.user_id)
    .maybeSingle();
  const u = user as {
    email: string | null;
    email_artificial: boolean;
    phone: string | null;
  } | null;
  if (!u) return;

  // EMAIL channel — via Google Workspace SMTP (nodemailer)
  if (input.channel === "email") {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
    const fromName = process.env.SMTP_FROM_NAME ?? "Atourin Milestone Tracker";

    if (!smtpUser || !smtpPass || !fromEmail || !u.email || u.email_artificial) {
      await markPending(input, "smtp creds or recipient email missing");
      return;
    }
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: (process.env.SMTP_SECURE ?? "true") === "true",
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: u.email,
        subject: tpl.subject,
        html: tpl.html,
      });
      await markSent(input);
    } catch (e) {
      await markFailed(input, (e as Error).message);
    }
    return;
  }

  // WHATSAPP channel (Fonnte)
  if (input.channel === "whatsapp") {
    const token = process.env.FONNTE_API_TOKEN;
    if (!token || !u.phone) {
      await markPending(input, "fonnte token/phone missing");
      return;
    }
    try {
      const body = new URLSearchParams({
        target: u.phone,
        message: `*${tpl.subject}*\n\n${tpl.inAppText}`,
        countryCode: "62",
      });
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`Fonnte HTTP ${res.status}`);
      await markSent(input);
    } catch (e) {
      await markFailed(input, (e as Error).message);
    }
    return;
  }
}

async function markSent(input: NotifyPayload) {
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("user_id", input.user_id)
    .eq("template_key", input.template_key)
    .order("created_at", { ascending: false })
    .limit(1);
}

async function markFailed(input: NotifyPayload, err: string) {
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ status: "failed", error: err })
    .eq("user_id", input.user_id)
    .eq("template_key", input.template_key)
    .order("created_at", { ascending: false })
    .limit(1);
}

async function markPending(_input: NotifyPayload, _reason: string) {
  // Already pending by default; reason kept in log for now.
  return;
}
