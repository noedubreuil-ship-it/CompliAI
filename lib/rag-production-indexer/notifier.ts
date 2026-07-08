/**
 * notifier.ts — Email de rapport post-indexation RAG.
 *
 * Envoie un récapitulatif au mainteneur après chaque batch d'indexation :
 * - X chunks insérés, Y mis à jour, Z ignorés, N erreurs
 * - Durée totale, invalidations cache
 * - Bouton vers l'interface admin de validation
 *
 * Un seul email par batch (pas de spam).
 * Si RESEND_API_KEY ou RAG_NOTIFY_EMAIL sont absents → pas d'envoi (silencieux).
 */

import { Resend } from "resend";
import { IndexationResult } from "./types";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export async function sendIndexationReport(
  results: IndexationResult[],
  cacheInvalidated: number
): Promise<void> {
  const resend = getResend();
  const notifyEmail = process.env.RAG_NOTIFY_EMAIL;
  if (!resend || !notifyEmail) return;

  const from = process.env.RESEND_FROM_EMAIL ?? "alerts@compliai.eu";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.compliai.eu";

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors, 0);
  const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);
  const docsCount = results.length;

  const hasErrors = totalErrors > 0;
  const emoji = hasErrors ? "⚠️" : totalInserted + totalUpdated > 0 ? "✅" : "ℹ️";

  const docRows = results.map((r) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;font-family:monospace;color:#555;">${r.documentId.slice(0, 8)}…</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;color:#22c55e;">${r.inserted}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;color:#3b82f6;">${r.updated}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;color:#888;">${r.skipped}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;color:${r.errors > 0 ? "#ef4444" : "#888"};">${r.errors}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:12px;color:#888;">${formatDuration(r.durationMs)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><title>Rapport indexation RAG</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#003399;padding:24px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;">Compli<span style="opacity:0.8">AI</span></span>
              <span style="color:#ffffff;opacity:0.6;margin-left:8px;font-size:14px;">· Rapport d'indexation RAG</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 4px;font-size:20px;color:#111;font-weight:700;">
                ${emoji} Indexation RAG — ${new Date().toLocaleDateString("fr-FR")}
              </h2>
              <p style="color:#666;font-size:13px;margin:0 0 24px;">
                ${docsCount} document${docsCount > 1 ? "s" : ""} traité${docsCount > 1 ? "s" : ""} en ${formatDuration(totalDuration)}
              </p>

              <!-- Résumé chiffres -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;border-right:1px solid #e2e8f0;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#22c55e;">${totalInserted}</div>
                    <div style="font-size:12px;color:#666;margin-top:4px;">Insérés</div>
                  </td>
                  <td style="padding:16px 20px;border-right:1px solid #e2e8f0;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#3b82f6;">${totalUpdated}</div>
                    <div style="font-size:12px;color:#666;margin-top:4px;">Mis à jour</div>
                  </td>
                  <td style="padding:16px 20px;border-right:1px solid #e2e8f0;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#888;">${totalSkipped}</div>
                    <div style="font-size:12px;color:#666;margin-top:4px;">Ignorés</div>
                  </td>
                  <td style="padding:16px 20px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:${totalErrors > 0 ? "#ef4444" : "#888"};">${totalErrors}</div>
                    <div style="font-size:12px;color:#666;margin-top:4px;">Erreurs</div>
                  </td>
                </tr>
              </table>

              <!-- Cache -->
              <p style="font-size:13px;color:#444;margin:0 0 20px;">
                🗂 Cache sémantique : <strong>${cacheInvalidated}</strong> entrée${cacheInvalidated > 1 ? "s" : ""} invalidée${cacheInvalidated > 1 ? "s" : ""}
                (seuil similarité cosinus ≥ 0.85)
              </p>

              <!-- Détail par document -->
              ${docsCount > 1 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:0 0 24px;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Document</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Insérés</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">MàJ</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Ignorés</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Erreurs</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Durée</th>
                  </tr>
                </thead>
                <tbody>${docRows}</tbody>
              </table>` : ""}

              ${hasErrors ? `
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
                <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">⚠️ Des erreurs ont été détectées</p>
                <p style="margin:4px 0 0;font-size:12px;color:#991b1b;">
                  Consultez les logs du pipeline et l'interface d'administration pour les détails.
                </p>
              </div>` : ""}

              <a href="${appUrl}/dashboard/admin/rag-validation"
                 style="display:inline-block;background:#003399;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Ouvrir l'interface admin →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#aaa;">
                CompliAI · Pipeline RAG automatique ·
                <a href="${appUrl}/dashboard/admin/rag-validation" style="color:#003399;">Validation admin</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from,
    to: notifyEmail,
    subject: `${emoji} RAG — ${totalInserted + totalUpdated} chunk${totalInserted + totalUpdated > 1 ? "s" : ""} indexé${totalInserted + totalUpdated > 1 ? "s" : ""} (${docsCount} doc${docsCount > 1 ? "s" : ""})`,
    html,
  });
}
