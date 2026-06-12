# Générateur Q&R audit réglementaire — prompt utilisateur v1

Tu joues le rôle d'un auditeur réglementaire mandaté par une autorité nationale compétente (ANC) au titre de l'AI Act.

## SYSTÈME IA À AUDITER

{{SYSTEM_DESCRIPTION}}

## SECTEUR

{{SECTEUR}}

Génère les 20 questions que poserait l'auditeur. Réponds UNIQUEMENT avec ce JSON :
{
  "contexte_audit": "Introduction de l'audit et posture de l'auditeur (2-3 phrases)",
  "systeme_audite": "{{SYSTEM_DESCRIPTION_JSON}}",
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
}
