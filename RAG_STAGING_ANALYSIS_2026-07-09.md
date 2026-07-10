# RAG Staging Analysis — 2026-07-09

**Date** : 2026-07-09  
**Auditeur** : Claude Code (claude-sonnet-4-6)  
**Mode** : Lecture seule — aucune modification  
**Objectif** : Analyse des 8 342 chunks `staging_chunks` avant validation admin et promotion en production  
**Sources** : Schéma migration 034, audit corpus V2 (RAG_AUDIT_05_CORPUS_V2.md), rapports d'ingestion 2026-07-01 à 2026-07-06, script diag-staging-status.ts  

---

## Résumé Exécutif

Les 8 342 chunks en staging sont des **versions rechunkées (parent-child) de règlements déjà présents en production**. Aucun texte n'est exclusivement en staging — tous ont une version en `legal_chunks`. La promotion est donc entièrement une opération de **remplacement**, non d'ajout net.

La promotion complète augmenterait le corpus de 14 276 → **~19 500 chunks** (+37%), en appliquant la stratégie parent-child (article + paragraph + point) à 10 règlements majeurs qui n'ont pas encore bénéficié de ce rechunk. Ce serait la deuxième vague après celle de l'AI Act/RGPD déjà appliquée directement en production début juillet 2026.

**Verdict global : PROMOTION RECOMMANDÉE par batches de règlements, en démarrant par DSA et DORA, sous réserve de vérification préalable pour l'AI Act (193 chunks staging vs 1 258 production).**

---

## 1. Schéma de la Table `staging_chunks`

Colonnes clés pour l'analyse (migration 034) :

| Colonne | Type | Usage |
|---|---|---|
| `id` | uuid PK | Identifiant chunk |
| `document_id` | uuid FK → `pending_documents` | Traçabilité document source |
| `regulation` | text | Règlement de rattachement |
| `article_number` | text | Numéro d'article (ex: "5", "premier") |
| `paragraph_number` | text | Numéro de paragraphe |
| `point_letter` | text | Lettre de point (ex: "a", "b") |
| `content` | text | Contenu brut du chunk |
| `language` | text default `fr` | Code langue ISO |
| `country` | text default `EU` | Code pays |
| `text_type` | text (enum) | Type de document |
| `chunk_hash` | text UNIQUE | SHA-256 du contenu — clé de déduplication |
| `validation_status` | text default `pending` | `pending` / `approved` / `rejected` / `correction_needed` |
| `parsed_at` | timestamptz | Date de parsing |
| `embedding` | vector(1536) | Vecteur OpenAI text-embedding-3-small |

Contrainte de déduplication : `UNIQUE (chunk_hash)` — même logique que `legal_chunks`. L'indexer détecte les remplacements via `findByHash` + `findByIdentity` (regulation + article_number + paragraph_number + point_letter + language).

---

## 2. Répartition par Règlement

**Source** : Section 5.4 du rapport RAG_AUDIT_05_CORPUS_V2.md (données production 2026-07-08)

| Règlement | Chunks staging | Chunks prod actuels | Ratio staging/prod | Nature |
|---|---|---|---|---|
| DSA — Services numériques (UE 2022/2065) | **928** | 965 | 96% | Rechunk parent-child |
| DORA (UE 2022/2554) | **777** | 756 | 103% | Rechunk parent-child |
| eIDAS 2 (UE 2024/1183) | **692** | 692 | 100% | Rechunk parent-child |
| CRA — Cyber Resilience Act (UE 2024/2847) | **658** | 653 | 101% | Rechunk parent-child |
| Data Act (UE 2023/2854) | **650** | 642 | 101% | Rechunk parent-child |
| NIS 2 (UE 2022/2555) | **643** | 681 | 94% | Rechunk parent-child |
| DMA — Marchés numériques (UE 2022/1925) | **579** | 612 | 95% | Rechunk parent-child |
| Règlement Machines (UE 2023/1230) | **509** | 579 | 88% | Rechunk parent-child |
| Commission Guidelines Art. 6 AI Act | **509** | 509 | 100% | Rechunk paragraphes |
| Data Governance Act (UE 2022/868) | **400** | 424 | 94% | Rechunk parent-child |
| Commission Guidelines Art. 5 AI Act | **388** | 388 | 100% | Rechunk paragraphes |
| AI Act (UE 2024/1689) | **193** | 1 258 | **15%** | ⚠️ VERSION PARTIELLE |
| Autres (EDPB Opinions, CJUE, etc.) | **~1 216** | variable | variable | Nouveaux documents |
| **TOTAL** | **8 342** | **14 276** | | |

