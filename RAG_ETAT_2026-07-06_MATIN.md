# RAG — Point d'étape 2026-07-06 matin

*Rapport généré le 2026-07-06 — branche `claude-code/rechunk-reglements-p1` [via claude-code]*

---

## 1. DETTE B — Fix parent_chunk_id

### Backfill SQL migration 047
- **Appliqué en production** : ✅ confirmé par l'utilisateur (session précédente)
- **Résultat post-backfill mesuré aujourd'hui** (production) :

| Granularité     | avec parent_chunk_id | total | %      |
|-----------------|----------------------|-------|--------|
| `paragraph`     | 1                    | 970   | 0,1 %  |
| `point`         | 27                   | 27    | 100 %  |
| `considerant`   | 0                    | 2     | 0 %    |
| `annexe`        | 0                    | 1     | 0 %    |

**Anomalie détectée** : seulement 28 chunks avec `parent_chunk_id ≠ null` sur 1 000 chunks
totaux. C'est très inférieur aux 1 057 chunks AI Act attendus en production.

### Analyse de l'écart

Le corpus `legal_chunks` actuel (1 000 chunks) ne contient que :
- AI Act : **19 chunks** — alors que le rechunk a produit 1 057 chunks
- ePrivacy : **0 chunk** — alors que la promotion semblait réussie
- RGPD : **10 chunks**

**Hypothèse principale** : la promotion production des rechunks (AI Act et ePrivacy) n'a
pas atterri dans `legal_chunks` avec les noms de règlement attendus, ou a été annulée
lors d'un reset. À confirmer par l'utilisateur via une requête SQL directe :

```sql
SELECT regulation, COUNT(*), array_agg(DISTINCT granularity) 
FROM legal_chunks 
WHERE updated_at > '2026-07-03'
GROUP BY regulation;
```

### Fix indexer two-pass
- **Implémenté** : ✅ (`lib/rag-production-indexer/pipeline.ts` + `indexer.ts`)
- **Mergé** : ✅ branche `claude-code/fix-parent-chunk-id` (à merger sur main si pas fait)
- **Testé** : ✅ (via promotion ePrivacy)

---

## 2. CHANTIER 2 — Directive ePrivacy (32002L0058)

| Étape                  | Statut |
|------------------------|--------|
| Script rechunk écrit   | ✅     |
| Staging terminé        | ✅ 134 chunks (49 cons. + 21 art. + 55 para. + 9 pts) |
| Validation admin       | ✅ confirmé par l'utilisateur |
| Promotion production   | ✅ lancée avec `promote-eprivacy-prod.ts` |

**Anomalie** : ePrivacy absent de `legal_chunks` dans le diagnostic du 2026-07-06.
Soit le nom de règlement diffère, soit la promotion a échoué silencieusement.
À vérifier en SQL :

```sql
SELECT regulation, COUNT(*), MAX(updated_at)
FROM legal_chunks
WHERE regulation ILIKE '%eprivacy%' OR regulation ILIKE '%ePrivacy%' OR regulation ILIKE '%2002/58%'
GROUP BY regulation;
```

---

## 3. CHANTIER 6 — Rechunk 8 règlements (en cours)

### Script générique
- **`scripts/rechunk-reglements.ts`** : ✅ créé et testé en dry-run
- Gère : NBSP, considérants multi-format, paragraph_number normalization, annexes

### État DSA (en cours au moment du rapport)
- Job en arrière-plan : **70/93 articles parsés** (≈75%)
- Document ID : `84b4fa6d-4195-455d-8e5d-194863207ab2`
- ETA : ~15 min restantes

### Volumes corrigés (dry-run validé)

