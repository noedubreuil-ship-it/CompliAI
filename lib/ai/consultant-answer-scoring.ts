/**
 * Scoring automatisable des réponses consultant — source unique de vérité.
 *
 * Réutilisé par :
 *  - `consultant-quality-regression.test.ts` (hermétique, sur fixtures) ;
 *  - `consultant-syllogism-live.test.ts` (opt-in, sur sortie LIVE du modèle).
 *
 * Ne dépend d'aucun module serveur : importable depuis un test comme depuis un
 * script `tsx`.
 */

export interface AnswerScore {
  pass: boolean;
  failures: string[];
}

/** Question de régression — DPO externalisé PME + transfert USA. */
export const DPO_EXTERNALISED_QUESTION =
  "Nous recrutons un DPO externalisé pour une PME de 80 salariés qui traite des données de santé via un logiciel RH hébergé aux États-Unis. Quelles sont nos obligations RGPD (base légale, contrat, transfert hors UE) et quels risques si nous ne le faisons pas ?";

/** Question de régression produit (présélection CV / AI Act). */
export const CV_PRESELECTION_QUESTION =
  "Notre entreprise développe un logiciel de présélection de CV qui attribue un score aux candidats à partir de leur expérience et de leurs compétences, mais c'est toujours un recruteur humain qui prend la décision finale d'embauche. Sommes-nous concernés par l'AI Act ? Si oui, quelles sont nos obligations principales et à quelle échéance ?";

/** Question de régime : responsabilité civile IA vs sanction administrative (différenciation des branches). */
export const AI_LIABILITY_QUESTION =
  "Un de nos clients a subi un préjudice financier à cause d'une recommandation erronée produite par notre système d'IA de scoring. Peut-il engager notre responsabilité, et sur quel fondement ? Est-ce distinct d'une éventuelle sanction de l'autorité de contrôle ?";

export interface ConsultantTrapQuestion {
  id: string;
  question: string;
  scorer: (answer: string) => AnswerScore;
}

export const CONSULTANT_TRAP_QUESTIONS: ConsultantTrapQuestion[] = [
  { id: "DPO", question: DPO_EXTERNALISED_QUESTION, scorer: scoreConsultantDpoRegressionAnswer },
  { id: "CV", question: CV_PRESELECTION_QUESTION, scorer: scoreConsultantCvRegressionAnswer },
  { id: "LIABILITY", question: AI_LIABILITY_QUESTION, scorer: scoreConsultantLiabilityAnswer },
];

export function scoreConsultantDpoRegressionAnswer(answer: string): AnswerScore {
  const failures: string[] = [];
  const a = answer.toLowerCase();

  if (/dpo.*obligatoire|désignation.*obligatoire.*dpo/i.test(answer) && !/probablement pas|pas automatiquement|à clarifier|selon les critères|wp243|grande échelle/i.test(a)) {
    failures.push("dpo_mandatory_without_qualification");
  }
  if (!/article\s*28|art\.\s*28|sous-traitant|contrat/i.test(a)) {
    failures.push("missing_processor_contract");
  }
  if (!/transfert|pays tiers|article\s*44|article\s*46|schrems|clauses contractuelles/i.test(a)) {
    failures.push("missing_transfer_analysis");
  }
  if (/base de veille de compliai|référence registre compliai|cache auto|urn:complai/i.test(answer)) {
    failures.push("metadata_leak");
  }
  if (/jurisprudence applicable/i.test(answer)) {
    failures.push("repeated_jurisprudence_header");
  }

  return { pass: failures.length === 0, failures };
}

/** Critères automatisables sur une réponse consultant (matcher post-génération). */
export function scoreConsultantCvRegressionAnswer(answer: string): AnswerScore {
  const failures: string[] = [];
  const a = answer.toLowerCase();

  if (!/2\s*ao[ûu]t\s*2026|2\/08\/2026|02\.08\.2026/.test(a)) {
    failures.push("missing_deadline_2026_08_02");
  }
  if (/élaborée par compliai|produite par compliai/i.test(answer)) {
    failures.push("brand_signature_leak");
  }
  if (/jurisprudence applicable/i.test(answer)) {
    failures.push("repeated_jurisprudence_header");
  }
  if (/orange rom[aâ]nia/i.test(a) && /article\s*13|art\.\s*13/i.test(a)) {
    failures.push("forbidden_orange_romania_analogy");
  }
  if (/(discord|san-cnil)/i.test(a) && /article\s*15|art\.\s*15/i.test(a)) {
    failures.push("forbidden_discord_cnil_analogy");
  }
  if (/volker und markus schecke|schecke.*c-92\/09|c-92\/09.*schecke/i.test(a)) {
    failures.push("forbidden_schecke_citation");
  }
  const scheckeHits = (answer.match(/schecke|c-92\/09|c-93\/09/gi) ?? []).length;
  if (scheckeHits > 1) {
    failures.push("duplicate_schecke_citation");
  }
  if (/kommission.*c\.\s*allemagne|c-100\/13.*dispositifs médicaux/i.test(a)) {
    failures.push("forbidden_kommission_medical_devices");
  }
  if (/\bbdsg\b|\bzvop-2\b|\bslovénie\b.*zakon|\ballemagne\b.*§\s*26/i.test(a) && !/précisez votre juridiction|juridiction de déploiement/i.test(a)) {
    failures.push("unsolicited_national_law_development");
  }
  if (/^#{0,3}\s*[IVXLC]+\.\s/m.test(answer) || /\nI\.\sQUALIFICATION/i.test(answer)) {
    failures.push("roman_numeral_structure");
  }

  return { pass: failures.length === 0, failures };
}

