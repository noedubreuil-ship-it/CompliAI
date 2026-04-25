import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Prompt builders ──────────────────────────────────────────────────────────

function promptResumeArret(text: string) {
  return `Tu es un professeur de droit européen spécialisé en IA et données personnelles.
Voici une décision de justice ou une décision d'autorité réglementaire :

${text}

Génère une fiche d'arrêt complète et un plan de commentaire. Réponds UNIQUEMENT avec ce JSON :
{
  "fiche": {
    "reference": "Référence officielle de la décision (ECLI, numéro, date)",
    "juridiction": "Juridiction ou autorité (CJUE, CEDH, CNIL, DPC...)",
    "date": "Date de la décision",
    "parties": "Parties en présence",
    "faits": "Résumé des faits en 3-5 phrases claires",
    "procedure": "Historique procédural",
    "question_droit": "Question(s) de droit posée(s)",
    "solution": "Solution retenue et raisonnement",
    "portee": "Portée et signification pour la pratique",
    "textes_appliques": ["article 1", "article 2"]
  },
  "commentaire": {
    "problematique": "Problématique suggérée pour le commentaire",
    "plan": [
      {
        "partie": "I. Titre première partie",
        "sous_parties": [
          {"titre": "A. Premier sous-titre", "idees": ["idée 1", "idée 2"]},
          {"titre": "B. Deuxième sous-titre", "idees": ["idée 1", "idée 2"]}
        ]
      },
      {
        "partie": "II. Titre deuxième partie",
        "sous_parties": [
          {"titre": "A. Premier sous-titre", "idees": ["idée 1", "idée 2"]},
          {"titre": "B. Deuxième sous-titre", "idees": ["idée 1", "idée 2"]}
        ]
      }
    ],
    "references_doctrinales": ["référence 1", "référence 2", "référence 3"],
    "conseils": "Conseils méthodologiques pour la rédaction"
  }
}`;
}

function promptQuiz(topic: string, level: string, count: number) {
  return `Tu es un professeur spécialisé en droit de l'IA. Génère ${count} questions de QCM sur le sujet : "${topic}" pour un niveau ${level}.

Réponds UNIQUEMENT avec ce JSON :
{
  "title": "Quiz — ${topic}",
  "level": "${level}",
  "questions": [
    {
      "id": 1,
      "question": "Texte de la question",
      "options": ["A. Réponse A", "B. Réponse B", "C. Réponse C", "D. Réponse D"],
      "correct": 0,
      "explanation": "Explication de la bonne réponse avec citation du texte de loi applicable",
      "article_ref": "Article X du règlement Y"
    }
  ]
}

Les questions doivent être précises, basées sur les textes officiels (AI Act, RGPD, DSA, CJUE). L'index "correct" est 0-basé (0=A, 1=B, 2=C, 3=D).`;
}

function promptPlanMemoire(sujet: string, niveau: string) {
  return `Tu es directeur de thèse en droit du numérique et de l'IA. L'étudiant te soumet ce sujet de mémoire : "${sujet}" (niveau : ${niveau}).

Génère un plan complet. Réponds UNIQUEMENT avec ce JSON :
{
  "titre_propose": "Titre académique suggéré",
  "problematique": "Problématique principale du mémoire (2-3 phrases)",
  "introduction_amorce": "Accroche d'introduction suggérée (2-3 phrases)",
  "plan": [
    {
      "partie": "PARTIE I — Titre",
      "sous_parties": [
        {
          "titre": "Chapitre 1 — Titre",
          "sections": [
            {"titre": "Section 1 — Titre", "idees": ["idée clé 1", "idée clé 2", "idée clé 3"]},
            {"titre": "Section 2 — Titre", "idees": ["idée clé 1", "idée clé 2", "idée clé 3"]}
          ]
        },
        {
          "titre": "Chapitre 2 — Titre",
          "sections": [
            {"titre": "Section 1 — Titre", "idees": ["idée clé 1", "idée clé 2"]},
            {"titre": "Section 2 — Titre", "idees": ["idée clé 1", "idée clé 2"]}
          ]
        }
      ]
    },
    {
      "partie": "PARTIE II — Titre",
      "sous_parties": [
        {
          "titre": "Chapitre 1 — Titre",
          "sections": [
            {"titre": "Section 1 — Titre", "idees": ["idée clé 1", "idée clé 2"]},
            {"titre": "Section 2 — Titre", "idees": ["idée clé 1", "idée clé 2"]}
          ]
        },
        {
          "titre": "Chapitre 2 — Titre",
          "sections": [
            {"titre": "Section 1 — Titre", "idees": ["idée clé 1", "idée clé 2"]},
            {"titre": "Section 2 — Titre", "idees": ["idée clé 1", "idée clé 2"]}
          ]
        }
      ]
    }
  ],
  "bibliographie": [
    {"type": "Traité / Manuel", "references": ["Auteur, Titre, Éditeur, Année"]},
    {"type": "Articles doctrinaux", "references": ["Auteur, Titre, Revue, Année"]},
    {"type": "Textes officiels", "references": ["Règlement (UE)...", "Directive..."]},
    {"type": "Jurisprudence clé", "references": ["CJUE, arrêt...", "CEDH, arrêt..."]}
  ],
  "conseils_directeur": "Conseils personnalisés sur les enjeux clés à traiter, les pièges à éviter, les débats doctrinaux à mentionner"
}`;
}