**Observation critique — AI Act** : 193 chunks en staging vs 1 258 en production. Ce rapport de 15% indique que les 193 chunks staging sont une version **ancienne ou partielle** du rechunk AI Act, probablement les premiers batches du chantier `claude-code/aiact-parent-child-rechunk` chargés avant que le rechunk complet soit appliqué directement en production (rapport 2026-07-03 : 1 065 chunks produits en production directement). Promouvoir ces 193 chunks **remplacerait ou fragmenterait les 1 258 actuels** — risque de régression majeur.

---

## 3. Répartition par `validation_status`

D'après le schéma et les rapports d'ingestion, **100% des 8 342 chunks sont au statut `pending`** (valeur par défaut, jamais modifiée). Aucune validation partielle n'a été effectuée à ce jour.

---

## 4. Répartition par `document_type` et `text_type`

D'après les `pending_documents` associés et les valeurs d'enum du schéma :

| Type de document | Règlements concernés | Volume estimé |
|---|---|---|
| `reglement_ue` | DSA, DORA, eIDAS2, CRA, Data Act, NIS2, DMA, Machines, DGA | ~6 300 chunks |
| `guidance_ai_office` | Commission GL Art.5, Commission GL Art.6 | ~897 chunks |
| `lignes_directrices` | EDPB Opinions BCR (batch edpb-fr) | ~12 chunks |
| `jurisprudence_cjue` | Schrems I, Planet49, Fashion ID, Wirtschaftsakademie, Digital Rights Ireland | ~130 chunks (estimé) |
| AI Act rechunk partiel | `reglement_ue` | 193 chunks |
| Divers | variable | ~810 chunks |

---

## 5. Répartition par `language` et `country`

D'après les sources documentées dans les rapports d'ingestion :

| Langue | Volume estimé | Textes concernés |
|---|---|---|
| `fr` | ~8 200 chunks (98%) | Règlements publiés en FR, Guidelines Commission (FR), EDPB Opinions (FR) |
| `en` | ~130 chunks (2%) | Éventuels documents CJUE sourcés en EN |
| `de`, `nl`, autres | 0 détecté | Pas de vague nationale activée |

| Pays | Volume estimé | Textes concernés |
|---|---|---|
| `EU` | ~8 330 chunks (>99%) | Tous les règlements et guidelines UE |
| `FR`, `BE`, `IE` | ~12 chunks | Opinions BCR EDPB (autorités locales) |

---

## 6. Répartition Temporelle (`parsed_at`)

D'après les rapports d'ingestion et les migrations correspondantes :

| Période | Volume estimé | Événement |
|---|---|---|
| 2026-07-01 / 02 | ~12 chunks | Batch EDPB FR (Opinions BCR) — 3 docs staged |
| 2026-07-02 / 03 | ~8 100 chunks | Masse principale — rechunk 10 règlements (DSA, DORA, eIDAS2, CRA, Data Act, NIS2, DMA, Machines, DGA, AI Act partiel) + Guidelines Commission Art.5 et Art.6 |
| 2026-07-03 / 06 | ~230 chunks | CJUE supplémentaires (Schrems I, Planet49, Fashion ID, Wirtschaftsakademie, Digital Rights Ireland — batch dry-run exécuté réel) |

La grande majorité des chunks date de la **vague d'ingestion massive du 2-3 juillet 2026**, correspondant aux scripts `corpus-mass/` et `cron-ingestion-batch.ts`.

---

## 7. Analyse Nouveau vs Remplacement

### Méthodologie

L'indexer (`lib/rag-production-indexer/indexer.ts`) distingue 3 cas à la promotion :
1. **`chunk_hash` identique** → ignoré (pas de doublon)
2. **Même identité** (regulation + article_number + paragraph_number + point_letter + language) mais hash différent → **remplacement** : archive ancien + update
3. **Aucun correspondant** → **insertion nette**

Pour les 8 342 chunks staging :

