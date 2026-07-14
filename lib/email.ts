import { Resend } from "resend";
import { createTranslator } from "next-intl";
import frMessages from "@/messages/fr.json";
import enMessages from "@/messages/en.json";

const FROM = process.env.RESEND_FROM_EMAIL ?? "alerts@compliai.eu";

const CATALOG: Record<string, typeof frMessages> = { fr: frMessages, en: enMessages as typeof frMessages };

/** Traducteur d'emails hors contexte de requête (cron, webhook). */
function emailT(locale?: string | null) {
  const l = locale === "en" ? "en" : "fr";
  return createTranslator({ locale: l, messages: CATALOG[l], namespace: "Emails" });
}

type EmailTranslator = ReturnType<typeof emailT>;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// ─── Template helpers ─────────────────────────────────────────────────────────
function wrapEmail(title: string, body: string, et: EmailTranslator, locale?: string | null): string {
  const lang = locale === "en" ? "en" : "fr";
  return `<!DOCTYPE html>
<html lang="${lang}">
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
                ${et("footer")}
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits" style="color:#003399;">${et("manageCredits")}</a>
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

// ─── Email de bienvenue ────────────────────────────────────────────────────────
export async function sendWelcomeEmail({
  email,
  userName,
  locale,
}: {
  email: string;
  userName?: string;
  locale?: string | null;
}) {
  const et = emailT(locale);
  const displayName = userName ?? email.split("@")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.compliai.eu";

  const steps = [
    { n: "1", title: et("welcome.step1Title"), desc: et("welcome.step1Desc"), href: `${appUrl}/dashboard/chat` },
    { n: "2", title: et("welcome.step2Title"), desc: et("welcome.step2Desc"), href: `${appUrl}/dashboard/tools` },
    { n: "3", title: et("welcome.step3Title"), desc: et("welcome.step3Desc"), href: `${appUrl}/dashboard/tools/jurisprudence` },
  ];

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#111;font-weight:700;">
      ${et("welcome.heading")}
    </h2>
    <p style="color:#444;line-height:1.7;margin:0 0 20px;font-size:14px;">
      ${et("welcome.intro", { name: displayName })}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${steps
        .map(
          (step) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:32px;vertical-align:top;padding-top:2px;">
                <div style="width:24px;height:24px;background:#003399;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:700;">${step.n}</div>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#111;">${step.title}</p>
                <p style="margin:0 0 6px;font-size:12px;color:#666;">${step.desc}</p>
                <a href="${step.href}" style="font-size:12px;color:#003399;font-weight:600;text-decoration:none;">${et("welcome.stepStart")}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        )
        .join("")}
    </table>

    <div style="text-align:center;margin-top:8px;">
      <a href="${appUrl}/dashboard"
         style="display:inline-block;background:#003399;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">
        ${et("welcome.ctaAccess")}
      </a>
    </div>

    <p style="color:#888;font-size:12px;line-height:1.6;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;">
      ${et("welcome.help", { docs: `<a href="${appUrl}/docs" style="color:#003399;">${et("welcome.docsWord")}</a>` })}<br/>
      ${et("welcome.registeredWith", { email })}
    </p>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: et("welcome.subject"),
    html: wrapEmail(et("welcome.title"), body, et, locale),
  });
}

// ─── Alerte crédits bas ────────────────────────────────────────────────────────
export async function sendLowCreditsAlert({
  email,
  userName,
  balance,
  plan,
  threshold,
  locale,
}: {
  email: string;
  userName?: string;
  balance: number;
  plan: string;
  threshold: number;
  locale?: string | null;
}) {
  const et = emailT(locale);
  const nl = locale === "en" ? "en-US" : "fr-FR";
  const displayName = userName ?? email;
  const pct = Math.round((balance / threshold) * 100);

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111;font-weight:700;">
      ${et("lowCredits.heading")}
    </h2>
    <p style="color:#444;line-height:1.6;margin:0 0 20px;">
      ${et("lowCredits.intro", { name: displayName, balance: balance.toLocaleString(nl), plan, pct })}
    </p>

    <div style="background:#f1f5f9;border-radius:8px;height:10px;overflow:hidden;margin:0 0 24px;">
      <div style="background:#f59e0b;height:10px;width:${Math.min(pct, 100)}%;border-radius:8px;"></div>
    </div>

    <p style="color:#444;line-height:1.6;margin:0 0 24px;">
      ${et("lowCredits.body")}
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits"
       style="display:inline-block;background:#003399;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      ${et("lowCredits.cta")}
    </a>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: et("lowCredits.subject", { balance: balance.toLocaleString(nl) }),
    html: wrapEmail(et("lowCredits.title"), body, et, locale),
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
  locale,
}: {
  email: string;
  userName?: string;
  packName: string;
  credits: number;
  newBalance: number;
  amountPaidCents: number;
  locale?: string | null;
}) {
  const et = emailT(locale);
  const nl = locale === "en" ? "en-US" : "fr-FR";
  const displayName = userName ?? email;
  const amountFormatted = (amountPaidCents / 100).toLocaleString(nl, {
    style: "currency",
    currency: "EUR",
  });

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#111;font-weight:700;">
      ${et("creditPack.heading", { packName })}
    </h2>
    <p style="color:#444;line-height:1.6;margin:0 0 20px;">
      ${et("creditPack.intro", { name: displayName })}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
          <span style="color:#888;font-size:12px;">${et("creditPack.pack")}</span><br/>
          <strong style="color:#111;">${packName}</strong>
        </td>
        <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
          <span style="color:#888;font-size:12px;">${et("creditPack.amount")}</span><br/>
          <strong style="color:#111;">${amountFormatted}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <span style="color:#888;font-size:12px;">${et("creditPack.creditsAdded")}</span><br/>
          <strong style="color:#22c55e;">+${credits.toLocaleString(nl)} ${et("creditPack.creditsUnit")}</strong>
        </td>
        <td style="padding:16px 20px;text-align:right;">
          <span style="color:#888;font-size:12px;">${et("creditPack.newBalance")}</span><br/>
          <strong style="color:#003399;">${newBalance.toLocaleString(nl)} ${et("creditPack.creditsUnit")}</strong>
        </td>
      </tr>
    </table>

    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
       style="display:inline-block;background:#003399;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      ${et("creditPack.cta")}
    </a>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: et("creditPack.subject", { credits: credits.toLocaleString(nl) }),
    html: wrapEmail(et("creditPack.title"), body, et, locale),
  });
}

// ─── Reçu d'abonnement mensuel ────────────────────────────────────────────────
export async function sendSubscriptionReceipt({
  email,
  userName,
  amountPaidCents,
  periodStart,
  periodEnd,
  invoiceNumber,
  invoiceUrl,
  locale,
}: {
  email: string;
  userName?: string;
  amountPaidCents: number;
  periodStart: Date;
  periodEnd: Date;
  invoiceNumber?: string;
  invoiceUrl?: string;
  locale?: string | null;
}) {
  const et = emailT(locale);
  const nl = locale === "en" ? "en-US" : "fr-FR";
  const displayName = userName ?? email.split("@")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.compliai.eu";
  const amount = (amountPaidCents / 100).toLocaleString(nl, { style: "currency", currency: "EUR" });
  const fmt = (d: Date) => d.toLocaleDateString(nl, { day: "numeric", month: "long", year: "numeric" });

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;font-weight:700;">${et("receipt.heading")}</h2>
    <p style="color:#444;line-height:1.6;margin:0 0 20px;font-size:14px;">
      ${et("receipt.intro", { name: displayName })}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
          <span style="color:#888;font-size:12px;">${et("receipt.subscription")}</span><br/>
          <strong style="color:#111;">${et("receipt.planName")}</strong>
        </td>
        <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
          <span style="color:#888;font-size:12px;">${et("receipt.amountPaid")}</span><br/>
          <strong style="color:#003399;">${amount}</strong>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:16px 20px;${invoiceNumber ? "border-bottom:1px solid #e2e8f0;" : ""}">
          <span style="color:#888;font-size:12px;">${et("receipt.period")}</span><br/>
          <strong style="color:#111;">${fmt(periodStart)} → ${fmt(periodEnd)}</strong>
        </td>
      </tr>
      ${invoiceNumber ? `<tr><td colspan="2" style="padding:16px 20px;">
        <span style="color:#888;font-size:12px;">${et("receipt.invoiceNumber")}</span><br/>
        <strong style="color:#111;">${invoiceNumber}</strong>
      </td></tr>` : ""}
    </table>

    <div style="text-align:center;">
      ${invoiceUrl ? `<a href="${invoiceUrl}" style="display:inline-block;background:#003399;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-right:8px;">${et("receipt.download")}</a>` : ""}
      <a href="${appUrl}/dashboard/credits" style="display:inline-block;color:#003399;font-weight:600;font-size:14px;padding:12px 8px;text-decoration:none;">${et("receipt.manage")}</a>
    </div>

    <p style="color:#888;font-size:12px;line-height:1.6;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;">
      ${et("receipt.sentTo", { email })}
    </p>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: et("receipt.subject", { amount }),
    html: wrapEmail(et("receipt.title"), body, et, locale),
  });
}

// ─── Rappel de renouvellement (J-7 / J-1) ─────────────────────────────────────
export async function sendRenewalReminder({
  email,
  userName,
  daysBefore,
  renewalDate,
  amountCents,
  locale,
}: {
  email: string;
  userName?: string;
  daysBefore: 7 | 1;
  renewalDate: Date;
  amountCents: number;
  locale?: string | null;
}) {
  const et = emailT(locale);
  const nl = locale === "en" ? "en-US" : "fr-FR";
  const displayName = userName ?? email.split("@")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.compliai.eu";
  const amount = (amountCents / 100).toLocaleString(nl, { style: "currency", currency: "EUR" });
  const dateStr = renewalDate.toLocaleDateString(nl, { day: "numeric", month: "long", year: "numeric" });
  const heading = daysBefore === 1 ? et("renewal.headingTomorrow") : et("renewal.headingDays", { days: daysBefore });

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;font-weight:700;">
      ${heading}
    </h2>
    <p style="color:#444;line-height:1.7;margin:0 0 20px;font-size:14px;">
      ${et("renewal.intro", { name: displayName, date: dateStr, amount })}
    </p>

    <p style="color:#444;line-height:1.7;margin:0 0 24px;font-size:14px;">
      ${et("renewal.body")}
    </p>

    <div style="text-align:center;">
      <a href="${appUrl}/dashboard/credits" style="display:inline-block;background:#003399;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
        ${et("renewal.cta")}
      </a>
    </div>

    <p style="color:#888;font-size:12px;line-height:1.6;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;">
      ${et("renewal.footer", { email })}
    </p>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: daysBefore === 1 ? et("renewal.subjectTomorrow") : et("renewal.subjectDays", { days: daysBefore }),
    html: wrapEmail(et("renewal.title"), body, et, locale),
  });
}

// ─── Réengagement inactivité (J+14 / J+30) ────────────────────────────────────
export async function sendReengagement({
  email,
  userName,
  daysInactive,
  locale,
}: {
  email: string;
  userName?: string;
  daysInactive: 14 | 30;
  locale?: string | null;
}) {
  const et = emailT(locale);
  const displayName = userName ?? email.split("@")[0];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.compliai.eu";

  const heading = daysInactive === 14 ? et("reengagement.heading14") : et("reengagement.heading30");
  const intro = daysInactive === 14 ? et("reengagement.intro14") : et("reengagement.intro30");

  const links = [
    { t: et("reengagement.link1"), h: `${appUrl}/dashboard/chat` },
    { t: et("reengagement.link2"), h: `${appUrl}/dashboard/tools` },
  ];

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111;font-weight:700;">${heading}</h2>
    <p style="color:#444;line-height:1.7;margin:0 0 20px;font-size:14px;">
      ${et("reengagement.greeting", { name: displayName })}<br/><br/>${intro}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${links.map((row) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
        <a href="${row.h}" style="color:#003399;font-size:14px;font-weight:600;text-decoration:none;">${row.t}</a>
      </td></tr>`).join("")}
    </table>

    <div style="text-align:center;">
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#003399;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
        ${et("reengagement.cta")}
      </a>
    </div>

    <p style="color:#888;font-size:12px;line-height:1.6;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;">
      ${et("reengagement.footer", { email, space: `<a href="${appUrl}/dashboard/settings" style="color:#003399;">${et("reengagement.spaceWord")}</a>` })}
    </p>
  `;

  const resend = getResend();
  if (!resend) return null;
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: heading,
    html: wrapEmail(et("reengagement.title"), body, et, locale),
  });
}