function promptExplicationArticle(article: string, texte: string, niveau: string) {
  return `Tu es un professeur de droit spécialiste de la réglementation IA. Explique l'article "${article}" du texte "${texte}" à un étudiant de niveau ${niveau}.

Réponds UNIQUEMENT avec ce JSON :
{
  "article": "${article}",
  "texte": "${texte}",
  "niveau_1": {
    "titre": "En langage clair",
    "explication": "Explication simple, sans jargon, accessible à un non-juriste (4-5 phrases)"
  },
  "niveau_2": {
    "titre": "Cas pratique illustré",
    "scenario": "Description d'un scénario concret (startup, entreprise, administration...)",
    "application": "Comment l'article s'applique à ce scénario (3-4 phrases)",
    "obligations_concretes": ["obligation 1", "obligation 2", "obligation 3"]
  },
  "niveau_3": {
    "titre": "Analyse doctrinale",
    "debats": "Principaux débats doctrinaux autour de cet article (4-5 phrases)",
    "lacunes": "Lacunes ou ambiguïtés identifiées par la doctrine",
    "perspectives": "Évolutions attendues (jurisprudence, lignes directrices...)"
  },
  "liens": ["Article lié 1 du même texte", "Article lié 2", "Texte connexe"],
  "jurisprudence_cle": ["Décision 1 applicable", "Décision 2 applicable"]
}`;
}

function promptSimulateur(scenario: string, roleIA: string, contextInfo: string) {
  return `Tu joues le rôle de ${roleIA} dans un jeu de rôle réglementaire pédagogique.

SCÉNARIO : ${scenario}
CONTEXTE : ${contextInfo}

Tu dois :
1. Introduire ta posture (régulateur, DPO ou avocat adverse)
2. Poser ta première question de fond à l'étudiant
3. Attendre sa réponse avant de continuer

Réponds UNIQUEMENT avec ce JSON :
{
  "role": "${roleIA}",
  "introduction": "Présentation de ta posture et du contexte de l'interaction (2-3 phrases)",
  "premiere_question": "Ta première question précise, basée sur les textes de droit applicable",
  "article_vise": "Article ou disposition réglementaire sur laquelle porte la question",
  "indice_pedagogique": "Indice discret pour aider l'étudiant (sans donner la réponse)",
  "scenario_resume": "Résumé du scénario pour l'étudiant"
}`;
}

function promptSimulateurReponse(scenario: string, roleIA: string, historique: string, reponseEtudiant: string) {
  return `Tu joues le rôle de ${roleIA} dans un jeu de rôle réglementaire.
SCÉNARIO : ${scenario}

HISTORIQUE DU DIALOGUE :
${historique}

L'ÉTUDIANT RÉPOND : "${reponseEtudiant}"

Évalue sa réponse et continue le jeu. Réponds UNIQUEMENT avec ce JSON :
{
  "evaluation": {
    "score": 7,
    "sur": 10,
    "points_forts": ["point fort 1", "point fort 2"],
    "points_manquants": ["ce qui manquait 1", "ce qui manquait 2"],
    "article_attendu": "L'article ou argument juridique attendu",
    "correction": "Correction complète avec référence aux textes (3-4 phrases)"
  },
  "suite": {
    "reaction_role": "Ta réaction en tant que ${roleIA} (rester dans le rôle, 2 phrases)",
    "prochaine_question": "Prochaine question ou est-ce la fin (null si fin)",
    "est_termine": false
  },
  "score_final": null
}

Si c'est la dernière question (après 3-4 échanges), mets "est_termine": true et "score_final": { "total": X, "sur": 40, "niveau": "Bien/Passable/Insuffisant", "bilan": "Bilan pédagogique complet" }.`;
}

