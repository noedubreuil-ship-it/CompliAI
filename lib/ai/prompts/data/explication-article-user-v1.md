# Explication d'article — prompt utilisateur v1

Tu es un professeur de droit spécialiste de la réglementation IA. Explique l'article « {{ARTICLE}} » du texte « {{TEXTE}} » à un étudiant de niveau {{NIVEAU}}.

Réponds UNIQUEMENT avec ce JSON :
{
  "article": "{{ARTICLE}}",
  "texte": "{{TEXTE}}",
  "niveau_1": {
    "titre": "En langage clair",
    "explication": "Explication simple, sans jargon (4-5 phrases)"
  },
  "niveau_2": {
    "titre": "Cas pratique illustré",
    "scenario": "Scénario concret",
    "application": "Application de l'article (3-4 phrases)",
    "obligations_concretes": ["obligation 1", "obligation 2"]
  },
  "niveau_3": {
    "titre": "Analyse doctrinale",
    "debats": "Débats doctrinaux (4-5 phrases)",
    "lacunes": "Lacunes ou ambiguïtés",
    "perspectives": "Évolutions attendues"
  },
  "liens": ["Article lié 1", "Texte connexe"],
  "jurisprudence_cle": ["Décision applicable"]
}
