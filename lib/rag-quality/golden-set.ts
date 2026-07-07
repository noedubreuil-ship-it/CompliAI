/**
 * golden-set.ts — 16 questions de référence pour la qualité RAG (Phase 5).
 *
 * Modifications validées par le mainteneur (2026-06-25) :
 * - Q11 : Art. 35 §10 → souhaitable, non critique
 * - Q14 : articulation RGPD/AI Act sans trancher non bis in idem
 * - Q16 : clauses critiques = (a) + (e) + (g) + (h) uniquement
 *
 * Corrections P0 (2026-06-26) — diagnostic Phase 5 :
 * - Suppression des blacklisted_articles logiquement impossibles : 10 questions
 *   corrigées (Q05, Q06, Q07, Q08, Q09, Q10, Q11, Q12, Q14, Q16).
 *   Voir RAG_QUALITY_ASSURANCE.md § "Erreurs de conception à éviter".
 *
 * RÈGLE CARDINALE du golden set :
 *   Un même article ne peut PAS apparaître simultanément dans required_articles
 *   ET dans blacklisted_articles. Cela produit une condition impossible à satisfaire
 *   (présent → blacklist fire ; absent → missing fire).
 *   Les vérifications qualitatives sur le contenu des §§ précis d'un article unique
 *   (ex: "§2 sans §3") ne sont testables par retrieval QUE si le chunking est au
 *   niveau paragraphe. En attendant, elles sont capturées en optional_elements.
 *
 * Les réponses de référence (required_articles, blacklisted_articles)
 * reflètent l'état idéal du RAG. La baseline réelle est établie en
 * exécutant ces questions sur le RAG actuel (voir runner.ts).
 */

import type { GoldenQuestion } from "./types";