function promptMemoireConformite(situation: string, contexte: string) {
  return `Tu es un avocat senior spécialisé en droit de l'IA et des données personnelles, rédigeant pour un cabinet.

SITUATION CLIENTE :
${situation}

CONTEXTE SUPPLÉMENTAIRE :
${contexte}

Rédige un mémoire de conformité structuré. Réponds UNIQUEMENT avec ce JSON :
{
  "titre": "Mémoire de conformité IA — [Objet]",
  "date": "${new Date().toLocaleDateString("fr-FR")}",
  "synthese_executive": "Synthèse en 3 phrases pour le décideur",
  "sections": [
    {
      "id": "1",
      "titre": "I. Qualification juridique des systèmes IA en cause",
      "contenu": "Analyse juridique précise avec qualification AI Act (interdit/haut risque/GPAI/minimal) et qualification RGPD",
      "refs": ["Art. X AI Act", "Art. Y RGPD"]
    },
    {
      "id": "2",
      "titre": "II. Obligations applicables",
      "contenu": "Liste et analyse des obligations légales applicables à la situation",
      "refs": ["refs applicables"]
    },
    {
      "id": "3",
      "titre": "III. Risques juridiques identifiés",
      "contenu": "Risques de sanctions, contentieux, réputation — avec niveaux de criticité",
      "refs": ["refs sanctions"]
    },
    {
      "id": "4",
      "titre": "IV. Recommandations et plan d'action",
      "contenu": "Actions concrètes à mener, priorisées, avec délais indicatifs",
      "refs": ["refs obligations"]
    }
  ],
  "tableau_risques": [
    {"risque": "description", "probabilite": "Faible/Moyenne/Élevée", "impact": "Faible/Moyen/Critique", "ref": "article"}
  ],
  "plan_action": [
    {"priorite": "Urgent", "action": "action 1", "delai": "Immédiat / 1 mois / 6 mois", "ref": "article"}
  ],
  "disclaimer": "Ce mémoire constitue une analyse juridique générale. Il ne saurait se substituer à un conseil juridique personnalisé."
}`;
}

function promptComparateurLegislation(directive: string, pays1: string, pays2: string) {
  return `Tu es un expert en droit comparé européen.

Compare la transposition/application de "${directive}" entre ${pays1} et ${pays2}.

Réponds UNIQUEMENT avec ce JSON :
{
  "directive": "${directive}",
  "pays": ["${pays1}", "${pays2}"],
  "synthese": "Synthèse des principales différences en 3-4 phrases",
  "tableau": [
    {
      "aspect": "Aspect comparé (ex: champ d'application)",
      "pays1": "Position de ${pays1}",
      "pays2": "Position de ${pays2}",
      "divergence": "Faible/Moyenne/Forte",
      "commentaire": "Analyse de la divergence"
    }
  ],
  "points_convergence": ["convergence 1", "convergence 2"],
  "points_divergence": [
    {"point": "divergence majeure", "avantage": "${pays1} ou ${pays2}", "explication": "pourquoi"}
  ],
  "implications_pratiques": "Implications pour une entreprise opérant dans les deux pays",
  "sources": ["source officielle 1", "source 2"]
}

Compare au minimum 8 aspects différents dans le tableau.`;
}

