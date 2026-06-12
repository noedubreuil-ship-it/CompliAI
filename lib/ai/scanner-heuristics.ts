/**
 * Analyse heuristique locale du HTML pour le scanner page web (bêta).
 * Complète le prompt IA ; ne remplace pas un audit humain.
 */

export type HeuristicSeverity = "high" | "medium" | "low" | "info";

export interface TrackerHit {
  id: string;
  label: string;
  severity: HeuristicSeverity;
  evidence: string;
}

export interface ScannerHeuristicResult {
  source_label: string;
  html_char_count: number;
  spa_likely: boolean;
  cmp: { detected: boolean; hints: string[] };
  trackers: TrackerHit[];
  forms: {
    form_count: number;
    input_count: number;
    has_checkbox: boolean;
    prechecked_marketing_checkbox_suspected: boolean;
  };
  transparency: {
    legal_mentions_link_or_text: boolean;
    privacy_link_or_text: boolean;
    cgv_or_terms_link_or_text: boolean;
    dpo_email_pattern: boolean;
    policy_last_updated_text: boolean;
  };
  third_party_domains: { domain: string; category: string; note: string }[];
  mixed_http_in_https_page: boolean;
  page_protocol_if_url: "https" | "http" | "unknown";
  html_lang_present: boolean;
  html_lang_value: string | null;
  images_total_approx: number;
  images_missing_alt_approx: number;
  robots_noindex: boolean;
  chatbot_widgets: string[];
  raw_excerpt_note: string;
}