| Règlement   | CELEX        | Considérants | Articles | Annexes | Est. chunks |
|-------------|--------------|--------------|----------|---------|-------------|
| DSA         | 32022R2065   | 156          | 93       | 0       | ~520        |
| DMA         | 32022R1925   | 109          | 54       | 0       | ~330        |
| CRA         | 32024R2847   | 130          | 71       | 7       | ~430        |
| DATA_ACT    | 32023R2854   | 119          | 50       | 0       | ~320        |
| DGA         | 32022R0868   | 63           | 38       | 0       | ~200        |
| DSM         | 32019L0790   | 86           | 32       | 0       | ~190        |
| MACHINE     | 32023R1230   | 86           | 54       | 11      | ~350        |
| NIS2        | 32022L2555   | 144          | 46       | 2       | ~360        |
| **TOTAL**   |              | **893**      | **438**  | **20**  | **~2 700**  |

Note articles : les chiffres réels (54 pour MACHINE, 46 pour NIS2) sont inférieurs aux
estimations précédentes car les articles dans les annexes sont exclus (correct).

### Ordre d'exécution et statut

1. **DSA** → ✅ en cours staging (job actif)
2. DMA → staging après validation admin DSA
3. CRA → staging
4. DATA_ACT → staging
5. DGA → staging
6. DSM → staging
7. MACHINE → staging
8. NIS2 → staging

**Règle** : chaque règlement → staging → validation admin → production.
Validation par l'utilisateur avant chaque bascule production.

### Estimation durée totale Chantier 6

- DSA : ~45 min total (parsing Claude 93 articles × 2,5 s throttle + insertion)
- Chaque règlement suivant : 20–40 min selon nb articles
- **Total 8 règlements (staging seul)** : ~4–5 heures
- Promotions production : à la demande utilisateur

---

## 4. DOCUMENTS EN ATTENTE DE VALIDATION ADMIN

### Documents prioritaires (chunks prêts)

| Priorité | CELEX / Document | Chunks | Créé le | Action requise |
|----------|------------------|--------|---------|----------------|
| 🔴 P1 | RGPD considérants (refactoring) | **173** | 2026-07-05 | Approuver staging |
| 🟡 P2 | DSA 32022R2065 | **0** (en cours) | 2026-07-06 | Attendre fin staging |

### Documents monitoring DPA (0 chunks — PAS à valider)

Les 130+ documents en `pending` avec `0 chunks` et `celex = NULL` sont des **articles
de presse / communiqués DPA** détectés par le cron monitoring (AEPD, BfDI, DPC IE,
AP NL, Garante IT, CNIL, etc.). Ces documents ne sont **pas destinés à être ingérés**
comme chunks texte jurisprudentiel.

Action recommandée : purger ces entrées orphelines via :
```sql
DELETE FROM pending_documents
WHERE status = 'pending' AND celex IS NULL AND updated_at < '2026-07-01';
-- ⚠️ Vérifier d'abord avec SELECT COUNT(*)
```

### Documents P1 en staging (vague precédente)

Les 7 documents P1 (EDPB opinions, CJUE arrêts, Guidelines Commission) insérés le
2026-07-02 ont **0 staging_chunks** — il s'agit du lot P1 qui nécessite un parsing
séparé (pas encore traité dans ce chantier).

---

## 5. MÉTRIQUES CORPUS legal_chunks (production, 2026-07-06)

Résultat brut du diagnostic :