function promptClausesContrat(typeClause: string, contexte: string, parties: string) {
  return `Tu es un avocat expert en contrats IA et en droit des données. Génère des clauses contractuelles prêtes à l'emploi.

TYPE DE CLAUSE : ${typeClause}
CONTEXTE : ${contexte}
PARTIES : ${parties}

Réponds UNIQUEMENT avec ce JSON :
{
  "type_clause": "${typeClause}",
  "clauses": [
    {
      "numero": "Art. 1",
      "titre": "Titre de la clause",
      "texte": "Texte complet de la clause rédigé en français juridique, prêt à copier dans un contrat",
      "base_legale": "Article X AI Act / Art. Y RGPD",
      "commentaire": "Explication de l'utilité et des points d'attention pour la négociation",
      "variante": "Variante possible si négociation (optionnel)"
    }
  ],
  "notes_negociation": "Points clés à surveiller lors de la négociation (3-4 phrases)",
  "risques_sans_clause": "Risques légaux si ces clauses sont absentes",
  "disclaimer": "Ces clauses sont fournies à titre indicatif. Faites valider par un avocat."
}

Génère minimum 3 clauses complètes et rédigées.`;
}

function promptAnalyseDecision(texteDecision: string) {
  return `Tu es un juriste spécialisé en sanctions RGPD et AI Act. Analyse cette décision de sanction.

DÉCISION :
${texteDecision}

Réponds UNIQUEMENT avec ce JSON :
{
  "reference": "Référence de la décision",
  "autorite": "Autorité ayant rendu la décision (CNIL, DPC, EDPB, AEPD...)",
  "date": "Date",
  "montant_sanction": "Montant de la sanction ou nature de la mesure",
  "fiche": {
    "entite_sanctionnee": "Nom et secteur de l'entité sanctionnée",
    "faits": "Description des faits reprochés (4-5 phrases)",
    "violation_retenue": ["violation 1 — article applicable", "violation 2 — article applicable"],
    "raisonnement": "Raisonnement juridique de l'autorité (4-5 phrases)",
    "circonstances_aggravantes": ["circonstance 1"],
    "circonstances_attenuantes": ["circonstance 1"],
    "mesures_imposees": ["mesure corrective 1", "mesure 2"]
  },
  "portee": {
    "principe_degage": "Principe ou règle dégagée par la décision",
    "impact_sectoriel": "Impact pour le secteur d'activité concerné",
    "impact_technologique": "Impact pour les technologies IA/data utilisées"
  },
  "implications_entreprises": [
    {"action": "Action préventive à prendre", "priorite": "Haute/Moyenne", "ref": "article applicable"}
  ],
  "jurisprudence_liee": ["Décision similaire 1", "Décision similaire 2"]
}`;
}

function promptAuditQR(systemDescription: string, secteur: string) {
  return `Tu joues le rôle d'un auditeur réglementaire mandaté par une autorité nationale compétente (ANC) au titre de l'AI Act.

SYSTÈME IA À AUDITER : ${systemDescription}
SECTEUR : ${secteur}

Génère les 20 questions que poserait l'auditeur. Réponds UNIQUEMENT avec ce JSON :
{
  "contexte_audit": "Introduction de l'audit et posture de l'auditeur (2-3 phrases)",
  "systeme_audite": "${systemDescription}",
  "questions": [
    {
      "numero": 1,
      "categorie": "Documentation technique",
      "question": "Texte exact de la question",
      "article_vise": "Art. X AI Act",
      "type_reponse": "Document à produire / Démonstration / Explication orale",
      "criticite": "Critique/Haute/Moyenne",
      "indice": "Ce que l'auditeur cherche à vérifier"
    }
  ],
  "categories_couvertes": ["Documentation technique", "Gouvernance des données", "Supervision humaine", "Cybersécurité", "Transparence", "Gestion des risques"],
  "preparation_conseils": "Conseils pour préparer l'audit (3-4 phrases)"
}`;
}

