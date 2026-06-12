/**
 * Structure du registre CompliAI — UE-27 (données / IA / harmonisation nationale).
 * Repère officiel uniquement orientation + métadonnées ; le texte juridique faisant foi
 * est celui publié sur les portails indiqués.
 */

export type Nis2TransposeStatus = "transposed" | "pending" | "partial";

export interface Eu27Nis2 {
  status: Nis2TransposeStatus;
  law_title?: string;
  date?: string;
  portal_url?: string;
  notes?: string;
}

export type Eu27AiActDesignation = "designated" | "pending" | "partial";

export interface Eu27AiActAuthority {
  status: Eu27AiActDesignation;
  name?: string;
  notes?: string;
}

export interface Eu27GdprImplementingLaw {
  title: string;
  reference: string;
  year: number;
  portal_url: string;
  /** Lien consolidé lorsqu’une URL stable est disponible ; ne remplace pas le portail officiel. */
  fetch_url?: string;
  key_articles: string[];
}

export interface Eu27DpaAuthority {
  name: string;
  acronym: string;
  url: string;
  decisions_url: string;
  /** Langues principales des publications (RFC / usage interne affichage). */
  language: string;
}

export interface EU27Country {
  code: string;
  name_fr: string;
  name_local: string;

  dpa: Eu27DpaAuthority;

  gdpr_law: Eu27GdprImplementingLaw;

  nis2: Eu27Nis2;

  ai_act_authority: Eu27AiActAuthority;

  detection_keywords: string[];

  /** Domaines depuis lesquels un futur fetch « niveau 3 » peut être autorisé (contrôle liste blanche). */
  allowed_domains: string[];
}