/**
 * Question de responsabilité : la réponse doit DISTINGUER la branche civile
 * (réparation, art. 82 RGPD / Directive (UE) 2024/2853) du régime administratif
 * (sanction de l'autorité). C'est le test de différenciation des branches.
 */
export function scoreConsultantLiabilityAnswer(answer: string): AnswerScore {
  const failures: string[] = [];
  const a = answer.toLowerCase();

  if (!/responsabilité civile|réparation|dommages|préjudice réparable|article\s*82|art\.\s*82|2024\/2853/i.test(a)) {
    failures.push("missing_civil_liability_regime");
  }
  if (!/sanction administrative|autorité de contrôle|amende|article\s*83|art\.\s*83|article\s*99|art\.\s*99/i.test(a)) {
    failures.push("missing_administrative_regime");
  }
  if (!/distinct|indépendamment|cumul|se cumule|deux régimes|ne se confond/i.test(a)) {
    failures.push("regimes_not_differentiated");
  }
  if (/jurisprudence applicable/i.test(answer)) {
    failures.push("repeated_jurisprudence_header");
  }

  return { pass: failures.length === 0, failures };
}

/**
 * Scorer transverse de STRUCTURE SYLLOGISTIQUE — applicable à toute réponse
 * consultant, indépendamment du thème. Vérifie que le raisonnement présente
 * les marqueurs d'un syllogisme juridique en prose conclusion-first.
 */
export function scoreSyllogismStructure(answer: string): AnswerScore {
  const failures: string[] = [];
  const a = answer.toLowerCase();
  // Fenêtre de tête SANS le titre markdown éventuel (« # … »), qui est du
  // boilerplate et repousse la vraie première phrase hors de la fenêtre.
  const head = answer.replace(/^\s*#{1,6}[^\n]*\n+/, "").slice(0, 600).toLowerCase();

  // Conclusion en tête (pyramide inversée) : un marqueur de qualification OU de
  // réponse directe doit apparaître dans les premières lignes. Les verbes
  // couvrent aussi le registre de la responsabilité (peut engager, réparation).
  if (
    !/(relève|constitue|n'est pas|est tenu|est susceptible|peut engager|engage (votre|sa)|est responsable|réparation|sur le fondement|probablement|oui,|non,|conclusion|en l'état|qualifi)/i.test(
      head
    )
  ) {
    failures.push("no_conclusion_first");
  }
  // Qualification du régime / branche applicable.
  if (!/régime|administratif|responsabilité civile|contractuelle|extracontractuelle|haut risque|pratique interdite|catégorie|qualifi/i.test(a)) {
    failures.push("no_regime_qualification");
  }
  // Subsomption : la règle est confrontée aux faits. Marqueurs = connecteurs
  // juridiques de raisonnement (Section 7.1 du protocole fondateur) + conditions.
  if (
    !/condition|dès lors que|en l'espèce|au regard d|il résulte|à condition que|cumulativ|chacune|sur le fondement|aux termes de|force est de constater|il y a lieu de|en application de|lien de causalité|faute/i.test(
      a
    )
  ) {
    failures.push("no_subsumption");
  }
  // Fondement textuel explicite (au moins un article / règlement cité).
  if (!/article\s*\d+|art\.\s*\d+|règlement \(ue\)|directive \(ue\)/i.test(a)) {
    failures.push("no_textual_basis");
  }
  // Registre : pas d'emoji.
  if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(answer)) {
    failures.push("emoji_present");
  }
  // Défauts proscrits transverses.
  if (/jurisprudence applicable/i.test(answer)) {
    failures.push("repeated_jurisprudence_header");
  }

  return { pass: failures.length === 0, failures };
}