function promptRechercheJurisprudentielle(requete: string, filtres: string) {
  return `Tu es un juriste documentaliste expert en jurisprudence CJUE, CEDH et décisions DPA nationales.

REQUÊTE : "${requete}"
FILTRES : ${filtres}

Recherche et synthétise la jurisprudence pertinente. Réponds UNIQUEMENT avec ce JSON :
{
  "requete": "${requete}",
  "nb_resultats": 6,
  "decisions": [
    {
      "ecli": "ECLI:EU:C:YYYY:XXX ou référence équivalente",
      "titre": "Intitulé court de la décision",
      "juridiction": "CJUE / CEDH / CNIL / DPC / EDPB / etc.",
      "date": "YYYY-MM-DD",
      "parties": "Parties (si disponible)",
      "theme": "Thème principal",
      "faits_resume": "Résumé des faits en 2 phrases",
      "solution": "Solution et principe dégagé (2-3 phrases)",
      "articles_appliques": ["Art. X RGPD", "Art. Y AI Act"],
      "portee": "Portée pratique pour les entreprises",
      "pertinence": 95
    }
  ],
  "synthese_thematique": "Synthèse des grandes tendances jurisprudentielles sur ce thème (4-5 phrases)",
  "evolution": "Évolution récente et tendances attendues",
  "conseil_pratique": "Conseil pratique pour les entreprises au regard de cette jurisprudence"
}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const limited = await rateLimitUser(user.id, "legal-tools", RATE_LIMITS.generate);
  if (limited) return limited;

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { tool, ...inputs } = body;
  if (!tool) return NextResponse.json({ error: "tool requis" }, { status: 400 });

  let prompt: string;
  try {
    switch (tool) {
      case "resume-arret":
        if (!inputs.text) return NextResponse.json({ error: "text requis" }, { status: 400 });
        prompt = promptResumeArret(inputs.text);
        break;
      case "quiz":
        prompt = promptQuiz(inputs.topic || "AI Act obligations", inputs.level || "Master 1", parseInt(inputs.count || "5"));
        break;
      case "plan-memoire":
        if (!inputs.sujet) return NextResponse.json({ error: "sujet requis" }, { status: 400 });
        prompt = promptPlanMemoire(inputs.sujet, inputs.niveau || "Master 2");
        break;
      case "explication-article":
        if (!inputs.article || !inputs.texte) return NextResponse.json({ error: "article et texte requis" }, { status: 400 });
        prompt = promptExplicationArticle(inputs.article, inputs.texte, inputs.niveau || "Master 1");
        break;
      case "simulateur-init":
        if (!inputs.scenario) return NextResponse.json({ error: "scenario requis" }, { status: 400 });
        prompt = promptSimulateur(inputs.scenario, inputs.roleIA || "Régulateur (ANC AI Act)", inputs.contextInfo || "");
        break;
      case "simulateur-reponse":
        if (!inputs.scenario || !inputs.reponseEtudiant) return NextResponse.json({ error: "scenario et reponseEtudiant requis" }, { status: 400 });
        prompt = promptSimulateurReponse(inputs.scenario, inputs.roleIA || "Régulateur", inputs.historique || "", inputs.reponseEtudiant);
        break;
      case "memoire-conformite":
        if (!inputs.situation) return NextResponse.json({ error: "situation requise" }, { status: 400 });
        prompt = promptMemoireConformite(inputs.situation, inputs.contexte || "");
        break;
      case "comparateur":
        if (!inputs.directive || !inputs.pays1 || !inputs.pays2) return NextResponse.json({ error: "directive, pays1, pays2 requis" }, { status: 400 });
        prompt = promptComparateurLegislation(inputs.directive, inputs.pays1, inputs.pays2);
        break;
      case "clauses-contrat":
        if (!inputs.typeClause) return NextResponse.json({ error: "typeClause requis" }, { status: 400 });
        prompt = promptClausesContrat(inputs.typeClause, inputs.contexte || "", inputs.parties || "Prestataire IA / Client");
        break;
      case "analyse-decision":
        if (!inputs.texteDecision) return NextResponse.json({ error: "texteDecision requis" }, { status: 400 });
        prompt = promptAnalyseDecision(inputs.texteDecision);
        break;
      case "audit-qr":
        if (!inputs.systemDescription) return NextResponse.json({ error: "systemDescription requis" }, { status: 400 });
        prompt = promptAuditQR(inputs.systemDescription, inputs.secteur || "");
        break;
      case "recherche-jurisprudentielle":
        if (!inputs.requete) return NextResponse.json({ error: "requete requise" }, { status: 400 });
        prompt = promptRechercheJurisprudentielle(inputs.requete, inputs.filtres || "Toutes juridictions");
        break;
      default:
        return NextResponse.json({ error: `Outil inconnu: ${tool}` }, { status: 400 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: `Erreur de paramètres: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: "Tu es un expert juridique. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après. Commence directement par { et termine par }.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[legal-tools] No JSON in response:", raw.slice(0, 300));
      return NextResponse.json({ error: "Réponse IA invalide" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ result });
  } catch (e: unknown) {
    console.error("[legal-tools] Error:", e);
    return NextResponse.json(
      { error: `Erreur lors de la génération: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
