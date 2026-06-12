/**
 * Analyse heuristique rapide d'une page web publique (sans exécution JS).
 * À utiliser comme aide à la conformité, pas comme audit juridique.
 */
import { NextResponse } from "next/server";

const BLOCK_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal"];

function isBlockedHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (BLOCK_HOSTS.includes(h)) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  return false;
}

export async function POST(request: Request) {
  const { url } = await request.json().catch(() => ({}));
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url requis" }, { status: 400 });
  }

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(u.protocol)) {
    return NextResponse.json({ error: "Seuls http(s) sont autorisés" }, { status: 400 });
  }
  if (isBlockedHost(u.hostname)) {
    return NextResponse.json({ error: "Cette cible n'est pas accessible pour des raisons de sécurité." }, { status: 403 });
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12000);

  let html = "";
  try {
    const res = await fetch(u.toString(), {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: { "User-Agent": "CompliAI-ComplianceScanner/1.0 (+https://compliai.eu)" },
    });
    html = await res.text();
    if (html.length > 800_000) html = html.slice(0, 800_000);
  } catch (e) {
    clearTimeout(t);
    return NextResponse.json({ error: `Impossible de récupérer la page : ${String(e)}` }, { status: 502 });
  }
  clearTimeout(t);

  const lower = html.toLowerCase();
  const findings: { id: string; label: string; status: "ok" | "warn" | "info"; detail: string }[] = [];

  findings.push({
    id: "legal-mentions",
    label: "Mentions légales / politique de confidentialité",
    status: lower.includes("mentions légales") || lower.includes("mentions legales") || lower.includes("privacy policy") || lower.includes("politique de confidentialité") ? "ok" : "warn",
    detail:
      lower.includes("privacy") || lower.includes("confidential")
        ? "Lien ou texte de politique probablement présent."
        : "Impossible de détecter automatiquement des mentions légales ou une politique de confidentialité évidentes.",
  });

  findings.push({
    id: "cookies",
    label: "Bandeau / gestion cookies",
    status: lower.includes("cookie") && (lower.includes("consent") || lower.includes("tarteaucitron") || lower.includes("onetrust") || lower.includes("cookiebot"))
      ? "ok"
      : lower.includes("cookie")
        ? "info"
        : "warn",
    detail:
      lower.includes("cookie")
        ? "Références aux cookies présentes dans le HTML — vérifiez le mécanisme de consentement RGPD/ePrivacy."
        : "Aucune référence évidente aux cookies dans le HTML statique.",
  });

  findings.push({
    id: "https",
    label: "Protocole",
    status: u.protocol === "https:" ? "ok" : "warn",
    detail: u.protocol === "https:" ? "Page servie en HTTPS." : "Préférez HTTPS pour les données personnelles.",
  });

  findings.push({
    id: "ai-disclosure",
    label: "Transparence usage IA",
    status: /\bai\b|\bintelig artificial|chatgpt|openai|\bassistant\b|\bgenerative\b/i.test(lower) ? "info" : "warn",
    detail:
      "Indiquez aux utilisateurs quand une interaction est assistée ou générée par une IA lorsque pertinent (obligation littératie IA / transparence).",
  });

  const score = Math.round(
    (findings.filter((f) => f.status === "ok").length / findings.length) * 100
  );

  return NextResponse.json({
    url: u.toString(),
    score_hint: score,
    findings,
    scanned_bytes: html.length,
  });
}