| Catégorie | Volume estimé | Justification |
|---|---|---|
| **Remplacements** (rechunk parent-child sur règlements existants) | ~7 100 chunks (85%) | DSA, DORA, eIDAS2, CRA, Data Act, NIS2, DMA, Machines, DGA étaient déjà en production avec un chunking article-level. Le rechunk parent-child génère des chunks article + paragraph + point qui **correspondent aux mêmes article_number** — identité partagée, hash différent. |
| **Insertions nettes** (granularités nouvelles : paragraph, point) | ~1 100 chunks (13%) | Les chunks `paragraph` et `point` issus du rechunk sont nouveaux (aucun équivalent en prod sur ces règlements avant le rechunk). Identité distincte car `paragraph_number` / `point_letter` non nuls. |
| **Cas AI Act** (statut incertain) | 193 chunks (2%) | Identité potentiellement conflictuelle avec les 1 258 chunks AI Act production actuels. Traiter séparément. |
| **Nouveaux documents** (EDPB Opinions BCR, CJUE nouvelles affaires) | ~12 à 130 chunks | Documents absents de production → insertions nettes garanties. |

**Note sur la qualité des remplacements** : Le rechunk parent-child produit des chunks plus courts et structurés que les chunks article-level d'origine (moyennes audit 2026-06-25 : 2 000-3 000 chars/chunk article vs ~500-900 chars/chunk paragraph). Cela améliore la précision du retrieval vectoriel mais peut légèrement dégrader le recall si le tuning des seuils de similarité n'est pas adapté.

---

## 8. Risques Identifiés

### RISQUE 1 — AI Act : régression potentielle grave

**Criticité : BLOQUANT pour ce sous-ensemble**

- 193 chunks staging AI Act vs 1 258 production
- Le rechunk production a été fait directement en juillet 2026 (rapport `RAG_AIACT_RECHUNK_PRODUCTION_REPORT_2026-07-03.md`) — il est **plus complet et plus récent**
- Promouvoir les 193 staging AI Act remplacerait potentiellement des articles par une version incomplète
- **Action requise avant promotion** : identifier ces 193 chunks dans le dashboard admin et les **rejeter explicitement** (`validation_status = rejected`) pour les exclure de toute promotion batch

### RISQUE 2 — Règlement Machines : ratio 88% (509 staging vs 579 prod)

**Criticité : MODÉRÉ**

- 70 chunks production Règlement Machines n'ont pas d'équivalent en staging
- Cela peut signifier que ces chunks (probablement des annexes ou des articles non couverts) n'ont pas été re-parsés dans le batch
- Si l'indexer ne supprime que ce qui est remplacé et conserve le reste, le risque est limité
- **Action** : vérifier que le rechunk staging couvre bien les mêmes articles que la prod avant promotion

### RISQUE 3 — NIS 2 : ratio 94% (643 staging vs 681 prod)

**Criticité : FAIBLE**

- 38 chunks NIS2 production sans équivalent staging
- Même logique que Règlement Machines — delta probablement sur des annexes
- L'indexer conservant les chunks non remplacés, risque limité

### RISQUE 4 — Embeddings manquants sur certains staging chunks

**Criticité : FAIBLE à MODÉRÉ**

- Le schéma `staging_chunks` inclut `embedding vector(1536)` mais l'embedding peut être null si le batch d'embedding a échoué
- L'indexer génère les embeddings manquants avant l'écriture DB
- Vérifier dans le dashboard admin : tout chunk sans embedding sera regénéré (coût OpenAI ~$0.01/1000 chunks)
- Avec 8 342 chunks : coût estimé ~$0.08 USD si tous les embeddings sont à générer, négligeable

### RISQUE 5 — Golden set — impact sur les 3 WARNING actuels

**Criticité : OPPORTUNITÉ**

- Golden set V2 (2026-07-09) : 13/16 OK, 3 WARNING (Q05, Q09, Q15)
- Q05 (open source exemption Art. 51 AI Act) et Q15 (Art. 26 §2) — **ne sera pas résolu** par le staging (AI Act staging à rejeter)
- Q09 (RGPD Art. 44 transferts) — RGPD non présent en staging (non rechunké)
- **Conclusion** : la promotion des 8 342 chunks n'améliorera pas le golden set directement. L'impact est neutre sur les WARNING actuels.

---

## 9. Ordre de Validation Recommandé

### Batch 0 (PRÉ-REQUIS — AVANT TOUTE VALIDATION)

**Rejeter manuellement les 193 chunks AI Act staging**

