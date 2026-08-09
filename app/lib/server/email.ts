import { Resend } from "resend";

const DEFAULT_FROM_EMAIL = "Krythiq <notifications@krythiq.dev>";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function emailFrame(eyebrow: string, title: string, content: string) {
  return `<div style="margin:0;background:#09090b;padding:32px 16px;color:#fafafa;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="margin:auto;max-width:520px;border:1px solid #27272a;border-radius:16px;background:#18181b;padding:28px">
      <p style="margin:0 0 12px;color:#38bdf8;font-size:12px;font-weight:700;letter-spacing:.12em">${escapeHtml(eyebrow)}</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1>
      ${content}
      <p style="margin:24px 0 0;border-top:1px solid #27272a;padding-top:16px;color:#71717a;font-size:12px">Krythiq security intelligence · krythiq.dev</p>
    </div>
  </div>`;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendKrythiqEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is missing.");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
    replyTo: process.env.RESEND_REPLY_TO?.trim() || undefined,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
}) {
  const safeUrl = escapeHtml(options.resetUrl);
  return sendKrythiqEmail({
    to: options.to,
    subject: "Reset your Krythiq password",
    text: `Reset your Krythiq password: ${options.resetUrl}\n\nThis link expires shortly. If you did not request it, you can ignore this email.`,
    html: emailFrame(
      "PASSWORD RECOVERY",
      "Reset your password",
      `<p style="color:#d4d4d8;line-height:1.6">Use the secure link below to choose a new Krythiq password.</p>
       <a href="${safeUrl}" style="display:inline-block;margin-top:12px;border-radius:9px;background:#fafafa;padding:12px 18px;color:#09090b;font-weight:700;text-decoration:none">Choose a new password</a>
       <p style="margin-top:20px;color:#a1a1aa;font-size:13px;line-height:1.6">This link expires shortly. If you did not request a password reset, you can safely ignore this email.</p>`,
    ),
  });
}

export async function sendAuthLinkEmail(options: {
  to: string;
  actionUrl: string;
  kind: "signup" | "magiclink";
}) {
  const isSignup = options.kind === "signup";
  const title = isSignup ? "Confirm your email" : "Sign in to Krythiq";
  const button = isSignup ? "Confirm email address" : "Sign in securely";
  const description = isSignup
    ? "Confirm your email address to activate your Krythiq workspace."
    : "Use this one-time link to sign in to your Krythiq workspace.";
  return sendKrythiqEmail({
    to: options.to,
    subject: isSignup ? "Confirm your Krythiq account" : "Your Krythiq sign-in link",
    text: `${description}\n\n${options.actionUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: emailFrame(
      isSignup ? "CONFIRM SIGN UP" : "MAGIC LINK",
      title,
      `<p style="color:#d4d4d8;line-height:1.6">${description}</p>
       <a href="${escapeHtml(options.actionUrl)}" style="display:inline-block;margin-top:12px;border-radius:9px;background:#fafafa;padding:12px 18px;color:#09090b;font-weight:700;text-decoration:none">${button}</a>
       <p style="margin-top:20px;color:#a1a1aa;font-size:13px;line-height:1.6">This link is single-use and expires shortly. If you did not request it, you can safely ignore this email.</p>`,
    ),
  });
}

export async function sendScanCompletedEmail(options: {
  to: string;
  repoName: string;
  severity: string;
  issues: number;
  score: number;
  reportUrl: string;
}) {
  const safeReportUrl = escapeHtml(options.reportUrl);
  const severity = escapeHtml(options.severity);
  return sendKrythiqEmail({
    to: options.to,
    subject: `${options.repoName} scan completed · ${options.issues} finding${options.issues === 1 ? "" : "s"}`,
    text: `Krythiq finished scanning ${options.repoName}. Severity: ${options.severity}. Findings: ${options.issues}. Risk score: ${options.score}. Review: ${options.reportUrl}`,
    html: emailFrame(
      "SCAN COMPLETED",
      options.repoName,
      `<p style="color:#d4d4d8;line-height:1.6">Your repository scan is ready.</p>
       <div style="margin:18px 0;display:flex;gap:10px">
         <span style="border:1px solid #3f3f46;border-radius:8px;padding:9px 12px;color:#d4d4d8">Severity: <strong style="color:#fafafa;text-transform:capitalize">${severity}</strong></span>
         <span style="border:1px solid #3f3f46;border-radius:8px;padding:9px 12px;color:#d4d4d8">Findings: <strong style="color:#fafafa">${options.issues}</strong></span>
         <span style="border:1px solid #3f3f46;border-radius:8px;padding:9px 12px;color:#d4d4d8">Risk: <strong style="color:#fafafa">${options.score}</strong></span>
       </div>
       <a href="${safeReportUrl}" style="display:inline-block;margin-top:4px;border-radius:9px;background:#fafafa;padding:12px 18px;color:#09090b;font-weight:700;text-decoration:none">Review scan report</a>`,
    ),
  });
}

export async function sendNotificationEmail(options: {
  to: string;
  title: string;
  message: string;
  actionUrl?: string;
}) {
  const action = options.actionUrl
    ? `<a href="${escapeHtml(options.actionUrl)}" style="display:inline-block;margin-top:16px;border-radius:9px;background:#fafafa;padding:11px 18px;color:#09090b;font-weight:700;text-decoration:none">Open Krythiq</a>`
    : "";
  return sendKrythiqEmail({
    to: options.to,
    subject: options.title,
    text: `${options.message}${options.actionUrl ? `\n\nOpen Krythiq: ${options.actionUrl}` : ""}`,
    html: emailFrame("ACCOUNT UPDATE", options.title, `<p style="color:#d4d4d8;line-height:1.6">${escapeHtml(options.message)}</p>${action}`),
  });
}

export async function sendReferralEmail(options: {
  to: string;
  inviterName: string;
  referralUrl: string;
  optOutUrl: string;
  rewardAmount: number;
}) {
  const safeName = escapeHtml(options.inviterName);
  const safeReferralUrl = escapeHtml(options.referralUrl);
  const safeOptOutUrl = escapeHtml(options.optOutUrl);
  return sendKrythiqEmail({
    to: options.to,
    subject: `${options.inviterName} invited you to Krythiq`,
    text: `${options.inviterName} invited you to try Krythiq, an AI-assisted repository security workspace.\n\nCreate your account: ${options.referralUrl}\n\nAfter your first successful paid AI action, ${options.inviterName} earns ${options.rewardAmount} Tokens.\n\nStop referral emails: ${options.optOutUrl}`,
    html: emailFrame(
      "KRYTHIQ REFERRAL",
      `${safeName} invited you`,
      `<p style="color:#a1a1aa;line-height:1.7">Krythiq helps developers inspect repositories, understand security findings, and generate practical remediation guidance.</p>
       <a href="${safeReferralUrl}" style="display:inline-block;margin-top:18px;background:#fafafa;color:#09090b;padding:12px 20px;border-radius:9px;text-decoration:none;font-weight:700">Create your Krythiq account</a>
       <p style="margin-top:20px;color:#a1a1aa;font-size:13px;line-height:1.6">After you verify a new account and complete your first successful paid AI action, ${safeName} earns ${options.rewardAmount} Tokens. You are never required to make a purchase from this email.</p>
       <p style="margin-top:24px;font-size:11px;color:#71717a">Didn’t expect this invitation? <a href="${safeOptOutUrl}" style="color:#a1a1aa">Stop referral emails</a>.</p>`,
    ),
  });
}

export { emailFrame, escapeHtml };
