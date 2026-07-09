# V2_ROADMAP — CompliAI
*Produit le 24 juin 2026. Hiérarchise les hypothèses P0 et P1 en quatre sprints de deux semaines.*

---

## Principes de construction

- Les P0 sont tous traités avant les P1
- Les quick wins (effort Petit) sont regroupés dans Sprint 1 pour dégager de la confiance
- Les dépendances techniques commandent l'ordre : H02 (golden-set) avant H01 (DPIA) pour pouvoir valider la qualité du nouveau prompt
- La conformité AI Act interne (H13, H14, H15) est distribuée sur les quatre sprints, pas concentrée en fin de roadmap
- Les P2 et P3 sont en backlog — non planifiés dans cette roadmap

---

## Sprint 1 — Fondations (Semaines 1–2)

### Objectif
Éliminer les bugs critiques, corriger les promesses trompeuses, et poser les bases de l'observabilité. Toutes les tâches sont de taille Petite — un seul développeur peut les traiter en parallèle.

### Hypothèses traitées

| Hypothèse | Effort | Catégorie |
|-----------|--------|-----------|
| **H16** — Corriger bug checkRateLimit (RPC `increment_count` inexistante) | Petit | Sécurité |
| **H17a** — Renommer "auto-recharge" en "alerte crédits bas" | Petit | Monétisation |
| **H13** — Versionnage hash des prompts dans `ai_interaction_logs` | Petit | Conformité AI Act |
| **H12** — Scanner max_tokens 2 500 → 4 000 + TOOL_CONFIGS.audit dédié | Petit | Performance |
| **H18** — Corriger billing key `policy` (doc_memoire → policy) | Petit | Monétisation |
| **H19** — Escaping HTML dans les emails Resend | Petit | Sécurité |

### Justification du regroupement

Ces six hypothèses partagent une propriété : elles sont toutes des corrections de code existant avec 0 nouvelle dépendance et 0 risque de régression sur la logique métier. Elles peuvent être déployées en une seule PR. H16 et H19 sont des vulnérabilités actives — leur traitement en Sprint 1 est non-négociable.

### Dépendances inter-tâches

```
H16 (migration SQL) → déployer en base AVANT la mise en production du code
H13 (colonne prompt_version sur ai_interaction_logs) → migration SQL requise
H12 (variables d'env) → ajout dans .env.local + Vercel env vars
Pas d'autre dépendance entre les tâches du sprint
```

### Risques techniques

- **H16** : La migration SQL `upsert_ai_rate_limit` doit être testée en staging avant production. Un bug dans la fonction SQL peut bloquer tous les appels IA.
- **H13** : Le hash SHA-256 du prompt est calculé à chaque requête → impact latence < 1 ms (négligeable).

### Ressources nécessaires