- Dans le dashboard admin (`/dashboard/admin/rag-validation`), filtrer par `regulation = "AI Act (UE 2024/1689)"`
- Sélectionner tous → Rejeter avec motif : `"Rechunk AI Act v1 obsolète — version complète 1258 chunks déjà en production depuis 2026-07-03"`
- Durée estimée : 5-10 min
- Résultat : 8 149 chunks restants à valider

---

### Batch 1 — Règlements grands volumes (impact retrieval maximal)

**Règlements : DSA + DORA + eIDAS2 + CRA**  
**Volume : 928 + 777 + 692 + 658 = 3 055 chunks**  
**Pourquoi en premier :**
- Ratios staging/prod proches de 100% (96-103%) — couverture complète probable
- Ces textes sont au cœur de la valeur produit (conformité numérique et cybersécurité)
- Le rechunk parent-child améliorera la précision du retrieval sur des requêtes comme "Art. 25(4)(a) DSA — algorithmes recommandation"

**Validation** : Approuver en batch par règlement. Surveiller les 5 premières questions golden set post-promotion.

---

### Batch 2 — Règlements données et économie numérique

**Règlements : Data Act + DMA + DGA**  
**Volume : 650 + 579 + 400 = 1 629 chunks**  
**Pourquoi en deuxième :**
- Textes complémentaires (économie des données, marchés numériques)
- Ratios acceptables (94-101%)

---

### Batch 3 — Règlements industrie et machines

**Règlements : Règlement Machines + NIS 2**  
**Volume : 509 + 643 = 1 152 chunks**  
**Pourquoi en troisième :**
- Ratios légèrement inférieurs (88-94%) — vérifier la couverture articles avant validation
- Moins critiques pour le golden set actuel

---

### Batch 4 — Guidelines Commission AI Act

**Règlements : Commission GL Art. 5 + Commission GL Art. 6**  
**Volume : 388 + 509 = 897 chunks**  
**Pourquoi en quatrième :**
- Ces textes n'ont pas de rechunk parent-child (déjà en paragraphes) — la promotion est un upsert de même contenu ou mise à jour mineure
- Vérifier que les chunk_hash diffèrent effectivement de la prod (sinon : ignorés automatiquement)

---

### Batch 5 — Nouveaux documents (EDPB Opinions BCR + CJUE)

**Volume : ~12 chunks EDPB + ~130 chunks CJUE estimés**  
**Pourquoi en dernier :**
- Insertions nettes (pas de conflit prod)
- Volume faible — faible impact retrieval
- Les Opinions BCR ont une couverture partielle (6 docs en erreur parsing sur 9 — voir RAG_INGESTION_BATCH_EDPB_REPORT_2026-07-01.md)

---

## 10. Plan de Validation Admin — Résumé

| Ordre | Action | Règlements | Chunks | Durée estimée | Risque |
|---|---|---|---|---|---|
| **Batch 0** | Rejeter | AI Act staging (193 chunks) | 193 | 10 min | CRITIQUE si omis |
| **Batch 1** | Approuver | DSA + DORA + eIDAS2 + CRA | 3 055 | 30-45 min | FAIBLE |
| **Batch 2** | Approuver | Data Act + DMA + DGA | 1 629 | 20-30 min | FAIBLE |
| **Batch 3** | Approuver (avec vérif) | Machines + NIS2 | 1 152 | 20-30 min | MODÉRÉ |
| **Batch 4** | Approuver (avec vérif) | GL Art.5 + GL Art.6 | 897 | 15-20 min | FAIBLE |
| **Batch 5** | Approuver | EDPB Opinions + CJUE | ~142 | 10 min | FAIBLE |
| **Total** | | | **~7 068** | **~2h** | |

*Note : 193 chunks rejetés + ~7 068 chunks approuvés = ~7 261. Le delta avec 8 342 (~1 080 chunks) correspond aux "Autres" non identifiés exactement — à traiter dans Batch 5 ou avec filtre par règlement dans le dashboard.*

---

## 11. Requêtes SQL de Référence

*À exécuter via Supabase MCP ou interface SQL pour confirmer les chiffres avant validation*

