import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@compliai.eu";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { firmName, contactName, email, website, city, countries, specializations, description } = body;

  if (!firmName || !contactName || !email || !description) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  // Send notification email to admin
  try {
    await resend.emails.send({
      from: "CompliAI <noreply@compliai.eu>",
      to: [ADMIN_EMAIL],
      subject: `[CompliAI] Nouvelle demande d'inscription annuaire : ${firmName}`,
      html: `
        <h2>Nouvelle demande d'inscription à l'annuaire avocats</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Cabinet</td><td style="padding:6px 12px;border:1px solid #eee">${firmName}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Contact</td><td style="padding:6px 12px;border:1px solid #eee">${contactName}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Email</td><td style="padding:6px 12px;border:1px solid #eee"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Site web</td><td style="padding:6px 12px;border:1px solid #eee">${website || "–"}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Ville</td><td style="padding:6px 12px;border:1px solid #eee">${city || "–"}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Pays</td><td style="padding:6px 12px;border:1px solid #eee">${countries || "–"}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Spécialités</td><td style="padding:6px 12px;border:1px solid #eee">${specializations || "–"}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Description</td><td style="padding:6px 12px;border:1px solid #eee">${description}</td></tr>
          <tr><td style="padding:6px 12px;background:#f8f8f8;font-weight:bold;border:1px solid #eee">Utilisateur CompliAI</td><td style="padding:6px 12px;border:1px solid #eee">${user.email} (${user.id})</td></tr>
        </table>
        <p style="margin-top:16px;font-size:12px;color:#666">Envoyé depuis CompliAI — annuaire avocats.</p>
      `,
    });
  } catch (emailError) {
    console.error("[listing-request] email error:", emailError);
    // Don't fail the request if email fails — log only
  }

  // Send confirmation to submitter
  try {
    await resend.emails.send({
      from: "CompliAI <noreply@compliai.eu>",
      to: [email],
      subject: "CompliAI — Votre demande d'inscription a bien été reçue",
      html: `
        <p>Bonjour ${contactName},</p>
        <p>Nous avons bien reçu votre demande d'inscription du cabinet <strong>${firmName}</strong> à l'annuaire CompliAI des avocats spécialisés en droit du numérique européen.</p>
        <p>Notre équipe va examiner votre demande et reviendra vers vous sous <strong>48 heures ouvrées</strong>.</p>
        <p>Cordialement,<br/>L'équipe CompliAI</p>
      `,
    });
  } catch {
    // Ignore confirmation email errors
  }

  return NextResponse.json({ ok: true });
}
