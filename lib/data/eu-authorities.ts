export interface EUAuthority {
  id: string;
  name: string;           // Short name / acronym
  fullName: string;       // Full official name
  country: string;        // Country name
  countryCode: string;    // ISO 3166-1 alpha-2
  type: "DPA" | "Court" | "EU Institution" | "Regulatory Body";
  website: string;
  language: string;       // Primary language
}

export const EU_AUTHORITIES: EUAuthority[] = [
  // ─── Pan-EU institutions ───────────────────────────────────────────────────
  { id: "edpb", name: "EDPB", fullName: "European Data Protection Board", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://edpb.europa.eu", language: "EN" },
  { id: "edps", name: "EDPS", fullName: "Contrôleur Européen de la Protection des Données", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://edps.europa.eu", language: "FR/EN" },
  { id: "ai-office", name: "AI Office", fullName: "Bureau de l'IA — Commission Européenne", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://digital-strategy.ec.europa.eu/en/policies/ai-office", language: "FR/EN" },
  { id: "cjue", name: "CJUE", fullName: "Cour de Justice de l'Union Européenne", country: "Union Européenne", countryCode: "EU", type: "Court", website: "https://curia.europa.eu", language: "FR" },
  { id: "commission", name: "Commission EU", fullName: "Commission Européenne", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://commission.europa.eu/index_fr", language: "FR/EN" },
  { id: "parlement-eu", name: "Parlement EU", fullName: "Parlement Européen", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://www.europarl.europa.eu/portal/fr", language: "FR/EN" },
  { id: "european-council", name: "Conseil européen", fullName: "Conseil européen (European Council)", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://www.consilium.europa.eu/fr/european-council/", language: "FR/EN" },
  { id: "coe", name: "Conseil de l'Europe", fullName: "Conseil de l'Europe (Council of Europe)", country: "Europe (46 États)", countryCode: "EU", type: "EU Institution", website: "https://www.coe.int", language: "FR/EN" },
  { id: "eca", name: "Cour des comptes EU", fullName: "Cour des comptes européenne (ECA)", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://www.eca.europa.eu/fr", language: "FR/EN" },
  { id: "eesc", name: "CESE", fullName: "Comité économique et social européen", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://www.eesc.europa.eu/fr", language: "FR/EN" },
  { id: "cor", name: "CdR", fullName: "Comité européen des régions", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://www.cor.europa.eu/fr", language: "FR/EN" },
  { id: "ombudsman-eu", name: "Médiateur EU", fullName: "Médiateur européen", country: "Union Européenne", countryCode: "EU", type: "EU Institution", website: "https://www.ombudsman.europa.eu/fr", language: "FR/EN" },
  { id: "ecb", name: "BCE", fullName: "Banque Centrale Européenne", country: "Union Européenne", countryCode: "EU", type: "Regulatory Body", website: "https://www.ecb.europa.eu", language: "FR/EN" },

  // ─── France ────────────────────────────────────────────────────────────────
  { id: "cnil", name: "CNIL", fullName: "Commission Nationale de l'Informatique et des Libertés", country: "France", countryCode: "FR", type: "DPA", website: "https://www.cnil.fr", language: "FR" },
  { id: "ce-fr", name: "Conseil d'État", fullName: "Conseil d'État (France)", country: "France", countryCode: "FR", type: "Court", website: "https://www.conseil-etat.fr", language: "FR" },
  { id: "anssi", name: "ANSSI", fullName: "Agence Nationale de la Sécurité des Systèmes d'Information", country: "France", countryCode: "FR", type: "Regulatory Body", website: "https://www.ssi.gouv.fr", language: "FR" },

  // ─── Allemagne ─────────────────────────────────────────────────────────────
  { id: "bfdi", name: "BfDI", fullName: "Bundesbeauftragter für den Datenschutz und die Informationsfreiheit", country: "Allemagne", countryCode: "DE", type: "DPA", website: "https://www.bfdi.bund.de", language: "DE" },
  { id: "lda-bayern", name: "LDA Bayern", fullName: "Bayerisches Landesamt für Datenschutzaufsicht", country: "Allemagne", countryCode: "DE", type: "DPA", website: "https://www.lda.bayern.de", language: "DE" },
  { id: "ldi-nrw", name: "LDI NRW", fullName: "Landesbeauftragte für Datenschutz und Informationsfreiheit NRW", country: "Allemagne", countryCode: "DE", type: "DPA", website: "https://www.ldi.nrw.de", language: "DE" },

  // ─── Irlande ───────────────────────────────────────────────────────────────
  { id: "dpc", name: "DPC", fullName: "Data Protection Commission (Ireland)", country: "Irlande", countryCode: "IE", type: "DPA", website: "https://www.dataprotection.ie", language: "EN" },

  // ─── Italie ────────────────────────────────────────────────────────────────
  { id: "garante", name: "Garante", fullName: "Garante per la protezione dei dati personali", country: "Italie", countryCode: "IT", type: "DPA", website: "https://www.garanteprivacy.it", language: "IT" },

  // ─── Espagne ───────────────────────────────────────────────────────────────
  { id: "aepd", name: "AEPD", fullName: "Agencia Española de Protección de Datos", country: "Espagne", countryCode: "ES", type: "DPA", website: "https://www.aepd.es", language: "ES" },

  // ─── Pays-Bas ──────────────────────────────────────────────────────────────
  { id: "ap", name: "AP", fullName: "Autoriteit Persoonsgegevens", country: "Pays-Bas", countryCode: "NL", type: "DPA", website: "https://autoriteitpersoonsgegevens.nl", language: "NL" },

  // ─── Belgique ──────────────────────────────────────────────────────────────
  { id: "apd", name: "APD/GBA", fullName: "Autorité de Protection des Données / Gegevensbeschermingsautoriteit", country: "Belgique", countryCode: "BE", type: "DPA", website: "https://www.autoriteprotectiondonnees.be", language: "FR/NL" },

  // ─── Suède ─────────────────────────────────────────────────────────────────
  { id: "imy", name: "IMY", fullName: "Integritetsskyddsmyndigheten", country: "Suède", countryCode: "SE", type: "DPA", website: "https://www.imy.se", language: "SV" },

  // ─── Danemark ──────────────────────────────────────────────────────────────
  { id: "datatilsynet-dk", name: "Datatilsynet (DK)", fullName: "Datatilsynet — Danemark", country: "Danemark", countryCode: "DK", type: "DPA", website: "https://www.datatilsynet.dk", language: "DA" },

  // ─── Norvège (EEE) ─────────────────────────────────────────────────────────
  { id: "datatilsynet-no", name: "Datatilsynet (NO)", fullName: "Datatilsynet — Norvège", country: "Norvège", countryCode: "NO", type: "DPA", website: "https://www.datatilsynet.no", language: "NO" },

  // ─── Finlande ──────────────────────────────────────────────────────────────
  { id: "tsa", name: "TSA", fullName: "Tietosuojavaltuutetun toimisto", country: "Finlande", countryCode: "FI", type: "DPA", website: "https://tietosuoja.fi", language: "FI" },

  // ─── Autriche ──────────────────────────────────────────────────────────────
  { id: "dsb", name: "DSB", fullName: "Datenschutzbehörde", country: "Autriche", countryCode: "AT", type: "DPA", website: "https://www.dsb.gv.at", language: "DE" },

  // ─── Portugal ──────────────────────────────────────────────────────────────
  { id: "cnpd-pt", name: "CNPD (PT)", fullName: "Comissão Nacional de Proteção de Dados", country: "Portugal", countryCode: "PT", type: "DPA", website: "https://www.cnpd.pt", language: "PT" },

  // ─── Luxembourg ────────────────────────────────────────────────────────────
  { id: "cnpd-lu", name: "CNPD (LU)", fullName: "Commission Nationale pour la Protection des Données", country: "Luxembourg", countryCode: "LU", type: "DPA", website: "https://cnpd.public.lu", language: "FR" },

  // ─── Pologne ───────────────────────────────────────────────────────────────
  { id: "uodo", name: "UODO", fullName: "Urząd Ochrony Danych Osobowych", country: "Pologne", countryCode: "PL", type: "DPA", website: "https://uodo.gov.pl", language: "PL" },

  // ─── Tchéquie ──────────────────────────────────────────────────────────────
  { id: "uoou", name: "ÚOOÚ", fullName: "Úřad pro ochranu osobních údajů", country: "Tchéquie", countryCode: "CZ", type: "DPA", website: "https://www.uoou.cz", language: "CS" },

  // ─── Roumanie ──────────────────────────────────────────────────────────────
  { id: "anspdcp", name: "ANSPDCP", fullName: "Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal", country: "Roumanie", countryCode: "RO", type: "DPA", website: "https://www.dataprotection.ro", language: "RO" },

  // ─── Grèce ─────────────────────────────────────────────────────────────────
  { id: "hdpa", name: "HDPA", fullName: "Hellenic Data Protection Authority", country: "Grèce", countryCode: "GR", type: "DPA", website: "https://www.dpa.gr", language: "EL" },

  // ─── Hongrie ───────────────────────────────────────────────────────────────
  { id: "naih", name: "NAIH", fullName: "Nemzeti Adatvédelmi és Információszabadság Hatóság", country: "Hongrie", countryCode: "HU", type: "DPA", website: "https://www.naih.hu", language: "HU" },

  // ─── Slovaquie ─────────────────────────────────────────────────────────────
  { id: "uoou-sk", name: "ÚOOÚ (SK)", fullName: "Úrad na ochranu osobných údajov SR", country: "Slovaquie", countryCode: "SK", type: "DPA", website: "https://dataprotection.gov.sk", language: "SK" },

  // ─── Slovénie ──────────────────────────────────────────────────────────────
  { id: "ip-si", name: "IP (SI)", fullName: "Informacijski pooblaščenec", country: "Slovénie", countryCode: "SI", type: "DPA", website: "https://www.ip-rs.si", language: "SL" },

  // ─── Croatie ───────────────────────────────────────────────────────────────
  { id: "azop", name: "AZOP", fullName: "Agencija za zaštitu osobnih podataka", country: "Croatie", countryCode: "HR", type: "DPA", website: "https://azop.hr", language: "HR" },

  // ─── Bulgarie ──────────────────────────────────────────────────────────────
  { id: "cpdp", name: "CPDP", fullName: "Commission for Personal Data Protection", country: "Bulgarie", countryCode: "BG", type: "DPA", website: "https://www.cpdp.bg", language: "BG" },

  // ─── Estonie ───────────────────────────────────────────────────────────────
  { id: "aki", name: "AKI", fullName: "Andmekaitse Inspektsioon", country: "Estonie", countryCode: "EE", type: "DPA", website: "https://www.aki.ee", language: "ET" },

  // ─── Lettonie ──────────────────────────────────────────────────────────────
  { id: "dvi", name: "DVI", fullName: "Datu valsts inspekcija", country: "Lettonie", countryCode: "LV", type: "DPA", website: "https://www.dvi.gov.lv", language: "LV" },

  // ─── Lituanie ──────────────────────────────────────────────────────────────
  { id: "vdai", name: "VDAI", fullName: "Valstybinė duomenų apsaugos inspekcija", country: "Lituanie", countryCode: "LT", type: "DPA", website: "https://vdai.lrv.lt", language: "LT" },

  // ─── Chypre ────────────────────────────────────────────────────────────────
  { id: "ocpd", name: "OCPD", fullName: "Office of the Commissioner for Personal Data Protection", country: "Chypre", countryCode: "CY", type: "DPA", website: "https://www.dataprotection.gov.cy", language: "EL/EN" },

  // ─── Malte ─────────────────────────────────────────────────────────────────
  { id: "idpc", name: "IDPC", fullName: "Information and Data Protection Commissioner", country: "Malte", countryCode: "MT", type: "DPA", website: "https://idpc.org.mt", language: "MT/EN" },
];

// Map from source string to authority ID (for existing articles)
export const SOURCE_TO_AUTHORITY: Record<string, string> = {
  "CNIL": "cnil",
  "Commission Européenne": "commission",
  "AI Office — Commission Européenne": "ai-office",
  "European Data Protection Board (EDPB)": "edpb",
  "Cour de Justice de l'Union Européenne (CJUE)": "cjue",
  "Cour de Justice de l'Union Européenne": "cjue",
  "ANSSI — Agence Nationale Sécurité SI": "anssi",
  "Journal Officiel de l'UE": "commission",
  "Journal Officiel de l'UE — EIOPA/EBA/ESMA": "commission",
  "CEN/CENELEC": "commission",
  "Commission Européenne — DG CONNECT": "commission",
  "Commission Européenne — Discours présidentiel": "commission",
  "Conseil d'État — France": "ce-fr",
  "Garante Privacy (Italie)": "garante",
  "DPC Irlande": "dpc",
  "BfDI — Allemagne": "bfdi",
  "AP — Pays-Bas": "ap",
  "AEPD — Espagne": "aepd",
  "APD — Belgique": "apd",
  "IMY — Suède": "imy",
  "UODO — Pologne": "uodo",
  "EDPS": "edps",
  "Conseil européen": "european-council",
  "Conseil de l'Europe": "coe",
  "Conseil de l'Europe (CoE)": "coe",
  "Parlement Européen": "parlement-eu",
  "Cour des comptes européenne": "eca",
  "Cour des comptes EU": "eca",
  "ECA": "eca",
  "CESE": "eesc",
  "Comité économique et social européen (CESE)": "eesc",
  "CdR": "cor",
  "Comité européen des régions": "cor",
  "Médiateur européen": "ombudsman-eu",
  "BCE": "ecb",
  "Banque Centrale Européenne (BCE)": "ecb",
};

export function getAuthorityById(id: string): EUAuthority | undefined {
  return EU_AUTHORITIES.find(a => a.id === id);
}

export function getCountryFlag(countryCode: string): string {
  if (countryCode === "EU") return "🇪🇺";
  const codePoints = countryCode.toUpperCase().split("").map(c => 0x1F1E0 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
