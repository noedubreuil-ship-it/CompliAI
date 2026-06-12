export type SourceCategory =
  | "Institutions EU officielles"
  | "Suivi AI Act"
  | "Autorités de protection des données"
  | "Juridictions & droit"
  | "Cabinets & académique"
  | "Régulateurs sectoriels"
  | "Cybersécurité & numérique";

export interface LegalSource {
  id: string;
  name: string;
  category: SourceCategory;
  description: string;
  url: string;
  rssUrl?: string;
  country?: string;
  type:
    | "officiel"
    | "tracker"
    | "académique"
    | "cabinet"
    | "régulateur"
    | "juridiction"
    | "dpa";
  tags: string[];
}
