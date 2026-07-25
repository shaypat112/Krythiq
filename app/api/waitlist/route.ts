import { NextResponse } from "next/server";
import { Resend } from "resend";

// Required: set in your .env — you said this is already in place.
// Optional: RESEND_FROM_EMAIL — must be an address on a domain you've verified
// in Resend. Until you verify a domain, Resend's shared "onboarding@resend.dev"
// sender works, but will only deliver to the email address on your own Resend
// account — fine for testing, not for real signups.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Votrio <onboarding@resend.dev>";

// Optional: if set, you'll also get a notification email for every signup.
const NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function confirmationEmailHtml(email: string) {
  const safeEmail = escapeHtml(email);
  return `
  <div style="font-family: ui-monospace, monospace; background:#0a0c10; padding:32px; color:#e7e9ee;">
    <div style="max-width:420px; margin:0 auto; border:1px solid #262b34; border-radius:16px; padding:28px; background:#14171d;">
      <p style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#8c93a3; margin:0 0 16px;">Votrio</p>
      <h1 style="font-size:20px; margin:0 0 12px; color:#e7e9ee;">You're on the waitlist</h1>
      <p style="font-size:14px; line-height:1.6; color:#8c93a3; margin:0 0 20px;">
        Thanks for signing up with <span style="color:#e7e9ee;">${safeEmail}</span>.
        We're onboarding engineering teams in small batches — we'll email you
        as soon as a spot opens up.
      </p>
      <p style="font-size:12px; color:#8c93a3; margin:0;">— The Votrio team</p>
    </div>
  </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable. Please try again shortly." },
      { status: 500 },
    );
  }

  let email: string | undefined;
  let business = "";
  let name = "";
  let teamSize = "";
  let message = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
    business = typeof body?.business === "string" ? body.business.trim().slice(0, 120) : "";
    name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : "";
    teamSize = typeof body?.teamSize === "string" ? body.teamSize.trim().slice(0, 40) : "";
    message = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const isTeamAccessRequest = Boolean(business || name || teamSize || message);

  if (isTeamAccessRequest && (!business || !name)) {
    return NextResponse.json({ error: "Enter your name and business name." }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You're on the Votrio waitlist",
      html: confirmationEmailHtml(email),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Couldn't send confirmation email. Please try again." },
        { status: 502 },
      );
    }

    if (NOTIFY_EMAIL) {
      const notificationHtml = isTeamAccessRequest
        ? `<div style="font-family: ui-monospace, monospace;"><p>${escapeHtml(name)} from ${escapeHtml(business)} requested Votrio team access.</p><p>Email: ${escapeHtml(email)}<br/>Team size: ${escapeHtml(teamSize || "Not provided")}</p><p>${escapeHtml(message || "No message provided")}</p></div>`
        : `<div style="font-family: ui-monospace, monospace;"><p>New Votrio waitlist signup.</p><p>Email: ${escapeHtml(email)}</p></div>`;

      // Fire-and-forget — don't block or fail the signup if this errors.
      resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: isTeamAccessRequest
          ? "New Votrio team access request"
          : "New Votrio waitlist signup",
        html: notificationHtml,
      }).catch((err) => console.error("Failed to send admin notification:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist signup failed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again in a moment." },
      { status: 502 },
    );
  }
}