export const GOLDEN_SET: GoldenQuestion[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 1 — AI Act : Qualification
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q01",
    theme: "AI Act — Haut risque Annexe III + Art. 6 §3 (scoring crédit assisté)",
    question:
      "Notre entreprise développe un outil qui analyse des données financières de PME et génère un score de solvabilité, examiné ensuite par un conseiller humain avant toute décision de crédit. Cet outil est-il qualifié de système d'IA à haut risque au sens de l'AI Act ?",
    expected_qualification: "haut_risque_annexe_iii",
    required_articles: [
      { regulation: "AI Act", article_number: "6", description: "Art. 6 §3 — supervision humaine ne déqualifie pas haut risque", severity: "critical" },
      { regulation: "AI Act", article_number: "9", description: "Art. 9 — obligation de gestion des risques systèmes haut risque", severity: "important" },
    ],
    blacklisted_articles: [
      {
        regulation: "AI Act",
        article_number: "50",
        reason: "Art. 50 (transparence chatbot) non pertinent pour scoring crédit — problématique seulement si Art. 6 absent",
        condition_only_when_missing: ["6"],
      },
    ],
    optional_elements: ["Annexe III point 5b", "Arts 9-15 obligations haut risque"],
  },

  {
    id: "Q02",
    theme: "AI Act — Pratique interdite Art. 5 (inférence émotions au travail)",
    question:
      "Peut-on déployer un système d'IA dans un centre d'appels pour inférer les émotions des opérateurs à partir de leur voix et de leur comportement, afin d'évaluer leur performance ?",
    expected_qualification: "pratique_interdite",
    required_articles: [
      { regulation: "AI Act", article_number: "5", description: "Art. 5 — pratiques interdites (prohibition absolue inférence émotions travail)", severity: "critical" },
    ],
    blacklisted_articles: [
      {
        regulation: "AI Act",
        article_number: "9",
        reason: "Qualifier d'haut risque Annexe III au lieu de pratique interdite Art. 5 est une erreur qualificative grave",
        condition_only_when_missing: ["5"],
      },
    ],
    optional_elements: ["Considérant 44", "Art. 5 §2 exceptions limitées"],
  },

  {
    id: "Q03",
    theme: "AI Act — GPAI risque systémique seuil 10²⁵ FLOPS (Art. 51 + Art. 55)",
    question:
      "À partir de quel seuil de puissance de calcul un modèle d'IA à usage général est-il présumé présenter un risque systémique, et quelles obligations supplémentaires ce statut entraîne-t-il ?",
    expected_qualification: "gpai_risque_systemique",
    required_articles: [
      { regulation: "AI Act", article_number: "51", description: "Art. 51 §1 (b) — seuil 10²⁵ FLOPS", severity: "critical" },
      { regulation: "AI Act", article_number: "55", description: "Art. 55 — obligations spécifiques risque systémique", severity: "critical" },
    ],
    blacklisted_articles: [
      {
        regulation: "AI Act",
        article_number: "53",
        reason: "Citer uniquement Art. 53 (GPAI général) sans Art. 55 (risque systémique) est une erreur qualificative",
      },
    ],
    optional_elements: ["Art. 3 §65 définition GPAI", "Art. 51 §2 présomption réfutable"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 2 — GPAI
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q04",
    theme: "AI Act — Obligations générales GPAI Art. 53",
    question:
      "Quelles sont les obligations qui s'imposent aux fournisseurs de modèles d'IA à usage général sous l'AI Act, indépendamment du niveau de risque systémique ?",
    expected_qualification: "obligations_gpai_base",
    required_articles: [
      { regulation: "AI Act", article_number: "53", description: "Art. 53 §1 (a-d) — obligations GPAI de base", severity: "critical" },
    ],
    blacklisted_articles: [
      {
        regulation: "AI Act",
        article_number: "55",
        reason: "Citer uniquement Art. 55 (risque systémique) sans Art. 53 (base) confond les deux niveaux d'obligation",
        condition_only_when_missing: ["53"],
      },
    ],
    optional_elements: ["Art. 113 calendrier d'application", "Art. 53 §2 open source partiel"],
  },

  {
    id: "Q05",
    theme: "AI Act — Exemption open source GPAI (Art. 53 §2)",
    question:
      "Un fournisseur qui publie les poids de son modèle d'IA à usage général en open source est-il dispensé de toutes ses obligations au titre de l'AI Act ?",
    expected_qualification: "exemption_partielle_open_source",
    required_articles: [
      { regulation: "AI Act", article_number: "53", description: "Art. 53 §2 — exemption partielle open source (transparence droit auteur maintenue)", severity: "critical" },
      { regulation: "AI Act", article_number: "51", description: "Art. 51 — risque systémique non exemptable même open source", severity: "important" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "AI Act", article_number: null } interdisait
    // n'importe quel chunk AI Act — rendant impossible de satisfaire simultanément les
    // required_articles (qui sont eux-mêmes des chunks AI Act). Supprimée.
    // La vérification "l'exemption est présentée comme totale" est une qualité de
    // génération LLM, non testable au niveau du retrieval. → optional_elements.
    blacklisted_articles: [],
    optional_elements: [
      "Conditions Art. 53 §2 (a-c)",
      "Considérant 102 open source",
      "GÉNÉRATION: vérifier que la réponse ne conclut pas à une exemption totale sans nuance",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 3 — AI Act × RGPD
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q06",
    theme: "AI Act × RGPD — Scoring SCHUFA + Art. 22 RGPD (C-634/21)",
    question:
      "Une banque refuse un prêt immobilier en se fondant quasi-exclusivement sur un score de crédit calculé par un tiers (de type SCHUFA). Quels droits le demandeur peut-il exercer au titre du RGPD, et la CJUE a-t-elle précisé la portée de l'article 22 dans ce type de situation ?",
    expected_qualification: "decision_automatisee_art22",
    required_articles: [
      { regulation: "RGPD", article_number: "22", description: "Art. 22 — décision individuelle automatisée", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "22" } était identique à
    // l'article requis → impossible de satisfaire les deux conditions. Supprimée.
    // La vérification "l'intervention humaine formelle écarte à tort Art. 22" dépend du
    // contenu de la réponse LLM, non de la présence du chunk. → optional_elements.
    // Après P2 (chunking paragraphe), envisager une blacklist sur "22_§2 sans 22_§3".
    blacklisted_articles: [],
    required_ecli: ["ECLI:EU:C:2023:634"],
    optional_elements: [
      "Art. 22 §2-3 exceptions et garanties",
      "Art. 15 droit d'accès",
      "Art. 17 droit à l'effacement",
      "GÉNÉRATION: vérifier que la réponse ne conclut pas que l'intervention humaine formelle suffit à écarter Art. 22",
    ],
  },

  {
    id: "Q07",
    theme: "RGPD — Art. 22 conditions d'application et exceptions",
    question:
      "Dans quels cas précis l'article 22 du RGPD s'applique-t-il à une décision automatisée, et quelles exceptions permettent légalement un tel traitement ?",
    expected_qualification: "conditions_exceptions_art22",
    required_articles: [
      { regulation: "RGPD", article_number: "22", description: "Art. 22 §1 (3 conditions) + §2 (exceptions) + §3-4 (garanties)", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "22" } était identique à
    // l'article requis → impossible logiquement. La nuance "§2 sans §3" ne peut être
    // détectée au niveau retrieval qu'après P2 (chunking RGPD au niveau paragraphe).
    // À réintroduire POST-P2 : blacklist "22_§2" si "22_§3" absent dans les résultats.
    blacklisted_articles: [],
    optional_elements: [
      "Lignes directrices EDPB 06/2018 sur les décisions automatisées",
      "Art. 22 §4 données sensibles",
      "POST-P2: distinguer §2 (exceptions) vs §3 (garanties associées)",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 4 — Transferts internationaux post-Schrems II
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q08",
    theme: "Transferts — DPF vers US post-Schrems II (Art. 45 RGPD)",
    question:
      "Peut-on transférer des données personnelles vers un prestataire américain certifié sous le Data Privacy Framework (DPF), et ce mécanisme offre-t-il des garanties suffisantes au regard de la jurisprudence européenne ?",
    expected_qualification: "adequation_conditionnelle_dpf",
    required_articles: [
      { regulation: "RGPD", article_number: "45", description: "Art. 45 — décision d'adéquation (DPF adopté 10 juillet 2023)", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "45" } était identique à
    // l'article requis → impossible logiquement. La nuance "DPF présenté comme sûr sans
    // nuancer les risques" est une qualité de génération LLM, pas de retrieval. Supprimée.
    blacklisted_articles: [],
    required_ecli: ["ECLI:EU:C:2020:559", "ECLI:EU:C:2015:650"],
    optional_elements: [
      "C-311/18 Schrems II",
      "C-362/14 Schrems I",
      "Recommandations EDPB 01/2020",
      "GÉNÉRATION: vérifier que la réponse mentionne le risque de remise en cause du DPF",
    ],
  },

  {
    id: "Q09",
    theme: "Transferts — Pays tiers sans adéquation (Art. 46 RGPD + CCT)",
    question:
      "Une PME française souhaite confier le traitement de données RH à un sous-traitant indien. Aucune décision d'adéquation n'existe pour l'Inde. Comment ce transfert peut-il être légalement encadré ?",
    expected_qualification: "garanties_appropriees_art46",
    required_articles: [
      { regulation: "RGPD", article_number: "46", description: "Art. 46 — garanties appropriées (CCT, règles contraignantes, etc.)", severity: "critical" },
      { regulation: "RGPD", article_number: "44", description: "Art. 44 — principe d'interdiction sans base légale", severity: "important" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "46" } était identique à
    // un article requis → impossible. La nuance "CCT sans TIA" est une qualité de
    // génération (absence de mention des Recommandations EDPB 01/2020), non de retrieval.
    // La présence des Recommandations EDPB 01/2020 est déjà captée en optional_elements.
    blacklisted_articles: [],
    optional_elements: [
      "Recommandations EDPB 01/2020 mesures supplémentaires",
      "Art. 46 §2 (c) clauses types",
      "Art. 49 dérogations",
      "GÉNÉRATION: vérifier que la réponse mentionne le Transfer Impact Assessment (TIA)",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 5 — DPO
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q10",
    theme: "RGPD — DPO obligatoire Art. 37 §1 (critères alternatifs)",
    question:
      "Une collectivité locale emploie 800 agents et traite à la fois des données de vidéosurveillance de la voie publique et des données de santé de ses agents. Est-elle obligée de désigner un délégué à la protection des données ?",
    expected_qualification: "dpo_obligatoire_organisme_public",
    required_articles: [
      { regulation: "RGPD", article_number: "37", description: "Art. 37 §1 (a) organisme public — critère suffisant seul", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "37" } était identique à
    // l'article requis → impossible. L'erreur qualificative "critères cumulatifs vs
    // alternatifs" (§1(a)(b)(c)) ne peut être détectée au niveau retrieval : un seul chunk
    // couvre Art. 37 dans son ensemble. C'est une vérification de génération LLM.
    // Après P2 (chunking RGPD paragraphe), envisager de distinguer "37_§1" vs "37_§2".
    blacklisted_articles: [],
    optional_elements: [
      "Art. 37 §1 (b) suivi systématique grande échelle",
      "Art. 37 §1 (c) données sensibles grande échelle",
      "Lignes directrices EDPB 07/2020 DPO",
      "GÉNÉRATION: vérifier que les critères §1 (a)(b)(c) sont présentés comme ALTERNATIFS et non cumulatifs",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 6 — AIPD
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q11",
    theme: "RGPD — AIPD Art. 35 (déclencheurs et exemptions)",
    question:
      "Quand une analyse d'impact relative à la protection des données est-elle obligatoire, et existe-t-il des cas où l'on peut s'en dispenser même si le traitement est susceptible d'engendrer un risque élevé ?",
    expected_qualification: "aipd_obligatoire_risque_eleve",
    required_articles: [
      { regulation: "RGPD", article_number: "35", description: "Art. 35 §1 — critère général risque élevé", severity: "critical" },
      { regulation: "RGPD", article_number: "35", description: "Art. 35 §3 (a-c) — cas obligatoires de plein droit", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "35" } était identique aux
    // articles requis → impossible. Les deux required_articles pointent sur "35" (un seul
    // chunk en chunking article-niveau). La distinction §1 vs §3 requiert le chunking
    // paragraphe (post-P2). L'erreur "§3 seul sans §1" est une vérification de génération.
    // Après P2 : envisager blacklist sur "35_§3 seul" si "35_§1" absent.
    blacklisted_articles: [],
    // Art. 35 §10 est souhaitable mais non critique (modif. Q11 validée 2026-06-25)
    optional_elements: [
      "Art. 35 §5 liste des traitements DPA",
      "Art. 35 §10 exemption intérêt public (souhaitable, non critique)",
      "POST-P2: distinguer §1 (critère général) vs §3 (cas spécifiques) dans retrieval",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 7 — Droit à l'effacement
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q12",
    theme: "RGPD — Exceptions droit à l'effacement Art. 17 §3",
    question:
      "Un utilisateur demande la suppression immédiate de l'ensemble de ses données personnelles. Dans quels cas l'entreprise peut-elle légalement refuser, en totalité ou partiellement ?",
    expected_qualification: "droit_effacement_exceptions",
    required_articles: [
      { regulation: "RGPD", article_number: "17", description: "Art. 17 §1 — fondements du droit à l'effacement", severity: "critical" },
      { regulation: "RGPD", article_number: "17", description: "Art. 17 §3 (a-e) — exceptions légales", severity: "critical" },
      { regulation: "RGPD", article_number: "17", description: "Art. 17 §2 — obligation de notification aux tiers", severity: "important" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "17" } était identique aux
    // articles requis → impossible. Les 3 required_articles pointent tous sur "17" (un seul
    // chunk article-niveau). La distinction §1 vs §3 (exceptions) requiert le chunking
    // paragraphe (post-P2). C'est une vérification de génération LLM.
    // Après P2 : envisager blacklist "17_§1 seul" si "17_§3" absent des résultats.
    blacklisted_articles: [],
    optional_elements: [
      "Art. 19 obligation d'information aux destinataires",
      "POST-P2: distinguer §1 (droit) vs §3 (exceptions) dans retrieval",
      "GÉNÉRATION: vérifier que la réponse mentionne les exceptions §3 (a-e)",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 8 — Consentement données sensibles
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q13",
    theme: "RGPD — Consentement explicite Art. 9 §2 (a) (données de santé)",
    question:
      "Une application mobile de suivi de santé collecte des informations sur les pathologies chroniques de ses utilisateurs. Sur quelle base légale peut-elle s'appuyer, et à quelles conditions le consentement explicite est-il valide dans ce contexte ?",
    expected_qualification: "consentement_explicite_art9",
    required_articles: [
      { regulation: "RGPD", article_number: "9", description: "Art. 9 §1 — interdiction de principe données sensibles", severity: "critical" },
      { regulation: "RGPD", article_number: "9", description: "Art. 9 §2 (a) — consentement explicite comme exception", severity: "critical" },
      { regulation: "RGPD", article_number: "7", description: "Art. 7 — conditions de validité du consentement", severity: "important" },
    ],
    blacklisted_articles: [
      {
        regulation: "RGPD",
        article_number: "6",
        reason: "Citer uniquement Art. 6 §1 (a) comme base légale sans Art. 9 §2 (a) est une erreur : les données de santé exigent une double base légale",
        condition_only_when_missing: ["9"],
      },
    ],
    optional_elements: ["Lignes directrices EDPB 05/2020 sur le consentement", "Art. 9 §2 (h) finalités soins de santé"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 9 — Sanctions corrélées
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q14",
    theme: "Sanctions — RGPD Art. 83 §4/§5 × AI Act Art. 99 §3/§4",
    question:
      "Quels sont les montants maximaux des sanctions prévus par le RGPD et l'AI Act, et comment s'articulent-ils lorsqu'une même violation relève simultanément des deux règlements ?",
    expected_qualification: "sanctions_biregimes",
    required_articles: [
      { regulation: "RGPD", article_number: "83", description: "Art. 83 §4 (10M€/2%) + §5 (20M€/4%) — deux tranches distinctes", severity: "critical" },
      // P1-correction (2026-06-26) : montants corrigés après lecture du texte source.
      // §3 = 35M€/7% (pratiques interdites Art. 5) ; §4 = 15M€/3% (non-conformité générale)
      { regulation: "AI Act", article_number: "99", description: "Art. 99 §3 (35M€/7% pratiques interdites) + §4 (15M€/3% non-conformité) — deux tranches distinctes", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // 1re blacklist supprimée : { regulation: "RGPD", article_number: "83" } était identique
    //    à l'article requis → impossible. La distinction §4 vs §5 requiert chunking paragraphe.
    // 2e blacklist supprimée : { regulation: "RGPD", article_number: null } interdisait
    //    n'importe quel chunk RGPD, y compris Art. 83 requis → impossible.
    //    L'articulation des régimes (non bis in idem) est une vérification de génération LLM.
    // Après P2 (chunking paragraphe) + P1 (Art. 99 §3-§6 ajoutés) :
    //   envisager blacklist "83 sans mention §4 ET §5 distincts" et "99 sans §3 ou §4".
    blacklisted_articles: [],
    optional_elements: [
      "Art. 99 §5 AI Act PME amendes réduites",
      "Considérant 150 AI Act articulation avec RGPD",
      "POST-P1+P2: distinguer §4/§5 RGPD et §3/§4 AI Act dans retrieval",
      "GÉNÉRATION: vérifier que la réponse aborde l'articulation des deux régimes sans trancher non bis in idem",
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 10 — Transparence chatbot
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q15",
    theme: "AI Act — Transparence chatbot Art. 50 (obligation du déployeur)",
    question:
      "Une entreprise déploie un chatbot de service client alimenté par un LLM. Quelles obligations de transparence l'AI Act impose-t-il vis-à-vis des utilisateurs finaux, et à qui incombent-elles ?",
    expected_qualification: "transparence_interaction_ia_deployeur",
    required_articles: [
      { regulation: "AI Act", article_number: "50", description: "Art. 50 §1 — obligation du déployeur d'informer de l'interaction IA", severity: "critical" },
      { regulation: "AI Act", article_number: "26", description: "Art. 26 §2 — obligations générales du déployeur", severity: "important" },
    ],
    blacklisted_articles: [
      {
        regulation: "AI Act",
        article_number: "13",
        reason: "Citer uniquement Art. 13 (transparence haut risque) sans Art. 50 confond les deux régimes de transparence",
        condition_only_when_missing: ["50"],
      },
      {
        regulation: "AI Act",
        article_number: "53",
        reason: "Imputer l'obligation au fournisseur du modèle (Art. 53) plutôt qu'au déployeur (Art. 50 §1) est une erreur qualificative",
        condition_only_when_missing: ["50"],
      },
    ],
    optional_elements: ["Art. 50 §2 exceptions (évidence ou autorisation légale)", "Art. 50 §3 marquage contenu généré par IA"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BLOC 11 — Sous-traitance
  // ──────────────────────────────────────────────────────────────────────────

  {
    id: "Q16",
    theme: "RGPD — Sous-traitance Art. 28 §3 (clauses obligatoires)",
    question:
      "Quelles sont les clauses qui doivent obligatoirement figurer dans un contrat de sous-traitance de données personnelles au sens du RGPD, et quelles sont les conséquences juridiques de leur absence ?",
    expected_qualification: "contrat_sous_traitance_art28",
    required_articles: [
      { regulation: "RGPD", article_number: "28", description: "Art. 28 §3 (a-h) — 8 clauses obligatoires dont (a)(e)(g)(h) critiques", severity: "critical" },
    ],
    // P0-correction (2026-06-26) :
    // L'ancienne blacklist { regulation: "RGPD", article_number: "28" } était identique à
    // l'article requis → impossible. L'absence des 4 clauses critiques (a)(e)(g)(h) ne peut
    // être détectée au niveau retrieval : un seul chunk couvre Art. 28 §3 dans son ensemble.
    // C'est une vérification de génération LLM, ou nécessite chunking lettre par lettre.
    // Le champ required_clause_letters capture déjà l'exigence qualitative.
    blacklisted_articles: [],
    // Modif. Q16 validée (2026-06-25) : seules (a)(e)(g)(h) sont critiques
    required_clause_letters: ["a", "e", "g", "h"],
    optional_elements: [
      "Art. 28 §3 (b) confidentialité — souhaitable",
      "Art. 28 §3 (c) sécurité Art. 32 — souhaitable",
      "Art. 28 §3 (d) sous-sous-traitance — souhaitable",
      "Art. 28 §3 (f) assistance au RT — souhaitable",
      "Art. 28 §4 obligations sous-sous-traitant",
      "Art. 83 §4 sanction absence contrat",
      "GÉNÉRATION: vérifier que les clauses (a)(e)(g)(h) sont explicitement mentionnées",
    ],
  },
];

/**
 * Retourne une question par son ID.
 */
export function getQuestion(id: string): GoldenQuestion | undefined {
  return GOLDEN_SET.find((q) => q.id === id);
}
