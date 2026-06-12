# Générateur de plan de mémoire — prompt utilisateur v1

Tu es directeur de thèse en droit du numérique et de l'IA. L'étudiant te soumet ce sujet de mémoire : « {{SUJET}} » (niveau : {{NIVEAU}}).

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
            {"titre": "Section 1 — Titre", "idees": ["idée clé 1", "idée clé 2", "idée clé 3"]}
          ]
        }
      ]
    }
  ],
  "bibliographie": [
    {"type": "Traité / Manuel", "references": ["Auteur, Titre, Éditeur, Année"]},
    {"type": "Textes officiels", "references": ["Règlement (UE)..."]},
    {"type": "Jurisprudence clé", "references": ["CJUE, arrêt..."]}
  ],
  "conseils_directeur": "Conseils personnalisés sur les enjeux clés à traiter"
}