const CMP_PATTERNS: { re: RegExp; name: string }[] = [
  { re: /axeptio|axept\.io/i, name: "Axeptio" },
  { re: /tarteaucitron/i, name: "Tarteaucitron" },
  { re: /onetrust/i, name: "OneTrust" },
  { re: /cookiebot|cookielaw\.org/i, name: "Cookiebot" },
  { re: /didomi|didomi\.io/i, name: "Didomi" },
  { re: /usercentrics/i, name: "Usercentrics" },
  { re: /truste|trustarc/i, name: "TrustArc" },
  { re: /osano\.com|\"osano\"/i, name: "Osano" },
  { re: /iubenda/i, name: "Iubenda" },
];

const TRACKERS: { id: string; label: string; severity: HeuristicSeverity; re: RegExp }[] = [
  { id: "ga4", label: "Google Analytics / gtag / GA4", severity: "high", re: /gtag\(|googletagmanager\.com\/gtag|G-[A-Z0-9]{6,}|google-analytics\.com\/analytics\.js/i },
  { id: "ua", label: "Google Analytics (UA legacy)", severity: "high", re: /UA-\d{4,10}-\d{1,4}|analytics\.js|ga\(\s*['\"]send/i },
  { id: "gtm", label: "Google Tag Manager", severity: "high", re: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i },
  { id: "meta", label: "Meta / Facebook Pixel", severity: "high", re: /fbevents\.js|connect\.facebook\.net|fbq\s*\(|facebook-pixel/i },
  { id: "linkedin", label: "LinkedIn Insight", severity: "medium", re: /snap\.licdn\.com|linkedin\.com\/px|_linkedin_partner_id/i },
  { id: "hotjar", label: "Hotjar", severity: "medium", re: /hotjar\.com|_hjSettings|hjid/i },
  { id: "clarity", label: "Microsoft Clarity", severity: "medium", re: /clarity\.ms|clarity\(/i },
  { id: "tiktok", label: "TikTok Pixel", severity: "medium", re: /analytics\.tiktok\.com/i },
  { id: "doubleclick", label: "DoubleClick / Ads", severity: "high", re: /doubleclick\.net|googlesyndication\.com/i },
  { id: "criteo", label: "Criteo", severity: "medium", re: /criteo\.com|criteo_q/i },
  { id: "adnxs", label: "AppNexus / Xandr", severity: "medium", re: /adnxs\.com/i },
];

const THIRD_PARTY: { re: RegExp; domain: string; category: string; note: string }[] = [
  { re: /fonts\.googleapis\.com|fonts\.gstatic\.com/i, domain: "fonts.googleapis.com / gstatic", category: "Google Fonts", note: "Transfert IP possible — CNIL 2022 (self-host possible)" },
  { re: /google\.com\/recaptcha|grecaptcha|recaptcha/i, domain: "Google reCAPTCHA", category: "Captcha", note: "Données vers Google — à documenter" },
  { re: /youtube\.com|youtu\.be/i, domain: "YouTube", category: "Vidéo embed", note: "Transfert vers Google" },
  { re: /player\.vimeo\.com/i, domain: "Vimeo", category: "Vidéo embed", note: "Tiers USA possible" },
  { re: /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/i, domain: "CDN public", category: "CDN", note: "Dépend du fournisseur" },
  { re: /maps\.googleapis\.com|static\.mapbox\.com|leafletjs\.com/i, domain: "Cartographie", category: "Maps", note: "Tiers" },
];

const CHATBOT: { re: RegExp; name: string }[] = [
  { re: /intercom\.io|intercomSettings/i, name: "Intercom" },
  { re: /drift\.com|driftt\.com|drift\.js/i, name: "Drift" },
  { re: /crisp\.chat|CRISP_WEBSITE_ID/i, name: "Crisp" },
  { re: /zendesk|zopim/i, name: "Zendesk Chat" },
  { re: /tidio\.com/i, name: "Tidio" },
  { re: /hs-scripts\.com|hs-script-loader|hubspot.*chat/i, name: "HubSpot" },
];

export function runScannerHeuristics(html: string, ctx: { source_label: string; pageUrl?: string }): ScannerHeuristicResult {
  const lower = html.toLowerCase();
  const htmlLen = html.length;

  let protocol: "https" | "http" | "unknown" = "unknown";
  if (ctx.pageUrl) {
    try {
      const p = new URL(ctx.pageUrl).protocol;
      protocol = p === "https:" ? "https" : p === "http:" ? "http" : "unknown";
    } catch {
      protocol = "unknown";
    }
  }

  // SPA heuristique
  const spaLikely =
    htmlLen < 12_000 && (/<div[^>]+id=["']root["']/i.test(html) || /id=["']__next["']/i.test(html) || /ng-app=/i.test(html));

  const cmpHints: string[] = [];
  for (const { re, name } of CMP_PATTERNS) {
    if (re.test(html)) cmpHints.push(name);
  }
  if (/cookie|consent|gdpr|rgpd|cmp|tcf|iab/i.test(lower) && cmpHints.length === 0) {
    cmpHints.push("Mots-clés cookies/consentement dans le HTML (CMP non reconnue)");
  }

  const trackers: TrackerHit[] = [];
  const seen = new Set<string>();
  for (const t of TRACKERS) {
    if (t.re.test(html) && !seen.has(t.id)) {
      seen.add(t.id);
      trackers.push({ id: t.id, label: t.label, severity: t.severity, evidence: `Motif ${t.id} détecté dans le HTML` });
    }
  }

  const formCount = (html.match(/<form[\s>]/gi) || []).length;
  const inputCount = (html.match(/<input[\s>]/gi) || []).length;
  const hasCheckbox = /<input[^>]+type=["']checkbox["']/i.test(html);
  const prechecked = /<input[^>]+type=["']checkbox["'][^>]*checked/i.test(html);

  const transparency = {
    legal_mentions_link_or_text:
      /mentions[\s_-]*l[ée]gales|legal-notice|mentions-legales|informations[\s_-]*l[ée]gales/i.test(lower),
    privacy_link_or_text:
      /politique[\s_-]*de[\s_-]*confidentialit|privacy-policy|politique-confidentialit|donn[eé]es[\s_-]*personnelles|vie[\s_-]*priv[eée]|\/rgpd|\bcnil\b/i.test(
        lower
      ),
    cgv_or_terms_link_or_text:
      /conditions[\s_-]*g[ée]n[ée]rales|\bcgu\b|\bcgv\b|terms[\s_-]*of[\s_]service|terms-and-conditions/i.test(lower),
    dpo_email_pattern:
      /dpo@|dpd@|donnees-personnelles@|d[ée]l[ée]gu[ée][\s_-][àa][\s_-]la[\s_-]protection|data protection officer/i.test(
        lower
      ),
    policy_last_updated_text: /mise[\s_-]*à[\s_-]*jour|derni[èe]re[\s_-]r[ée]vision|last updated|mis[èe] à jour le/i.test(lower),
  };

  const thirdSeen = new Set<string>();
  const third_party_domains: { domain: string; category: string; note: string }[] = [];
  for (const row of THIRD_PARTY) {
    if (row.re.test(html)) {
      const key = row.domain;
      if (!thirdSeen.has(key)) {
        thirdSeen.add(key);
        third_party_domains.push({ domain: row.domain, category: row.category, note: row.note });
      }
    }
  }

  const srcUrls = collectSrcHrefs(html).slice(0, 200);
  for (const u of srcUrls) {
    try {
      const host = new URL(u).hostname.replace(/^www\./, "");
      if (!thirdSeen.has(host) && !/localhost/i.test(host)) {
        third_party_domains.push({
          domain: host,
          category: "Ressource externe",
          note: "Script/iframe/lien tiers — vérifier finalité et transferts",
        });
        thirdSeen.add(host);
      }
    } catch {
      /* ignore */
    }
  }

  let mixed = false;
  if (protocol === "https") {
    mixed = /src=["']http:\/\//i.test(html) || /href=["']http:\/\//i.test(html);
  }

  const langMatch = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let missingAlt = 0;
  for (const tag of imgTags) {
    if (!/\balt=/.test(tag)) missingAlt++;
    else if (/alt=["']["']/.test(tag)) missingAlt++;
  }

  const chatbot_widgets: string[] = [];
  const cs = new Set<string>();
  for (const { re, name } of CHATBOT) {
    if (re.test(html) && !cs.has(name)) {
      cs.add(name);
      chatbot_widgets.push(name);
    }
  }
  if (/\bchatbot\b|chat-widget|virtual-assistant/i.test(lower)) chatbot_widgets.push("Mot-clé chatbot/widget générique");

  const robots_noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);

  const raw_excerpt_note =
    htmlLen > 80_000 ? "HTML tronqué côté serveur pour l’analyse — certains scripts peuvent manquer." : "";

  return {
    source_label: ctx.source_label,
    html_char_count: htmlLen,
    spa_likely: spaLikely,
    cmp: { detected: cmpHints.length > 0, hints: cmpHints.slice(0, 12) },
    trackers,
    forms: {
      form_count: formCount,
      input_count: inputCount,
      has_checkbox: hasCheckbox,
      prechecked_marketing_checkbox_suspected: prechecked,
    },
    transparency,
    third_party_domains: third_party_domains.slice(0, 40),
    mixed_http_in_https_page: mixed,
    page_protocol_if_url: protocol,
    html_lang_present: Boolean(langMatch),
    html_lang_value: langMatch?.[1] ?? null,
    images_total_approx: imgTags.length,
    images_missing_alt_approx: missingAlt,
    robots_noindex: robots_noindex,
    chatbot_widgets,
    raw_excerpt_note,
  };
}

function collectSrcHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /(?:src|href)=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/^https?:\/\//i.test(u)) out.push(u);
  }
  return out;
}