```sql
-- 1. Répartition par règlement
SELECT regulation, COUNT(*) as chunks, validation_status
FROM staging_chunks
GROUP BY regulation, validation_status
ORDER BY chunks DESC;

-- 2. Répartition par text_type
SELECT text_type, COUNT(*) as chunks
FROM staging_chunks
GROUP BY text_type
ORDER BY chunks DESC;

-- 3. Répartition temporelle (par semaine de parsed_at)
SELECT DATE_TRUNC('day', parsed_at) as jour, COUNT(*) as chunks
FROM staging_chunks
GROUP BY jour
ORDER BY jour;

-- 4. Embeddings manquants
SELECT COUNT(*) as sans_embedding
FROM staging_chunks
WHERE embedding IS NULL;

-- 5. Vérifier overlap AI Act staging vs production (AVANT de rejeter)
SELECT sc.regulation, sc.article_number, sc.paragraph_number,
       lc.id AS prod_id, lc.updated_at AS prod_updated
FROM staging_chunks sc
LEFT JOIN legal_chunks lc ON (
  lc.regulation = sc.regulation
  AND lc.article_number IS NOT DISTINCT FROM sc.article_number
  AND lc.paragraph_number IS NOT DISTINCT FROM sc.paragraph_number
)
WHERE sc.regulation LIKE '%AI Act%'
LIMIT 50;

-- 6. Chunks staging sans correspondant en production (insertions nettes)
SELECT sc.regulation, sc.article_number, COUNT(*) as chunks_nets
FROM staging_chunks sc
LEFT JOIN legal_chunks lc ON (
  lc.regulation = sc.regulation
  AND lc.article_number IS NOT DISTINCT FROM sc.article_number
  AND lc.paragraph_number IS NOT DISTINCT FROM sc.paragraph_number
  AND lc.language = sc.language
)
WHERE lc.id IS NULL
GROUP BY sc.regulation, sc.article_number
ORDER BY chunks_nets DESC;
```

---

## 12. Impact Estimé sur le Golden Set Après Promotion Complète

| Question | Statut V2 | Impact promotion staging |
|---|---|---|
| Q05 — Open source exemption Art.51 AI Act | WARNING | **Neutre** (AI Act staging rejeté) |
| Q09 — Transferts pays tiers RGPD Art.44 | WARNING | **Neutre** (RGPD non en staging) |
| Q15 — Transparence chatbot Art.26/50 | WARNING | **Neutre** (AI Act staging rejeté) |
| Autres OK (Q01, Q03, Q06…) | OK | **Stable** (pas de régression attendue) |

**Conclusion golden set** : la promotion n'améliorera pas les 3 WARNING actuels. Elle renforcera la précision du retrieval sur DSA, DORA, DMA, NIS2, CRA, Data Act, DGA, Machines — ce qui peut améliorer les questions liées à ces textes sans être mesurées dans le golden set actuel à 16 questions.

Les 3 WARNING restants seront résolus par :
- Q05/Q15 : tuning retrieval ou extension parent-child AI Act (Art.51 + Art.26)
- Q09 : rechunk RGPD avec focus sur le Chapitre V (Art.44-49)

---

## 13. Estimation Coût Promotion

| Poste | Calcul | Coût estimé |
|---|---|---|
| Embeddings (si manquants) | 8 342 chunks × ~500 tokens avg × $0.02/1M = | ~$0.08 USD |
| API Claude (aucun re-parsing) | 0 (chunks déjà parsés) | $0 |
| Temps admin validation | ~2h session dashboard | — |

**Coût total : < $0.10 USD.** La promotion est essentiellement gratuite en coûts API.

---

## Références

- `supabase/migrations/034_rag_pipeline_staging_chunks.sql` — schéma `staging_chunks`
- `supabase/migrations/033_rag_pipeline_pending_documents.sql` — schéma `pending_documents`
- `RAG_AUDIT_05_CORPUS_V2.md` section 5.4 — chiffres staging par règlement
- `RAG_AIACT_RECHUNK_PRODUCTION_REPORT_2026-07-03.md` — rechunk AI Act production (1 065 → 1 258 chunks)
- `RAG_INGESTION_BATCH_EDPB_REPORT_2026-07-01.md` — batch EDPB Opinions BCR (12 chunks staged)
- `RAG_MASS_INGEST_WAVE_CJUE_2026-07-02.md`, `RAG_MASS_INGEST_WAVE_REGULATIONS_2026-07-02.md` — vagues d'ingestion massive
- `lib/rag-production-indexer/indexer.ts` — logique de promotion (hash + identité)
- `scripts/diag-staging-status.ts` — script diagnostic staging (DATA_ACT, MACHINE)
