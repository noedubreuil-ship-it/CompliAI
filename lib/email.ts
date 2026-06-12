import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "alerts@compliai.eu";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ─── Template helpers ─────────────────────────────────────────────────────────
function wrapEmail(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#003399;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                Compli<span style="opacity:0.8">AI</span>
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#aaa;">
                CompliAI · Conformité IA pour les entreprises ·
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits" style="color:#003399;">Gérer mes crédits</a>
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

// ─── Alerte crédits bas ────────────────────────────────────────────────────────
export async function sendLowCreditsAlert({
  email,
  userName,
  balance,
  plan,
  threshold,
}: {
  email: string;
  userName?: string;
  balance: number;
  plan: string;
  threshold: number;
}) {
  const displayName = userName ?? email;
  const pct = Math.round((balance / threshold) * 100);

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111;font-weight:700;">
      ⚡ Vos crédits IA sont presque épuisés
    </h2>
    <p style="color:#444;line-height:1.6;margin:0 0 20px;">
      Bonjour ${displayName},<br/>
      Il vous reste <strong style="color:#f59e0b;">${balance.toLocaleString("fr-FR")} crédits</strong>
      sur votre plan <strong>${plan}</strong> — soit ${pct}% du seuil d'alerte.
    </p>

    <!-- Barre de progression -->
    <div style="background:#f1f5f9;border-radius:8px;height:10px;overflow:hidden;margin:0 0 24px;">
      <div style="background:#f59e0b;height:10px;width:${Math.min(pct, 100)}%;border-radius:8px;"></div>
    </div>

    <p style="color:#444;line-height:1.6;margin:0 0 24px;">
      Rechargez votre compte pour continuer à utiliser le consultant IA, les audits et tous les outils de conformité sans interruption.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits"
       style="display:inline-block;background:#003399;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Acheter des crédits →
    </a>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `⚡ ${balance.toLocaleString("fr-FR")} crédits restants — Rechargez votre compte CompliAI`,
    html: wrapEmail("Crédits IA bas", body),
  });
}

// ─── Confirmation d'achat d'un pack ───────────────────────────────────────────
export async function sendCreditPackConfirmation({
  email,
  userName,
  packName,
  credits,
  newBalance,
  amountPaidCents,
}: {
  email: string;
  userName?: string;
  packName: string;
  credits: number;
  newBalance: number;
  amountPaidCents: number;
}) {
  const displayName = userName ?? email;
  const amountFormatted = (amountPaidCents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111;font-weight:700;">
      ✅ Paiement confirmé — ${packName}
    </h2>
    <p style="color:#444;line-height:1.6;margin:0 0 20px;">
      Bonjour ${displayName}, votre achat a bien été pris en compte.
    </p>

    <!-- Récap -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
          <span style="color:#888;font-size:12px;">Pack acheté</span><br/>
          <strong style="color:#111;">${packName}</strong>
        </td>
        <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
          <span style="color:#888;font-size:12px;">Montant</span><br/>
          <strong style="color:#111;">${amountFormatted}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <span style="color:#888;font-size:12px;">Crédits ajoutés</span><br/>
          <strong style="color:#22c55e;">+${credits.toLocaleString("fr-FR")} crédits</strong>
        </td>
        <td style="padding:16px 20px;text-align:right;">
          <span style="color:#888;font-size:12px;">Nouveau solde</span><br/>
          <strong style="color:#003399;">${newBalance.toLocaleString("fr-FR")} crédits</strong>
        </td>
      </tr>
    </table>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
       style="display:inline-block;background:#003399;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Retour au tableau de bord →
    </a>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `✅ ${credits.toLocaleString("fr-FR")} crédits ajoutés à votre compte CompliAI`,
    html: wrapEmail("Achat de crédits confirmé", body),
  });
}