- 1 développeur full-stack, 3-4 jours effectifs
- Accès Vercel (variables d'environnement)
- Accès Supabase (exécution migrations)
- Aucune dépendance API tierce nouvelle

### Critères de validation de fin de sprint

- [ ] `ai_rate_limits.count` s'incrémente correctement sur 10 requêtes consécutives du même user (test manuel)
- [ ] `ai_interaction_logs.prompt_version` non-null sur toutes les nouvelles lignes
- [ ] `scanner` ne tronque plus sur une page de 3 000 tokens (test manuel sur une page web complexe)
- [ ] Wording "Alerte crédits bas" affiché dans l'UI crédits
- [ ] 0 interpolation non-échappée dans les templates HTML d'email (audit code)
- [ ] Métriques `policy` distinctes de `doc_memoire` dans les logs admin

---

## Sprint 2 — Qualité juridique (Semaines 3–4)

### Objectif

Élever la qualité du moteur juridique sur les deux dimensions les plus impactantes : prompt DPIA dédié et CI de régression. Ajouter les textes sectoriels prioritaires au corpus RAG.

### Hypothèses traitées

| Hypothèse | Effort | Catégorie |
|-----------|--------|-----------|
| **H02** — Golden-set 30 questions + CI de régression | Moyen | Qualité juridique |
| **H01** — Prompt DPIA dédié (`dpia-art35-rgpd-v1.md`) | Moyen | Qualité juridique |
| **H03** — Corpus lot 1 : LED (UE 2016/680) + DPF 2023 + EDPB Opinion 28/2024 | Petit/lot | Qualité juridique |
| **H04** — Zod validation pour DPIA, FRIA, classifier, art11, scanner | Moyen | Qualité juridique |

### Justification du regroupement

H02 (golden-set) doit précéder H01 (DPIA) : c'est le golden-set qui permettra de mesurer si le nouveau prompt DPIA améliore réellement la qualité. H03 (corpus) est indépendant mais bénéficie au golden-set si les questions de référence couvrent des sujets sectoriels. H04 (Zod) est complémentaire à H01 : le nouveau prompt DPIA mérite un schéma de validation de sa sortie.

### Dépendances inter-tâches

```
H02 (golden-set baseline) → doit être exécuté AVANT H01 pour établir la mesure de référence
H03 (ingestion corpus) → indépendant, peut se faire en parallèle
H01 (prompt DPIA) → requiert que H02 soit finalisé pour validation
H04 (Zod) → indépendant, peut se faire en parallèle avec H01
```

### Risques techniques

- **H01** : Le nouveau prompt DPIA doit produire un JSON compatible avec le frontend DPIA existant. Si la structure change, le frontend doit être mis à jour en même temps — risque de régression UI.
- **H02** : La validation des 30 questions de référence nécessite une revue juridique externe (ou interne si le fondateur est juriste). Sans validation par un juriste, le golden-set lui-même peut contenir des erreurs.
- **H04** : Les schémas Zod doivent commencer en `.partial()` pour éviter les faux rejets sur des sorties valides avec champs optionnels absents.

### Ressources nécessaires

- 1 développeur full-stack, 8-10 jours effectifs
- **1 juriste (interne ou externe)** pour valider les 30 questions du golden-set et le prompt DPIA — coût estimé : 2-4 heures de consultation
- Accès Supabase (ingestion corpus)
- Clé OpenAI (embeddings ingestion corpus)

### Critères de validation de fin de sprint

- [ ] 30 questions de référence dans `tests/golden-set/` avec critères de validation documentés
- [ ] CI vitest passe sur le golden-set sans erreur
- [ ] `dpia-art35-rgpd-v1.md` > 8 000 chars, couvre les 9 critères WP248 (vérification manuelle)
- [ ] Score moyen du nouveau prompt DPIA > score du prompt générique sur 5 questions de test (évaluation juriste)
- [ ] Corpus : LED, DPF, EDPB Opinion 28/2024 ingérés, chunks > 0 en base
- [ ] Les 5 générateurs cibles ont un schéma Zod actif — 0 erreur 500 silencieuse sur les tests fonctionnels

---

## Sprint 3 — Expérience produit (Semaines 5–6)

### Objectif

Tenir les promesses produit : alertes email réelles, documents partagés lisibles, supervision humaine des réponses IA. Ce sprint a la particularité de concentrer trois hypothèses P0 liées aux engagements contractuels implicites envers les utilisateurs.

### Hypothèses traitées

| Hypothèse | Effort | Catégorie |
|-----------|--------|-----------|
| **H07** — Alertes email réellement persistées et envoyées | Moyen | UX / Promesse produit |
| **H15** — Mécanisme de signalement des réponses incorrectes | Moyen | Conformité AI Act Art. 14 |
| **H08** — Rendu lisible des documents partagés publiquement | Moyen | UX |
| **H21** — Alerting Sentry sur troncatures et erreurs critiques | Petit | Observabilité |

### Justification du regroupement

H07 et H15 sont tous deux des P0 centrés sur la relation utilisateur : l'un tient une promesse fonctionnelle, l'autre installe la supervision humaine requise par l'Art. 14 AI Act. Ils sont naturellement groupés. H08 complète Sprint 3 car il améliore la valeur perçue sans risque de régression. H21 (Sentry) est ajouté ici pour que l'observabilité soit en place avant la mise en production des fonctionnalités plus complexes du Sprint 4.

### Dépendances inter-tâches

```
H07 nécessite une colonne `alert_prefs` sur `profiles` (migration) + mise à jour cron
H15 nécessite une table `feedback_reports` (migration) + UI + API
H08 nécessite un renderer de document structuré (new component)
H21 indépendant
```

### Risques techniques

- **H07** : Le cron `regulatory-watch` doit être mis à jour pour lire les préférences par utilisateur avant d'envoyer. Risque de volume d'emails si tous les utilisateurs sont activés par défaut — opt-in recommandé.
- **H15** : Protéger l'endpoint signalement contre le spam (rate limiting 3 signalements/heure/utilisateur).
- **H08** : Chaque type de document (checklist, DPIA, RoPA, FRIA...) a un format JSON différent → prévoir un switch sur `doc_type`.

### Ressources nécessaires

- 1 développeur full-stack, 8-10 jours effectifs
- Compte Resend (vérifier quotas emails pour H07)
- Aucune API tierce nouvelle

### Critères de validation de fin de sprint

- [ ] Un utilisateur ayant sauvegardé des préférences reçoit un email de veille dans les 48h (test end-to-end)
- [ ] Bouton "Signaler une erreur" visible sur 100 % des réponses consultant (test UI)
- [ ] Un signalement crée une ligne dans `feedback_reports` et envoie un email admin (test fonctionnel)
- [ ] Page `/share/[token]` : document rendu en format structuré, `JSON.parse` dans try/catch
- [ ] Sentry alerte configurée sur `response_truncated` > 5/heure

---

## Sprint 4 — Conformité interne et observabilité (Semaines 7–8)

### Objectif

Finaliser la conformité AI Act interne du produit (documentation, supervision) et enrichir le corpus RAG sectoriel. Sprint de consolidation avant release v2.

### Hypothèses traitées

| Hypothèse | Effort | Catégorie |
|-----------|--------|-----------|
| **H14** — Documentation technique Annexe IV pour CompliAI lui-même | Petit | Conformité AI Act |
| **H03 lot 2** — Corpus : DORA (UE 2022/2554) + Convention 108+ | Petit/lot | Qualité juridique |
| **H03 lot 3** — Corpus : MDR (UE 2017/745) version allégée + CRA (UE 2024/2847) | Petit/lot | Qualité juridique |
| **H21 bis** — Dashboard admin `ai_interaction_logs` léger (tables, pas charts) | Moyen | Observabilité |

### Justification du regroupement

H14 clôt le cycle de conformité AI Act interne ouvert en Sprint 1 (H13) et Sprint 3 (H15). Les deux lots de corpus complètent la couverture sectorielle entamée en Sprint 2. Le dashboard admin est positionné en Sprint 4 car il nécessite que les données de `ai_interaction_logs` avec `prompt_version` (Sprint 1) soient accumulées pendant quelques semaines pour être exploitables.

### Dépendances inter-tâches

```
H14 peut être produit avec l'outil Art. 11 de CompliAI lui-même
H03 lots 2 et 3 indépendants du reste
Dashboard admin : dépend de données accumulées depuis Sprint 1 (H13)
```

### Risques techniques

- **H03 lots 2-3** : MDR et DORA sont des textes très longs (100+ pages). Chunking article-level peut générer 500+ chunks chacun → vérifier l'impact sur les performances de recherche et les coûts d'embedding.
- **Dashboard admin** : Requêtes d'agrégation sur `ai_interaction_logs` peuvent être lentes si la table croît vite. Ajouter un index sur `created_at` avant.

### Ressources nécessaires

- 1 développeur full-stack, 5-7 jours effectifs
- Clé OpenAI (embeddings corpus)
- Accès Supabase

### Critères de validation de fin de sprint

- [ ] `TECHNICAL_DOCUMENTATION_ANNEX_IV.md` accessible dans `/docs` ou repo public, couvrant les 9 sections de l'Annexe IV AI Act
- [ ] DORA et Convention 108+ ingérés, chunks > 0 confirmés en base
- [ ] Page admin `/dashboard/admin/logs` accessible aux admins, affichant au moins : top 10 questions, taux de troncature, taux de réécriture citation
- [ ] Couverture globale P0 : 8/8 hypothèses P0 déployées en production

---

## Vue d'ensemble de la roadmap

```
Semaine 1-2     Semaine 3-4     Semaine 5-6     Semaine 7-8
────────────    ────────────    ────────────    ────────────
Sprint 1        Sprint 2        Sprint 3        Sprint 4
Fondations      Qualité         Expérience      Conformité +
                juridique       produit         Observabilité

H16 ──────────────────────────────────────────────────────
H17a ─────────
H13 ──────────────────────────────────────────────────────
H12 ──────────
H18 ──────────
H19 ──────────
              H02 (golden-set)
              H01 (DPIA prompt) ← dépend H02
              H03 lot 1 ────────────────────── H03 lots 2-3
              H04 (Zod)
                              H07 (alertes)
                              H15 (signalement)
                              H08 (partage)
                              H21 ──────────── H21 bis
                                              H14 (Annex IV)
```

---

## Backlog post-v2 (hypothèses P2 non planifiées)

| Hypothèse | Raison du report |
|-----------|-----------------|
| H05 — BM25 hybride | Effort Grand, dépendance `pg_bm25` expérimental |
| H06 — Corpus jurisprudence paddé | Effort Moyen, bloqué par disponibilité EUR-Lex text intégral |
| H09 — Supprimer brain_nodes | Petit mais risque d'API externe non encore vérifié |
| H10 — Brain Chat sémantique | Moyen, feature non-critique |
| H11 — Cache sémantique | Grand, architecture complexe |
| H17b — Auto-recharge Stripe réelle | Grand, implications PSD2/RGPD |
| H20 — Dashboard admin complet | Report partiel (dashboard léger en Sprint 4) |

---

## Budget et ressources globales

| Ressource | Estimation v2 complète |
|-----------|----------------------|
| Développement | 25-30 jours/homme |
| Consultation juriste (golden-set + prompt DPIA) | 4-6 heures |
| Coût API OpenAI (ingestion corpus) | ~5-15 € |
| Coût API Anthropic (CI golden-set × 30 questions × runs) | ~20-50 € / run CI |
| Infra (Vercel, Supabase, Upstash) | Aucun coût supplémentaire sur les plans actuels |

---

*Fin de la Phase 5.*
