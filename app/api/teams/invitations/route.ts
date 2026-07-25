import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { adminSupabaseFetch } from "@/app/lib/server/admin";
import { canManageTeam } from "@/app/lib/server/teams";
import { RequestAuthError, requireRequestAuth } from "@/app/lib/server/supabaseRest";

export const runtime = "nodejs";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Votrio <onboarding@resend.dev>";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function GET(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const teamId = new URL(request.url).searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "Missing teamId." }, { status: 400 });
    if (!(await canManageTeam(accessToken, userId, teamId))) {
      return NextResponse.json({ error: "Only team admins can view invitations." }, { status: 403 });
    }
    const result = await adminSupabaseFetch(
      `team_invitations?team_id=eq.${encodeURIComponent(teamId)}&accepted_at=is.null&select=id,email,role,expires_at,created_at&order=created_at.desc`,
    );
    if (!result.ok) return NextResponse.json({ error: "Unable to load invitations." }, { status: 500 });
    return NextResponse.json({ invitations: await result.json() });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    const teamId = typeof body?.teamId === "string" ? body.teamId : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!teamId || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid invitation email." }, { status: 400 });
    }
    if (!(await canManageTeam(accessToken, userId, teamId))) {
      return NextResponse.json({ error: "Only team admins can invite members." }, { status: 403 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
    }

    const teamResponse = await adminSupabaseFetch(`teams?id=eq.${encodeURIComponent(teamId)}&select=name&limit=1`);
    const team = teamResponse.ok ? (await teamResponse.json())?.[0] : null;
    if (!team?.name) return NextResponse.json({ error: "Team not found." }, { status: 404 });

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const insertion = await adminSupabaseFetch("team_invitations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ team_id: teamId, inviter_id: userId, email, role: "member", token_hash: hashToken(token), expires_at: expiresAt }),
    });
    if (!insertion.ok) {
      const text = await insertion.text();
      return NextResponse.json(
        { error: /duplicate|23505/i.test(text) ? "A pending invitation already exists for this email." : "Unable to create the invitation." },
        { status: /duplicate|23505/i.test(text) ? 409 : 500 },
      );
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const inviteUrl = `${origin}/teams/invitations/accept?token=${encodeURIComponent(token)}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Join ${team.name} on Votrio`,
      html: `<div style="font-family:system-ui;background:#09090b;padding:32px;color:#fafafa"><div style="max-width:480px;margin:auto;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:28px"><p style="font-size:12px;color:#a1a1aa">VOTRIO TEAM INVITATION</p><h1 style="font-size:22px">Join ${escapeHtml(team.name)}</h1><p style="color:#a1a1aa;line-height:1.6">You were invited to collaborate on repositories, scans, and findings.</p><a href="${inviteUrl}" style="display:inline-block;margin-top:16px;background:#fafafa;color:#09090b;padding:11px 18px;border-radius:9px;text-decoration:none;font-weight:600">Accept invitation</a><p style="margin-top:20px;font-size:12px;color:#71717a">This link expires in 7 days and only works for ${escapeHtml(email)}.</p></div></div>`,
    });
    if (emailError) {
      const created = (await insertion.json())?.[0];
      if (created?.id) await adminSupabaseFetch(`team_invitations?id=eq.${created.id}`, { method: "DELETE" });
      return NextResponse.json({ error: "The invitation email could not be delivered." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, expiresAt });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { accessToken, userId } = requireRequestAuth(request);
    const body = await request.json().catch(() => ({}));
    const invitationId = typeof body?.invitationId === "string" ? body.invitationId : "";
    const lookup = await adminSupabaseFetch(`team_invitations?id=eq.${encodeURIComponent(invitationId)}&select=id,team_id&limit=1`);
    const invitation = lookup.ok ? (await lookup.json())?.[0] : null;
    if (!invitation) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    if (!(await canManageTeam(accessToken, userId, invitation.team_id))) {
      return NextResponse.json({ error: "Only team admins can revoke invitations." }, { status: 403 });
    }
    const deletion = await adminSupabaseFetch(`team_invitations?id=eq.${encodeURIComponent(invitationId)}`, { method: "DELETE" });
    if (!deletion.ok) return NextResponse.json({ error: "Unable to revoke invitation." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestAuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