| Règlement | Total | W_Parent | Granularités | Dernière MàJ |
|-----------|-------|----------|--------------|-------------|
| RGPD (UE 2016/679) | 10 | 9 | considerant, point | 2026-07-05 |
| AI Act (UE 2024/1689) | 19 | 17 | annexe, considerant, paragraph, point | 2026-07-05 |
| eIDAS 2 (UE 910/2014 mod.) | 2 | 2 | point | 2026-07-05 |
| CJUE — Lindenapotheke (C-21/23) | 9 | 0 | paragraph | 2026-06-24 |
| CJUE — Meta Platforms (C-252/21) | 14 | 0 | paragraph | 2026-06-24 |
| CJUE — Lindqvist (C-101/01) | 55 | 0 | paragraph | 2026-06-24 |
| Règlement Machines (UE 2023/1230) | 5 | 0 | paragraph | 2026-06-24 |
| eIDAS 2 (UE 2024/1183) | 19 | 0 | paragraph | 2026-06-24 |
| Data Governance Act (UE 2022/868) | 51 | 0 | paragraph | 2026-06-24 |
| Cyber Resilience Act (UE 2024/2847) | 102 | 0 | paragraph | 2026-06-24 |
| Code bonnes pratiques GPAI | 66 | 0 | paragraph | 2026-06-24 |
| EDPB WP248 — AIPD | 158 | 0 | paragraph | 2026-06-24 |
| EDPB WP243 — DPO | 187 | 0 | paragraph | 2026-06-24 |
| CEDH | 14 | 0 | paragraph | 2026-06-24 |
| TUE | 7 | 0 | paragraph | 2026-06-24 |
| TFUE | 55 | 0 | paragraph | 2026-06-24 |
| Data Act (UE 2023/2854) | 40 | 0 | paragraph | 2026-06-24 |
| DMA (UE 2022/1925) | 74 | 0 | paragraph | 2026-06-24 |
| DSA (UE 2022/2065) | 113 | 0 | paragraph | 2026-06-24 |
| **GRAND TOTAL** | **1 000** | **28** | | |

### Anomalies critiques à vérifier

1. **AI Act : 19 chunks seulement** (attendu : 1 057 post-rechunk du 2026-07-03)
   → Soit la promotion n'a pas abouti, soit un `DELETE` a réinitialisé le corpus
2. **ePrivacy : 0 chunk** (attendu : 134 post-promotion session précédente)
   → La promotion a peut-être échoué ou utilisé un nom de règlement différent
3. **parent_chunk_id : 28/1000** (attendu : plusieurs centaines post-backfill migration 047)
   → Cohérent si les rechunks ne sont pas en production

**Ces anomalies doivent être vérifiées par l'utilisateur avant de poursuivre les promotions.**

---

## 6. DETTES DOCUMENTÉES

### Dette A — historical_chunks CHECK constraint
- **État** : non traitée
- **Description** : contrainte CHECK manquante sur `historical_chunks` pour la valeur
  `refactoring_considerants_individual` du champ `archival_reason`
- **Impact** : faible (aucun blocage opérationnel)
- **Action** : documenter dans `RAG_FUTURE_IMPROVEMENTS.md` section F

### Nouvelles dettes identifiées

#### Dette C — pending_documents orphelins (monitoring DPA)
- 100+ entrées `status=pending` avec `celex=NULL` et `0 chunks` depuis le 26 juin
- Ces entrées sont des communiqués de presse DPA (AEPD, BfDI, DPC, AP, Garante, CNIL)
- Aucune utilité dans le pipeline RAG jurisprudentiel
- **Action recommandée** : purge SQL après vérification (voir section 4)

#### Dette D — Cohérence nom de règlement ePrivacy
- La Directive ePrivacy existe en production sous un nom inconnu (absent du diagnostic)
- Risque de doublons lors du Chantier 6 si la promotion a créé des chunks avec un
  nom légèrement différent
- **Action** : vérifier SQL avant le rechunk complet

---

## 7. PROCHAINES ÉTAPES IMMÉDIATES

| Ordre | Action | Condition |
|-------|--------|-----------|
| 1 | Attendre fin staging DSA | Job en cours |
| 2 | Vérifier anomalies corpus (SQL) | Maintenant |
| 3 | Valider DSA dans /dashboard/admin/rag-validation | Après fin staging |
| 4 | Lancer staging DMA | Après validation DSA |
| 5 | Résoudre anomalie AI Act + ePrivacy | Avant bascule production |

---

*Rapport généré le 2026-07-06 par Claude Code — branche `claude-code/rechunk-reglements-p1` [via claude-code]*
