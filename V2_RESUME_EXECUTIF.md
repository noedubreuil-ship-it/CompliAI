# V2_RESUME_EXECUTIF — CompliAI
*Synthèse de l'audit complet — 24 juin 2026*

---

## Les trois constats les plus critiques

### Constat 1 — La moitié des outils sont des coquilles vides sur le plan juridique

Sur 22 générateurs de documents, 14 n'ont ni schéma de validation Zod, ni prompt spécialisé pour l'un d'eux (DPIA). Le générateur DPIA — l'outil le plus utilisé par les DPO — tourne sur un prompt générique de 12 lignes alors que le générateur de quiz étudiants dispose d'un cahier métier de 20 000 caractères. Les sorties de ces 14 outils ne sont jamais vérifiées post-génération : un article 35 §3 a) inventé, une exemption omise, un seuil chiffré erroné passent sans alerte. Le risque de responsabilité pour l'utilisateur qui implémente ces sorties est réel.

*Preuves : `app/api/generate/dpia/route.ts` (prompt inline 12 lignes), Phase 3 Critère 6 (3/5), Phase 2 E04a.*

---

### Constat 2 — Trois fonctionnalités présentées comme actives ne fonctionnent pas

**Les alertes email personnalisées** : le panel de configuration sauvegarde uniquement un état React local, sans aucun appel API. Aucune préférence n'est jamais persistée, aucun email ciblé n'est jamais envoyé. **L'auto-recharge de crédits** : l'UI présente une option "activer la recharge automatique" mais le code ne crée aucune charge Stripe — c'est une alerte email. **Le rate limiting Postgres** : la protection contre les abus de crédits et les attaques brute-force sur le reset de mot de passe appelle une RPC `increment_count` qui n'existe pas en base de données — la protection est un no-op depuis le déploiement initial.

*Preuves : `app/(app)/dashboard/alerts/page.tsx` (0 appel API), `lib/credits.ts:65` (RPC inexistante), Phase 2 E20b, E14b.*

---

### Constat 3 — CompliAI n'est pas conforme à l'AI Act qu'il aide à appliquer

L'application aide des organisations à se conformer à l'AI Act mais ne satisfait pas elle-même les exigences minimales qu'elle impose à ses clients : aucune documentation technique Annexe IV, aucun mécanisme de supervision humaine (Art. 14 — pas de bouton de signalement), aucun versionnage des prompts dans les logs (Art. 12 — traçabilité). La reproductibilité est nulle (score 1/5 en Phase 3) — deux requêtes identiques peuvent produire des qualifications juridiques divergentes sans que personne ne le détecte ni ne le mesure. Un outil de qualification AI Act non conforme à l'AI Act est un risque réputationnel et potentiellement réglementaire de premier ordre.

*Preuves : Phase 3 Critère 7 (1/5), Phase 3 Critère 4 (3/5), absence de `feedback_reports`, absence de `prompt_version` dans `ai_interaction_logs`.*

---

## Les trois priorités absolues pour la v2

### Priorité 1 — Réparer ce qui est cassé avant de construire (Sprint 1 — 3-4 jours)

Six corrections de taille Petite qui éliminent les vulnérabilités actives : corriger la RPC `increment_count` (H16), nommer honnêtement l'auto-recharge (H17a), versionner les prompts dans les logs (H13), corriger le max_tokens du scanner (H12), l'échappement HTML dans les emails (H19), la billing key policy (H18). Ces six corrections sont déployables en une seule PR sans risque de régression. Elles prennent 3-4 jours et éliminent 3 vulnérabilités de sécurité actives.

### Priorité 2 — Établir une mesure de qualité avant de toucher aux prompts (Sprint 2 — semaines 3-4)

Aucune amélioration de prompt ne peut être évaluée sans un golden-set de référence. Créer 30 questions de référence validées par un juriste (H02) est la condition préalable à toute amélioration de qualité juridique, y compris le prompt DPIA (H01). Sans cette mesure, chaque modification de prompt est un déploiement à l'aveugle sur un produit à usage juridique.

### Priorité 3 — Mettre CompliAI en conformité AI Act (Sprints 1 à 4)

Distribué sur les quatre sprints : versionnage des prompts (H13, Sprint 1), mécanisme de signalement des réponses (H15, Sprint 3), documentation technique Annexe IV produite avec l'outil Art. 11 de CompliAI lui-même (H14, Sprint 4). Ces trois actions constituent le minimum requis pour qu'un outil de qualification AI Act puisse lui-même prétendre à la conformité qu'il promet.

---

## Score de maturité actuel

| Dimension | Score |
|-----------|-------|
| Qualité juridique du moteur | 23/40 (58 %) |
| Fonctionnalités complètes | 16/20 fonctionnalités (3 cassées) |
| Conformité interne AI Act | Insuffisante (3 exigences Art. 12/14 absentes) |
| Sécurité | 2 vulnérabilités actives (rate limit, HTML injection) |
| Observabilité | Partielle (Sentry actif, logs AI non exploités) |

---

*Livrables produits : `AUDIT_PHASE_1_CARTOGRAPHIE.md`, `AUDIT_PHASE_2_FONCTIONNALITES.md`, `AUDIT_PHASE_3_QUALITE_JURIDIQUE.md`, `V2_HYPOTHESES_AMELIORATION.md`, `V2_ROADMAP.md`, `V2_RESUME_EXECUTIF.md`*
