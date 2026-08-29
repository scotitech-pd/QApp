import nodemailer from "nodemailer";

import { appConfig } from "./core/config";

/* Transactional email over plain SMTP (Hostinger mailbox for the pilot).
 * If SMTP is not configured the mailer degrades to a no-op with a log line,
 * so development keeps working with on-screen reset previews. */

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass: password },
    fromName: process.env.SMTP_FROM_NAME ?? "OnQ"
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const config = smtpConfig();
  if (!config) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });
  }
  return transporter;
}

export function mailerConfigured() {
  return smtpConfig() !== null;
}

async function send(mail: MailInput) {
  const config = smtpConfig();
  const transport = getTransporter();
  if (!config || !transport) {
    console.log(`[mailer] SMTP not configured — skipped "${mail.subject}" to ${mail.to}`);
    return { sent: false as const };
  }
  try {
    await transport.sendMail({
      from: `"${config.fromName}" <${config.auth.user}>`,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    });
    console.log(`[mailer] sent "${mail.subject}" to ${mail.to}`);
    return { sent: true as const };
  } catch (error) {
    console.error(`[mailer] FAILED "${mail.subject}" to ${mail.to}:`, error instanceof Error ? error.message : error);
    return { sent: false as const };
  }
}

function shell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
      <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(160deg,#6B90B5,#47688D);"></div>
      <strong style="font-size:18px;color:#1D1F20;">OnQ</strong>
    </div>
    <div style="background:#FFFFFF;border-radius:14px;padding:26px 24px;box-shadow:0 1px 3px rgba(16,24,40,0.08);">
      <h1 style="margin:0 0 12px;font-size:20px;color:#1D1F20;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="color:#8A929C;font-size:12px;margin-top:16px;">OnQ · Scotitech Solutions · onq.scotitech.com</p>
  </div>
</body></html>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, expiresMinutes: number) {
  return send({
    to,
    subject: "Reset your OnQ password",
    text: `Reset your OnQ password: ${resetUrl}\n\nThis link expires in ${expiresMinutes} minutes. If you didn't ask for this, you can ignore this email.`,
    html: shell(
      "Reset your password",
      `<p style="color:#3A414B;font-size:14px;line-height:1.6;">Someone asked to reset the password for this OnQ account. If it was you, tap the button below — the link expires in <strong>${expiresMinutes} minutes</strong>.</p>
       <p style="margin:22px 0;"><a href="${resetUrl}" style="background:#5980A6;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block;">Choose a new password</a></p>
       <p style="color:#8A929C;font-size:12.5px;line-height:1.6;">If you didn't ask for this, ignore this email — your password stays unchanged.</p>`
    )
  });
}

export async function sendAdminSignupNotification(signup: { businessName: string; email: string; city?: string | null }) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) return { sent: false as const };
  const reviewUrl = `${appConfig.appBaseUrl}/admin/business-signups`;
  return send({
    to,
    subject: `New shop registration: ${signup.businessName}`,
    text: `${signup.businessName} (${signup.email}${signup.city ? ", " + signup.city : ""}) registered on OnQ and is waiting for approval: ${reviewUrl}`,
    html: shell(
      "New shop waiting for approval",
      `<p style="color:#3A414B;font-size:14px;line-height:1.6;"><strong>${signup.businessName}</strong>${signup.city ? ` · ${signup.city}` : ""}<br/>${signup.email}</p>
       <p style="margin:22px 0;"><a href="${reviewUrl}" style="background:#5980A6;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block;">Review and approve</a></p>`
    )
  });
}
