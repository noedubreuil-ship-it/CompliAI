import { EU_STANDARD_FETCH_DOMAINS, EU27 } from "@/lib/data/eu27-registry";

/** Hôtes européens transversaux (EUR-Lex, CURIA…) pour le code pays réservé `EU` (pas un État membre du registre). */
export function isEuInstitutionalHostnameAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  for (const d of EU_STANDARD_FETCH_DOMAINS) {
    const dl = d.toLowerCase();
    if (h === dl || h.endsWith(`.${dl}`)) return true;
  }
  return false;
}

/** Vérifie qu’un hôte HTTPS est sur la liste blanche du pays (+ domaines UE institutionnels partagés). */
export function isNationalFetchHostnameAllowed(hostname: string, countryCode: string): boolean {
  const h = hostname.toLowerCase();
  const upper = countryCode.trim().toUpperCase();
  if (upper === "EU") return isEuInstitutionalHostnameAllowed(h);
  const row = EU27[upper];
  if (!row) return false;
  const domains = [
    ...EU_STANDARD_FETCH_DOMAINS.map((d) => d.toLowerCase()),
    ...row.allowed_domains.map((d) => d.toLowerCase()),
  ];
  for (const d of domains) {
    if (h === d || h.endsWith(`.${d}`)) return true;
  }
  return false;
}
