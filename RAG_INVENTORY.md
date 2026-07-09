# RAG Inventory — CompliAI
> Généré le 2026-06-25. Audit post-ingestion de la session de mise à niveau du corpus.

## Résumé

| Métrique | Valeur |
|---|---|
| **Total chunks** | 4 704 |
| **Textes distincts** | 32 |
| **Langue unique** | Français (fr) |
| **Modèle d'embedding** | OpenAI `text-embedding-3-small`, dimension 1536 |
| **Index vectoriel** | HNSW (`vector_cosine_ops`), paramètres par défaut (m=16, ef_construction=64) |
| **Recherche hybride** | pgvector cosine (HNSW) + tsvector BM25 (GIN) |

---

## Schéma actuel de la table `legal_chunks`

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | Clé primaire |
| `regulation` | text | Nom complet du texte (ex. "AI Act (UE 2024/1689)") |
| `article_number` | text | Numéro d'article ou code paragraphe (ex. "5", "premier", "P12", "22_§3") |
| `article_title` | text | Titre de l'article |
| `chapter` | text | TITRE/CHAPITRE de rattachement |
| `content` | text | Texte brut du chunk |
| `embedding` | vector(1536) | Vecteur d'embedding OpenAI `text-embedding-3-small` — indexé HNSW |
| `eurlex_url` | text | URL source EUR-Lex ou EDPB |
| `language` | text | Code langue ISO (ex. "fr") |
| `chunk_hash` | text | SHA-256 du contenu — clé de déduplication upsert |
| `version_date` | date | Date de la version du texte |
| `created_at` | timestamptz | Date d'ingestion |
| `updated_at` | timestamptz | Date de mise à jour |
| `tsv` | tsvector | Vecteur full-text (French) pour recherche BM25 hybride |

**Colonnes absentes identifiées** (à ajouter dans le futur pipeline) :
- `text_type` : catégorie du document (reglement_ue, directive_ue, jurisprudence_cjue, lignes_directrices, traite_fondateur, droits_fondamentaux)
- `country` : pays d'origine (EU, FR, DE, IE…)
- `pending_document_id` : FK vers `pending_documents` pour traçabilité pipeline
- `source_method` : mode d'ingestion (manual, automated_pipeline)

---

## Corpus par texte (trié par nombre de chunks)

### Textes fondateurs UE

| Texte | CELEX / Ref | Chunks | Moy. chars/chunk | Articles indexés | Dernière MAJ |
|---|---|---|---|---|---|
| TFUE — Traité sur le fonctionnement de l'UE | 12016E/TXT | 646 | 890 | 1–358 ✅ | 2016-10-26 |
| TUE — Traité sur l'Union Européenne | 12016M/TXT | 336 | 961 | 1–64 ✅ | 2016-10-26 |
| Charte des droits fondamentaux de l'UE | 12016P/TXT | 54 | 367 | 1–54 ✅ | 2016-10-26 |
| CEDH — Convention européenne des droits de l'homme | — (ECHR) | 114 | 596 | 1–59 ✅ | 2021-08-01 |

### Règlements & Directives IA / Numérique

| Texte | CELEX | Chunks | Moy. chars/chunk | Articles indexés | Dernière MAJ |
|---|---|---|---|---|---|
| AI Act (UE 2024/1689) | 32024R1689 | 165 | 2 330 | 1–113 ✅ | 2024-08-01 |
| DSA — Règlement services numériques (UE 2022/2065) | 32022R2065 | 113 | 2 153 | 1–93 ✅ | 2022-10-27 |
| DMA — Règlement marchés numériques (UE 2022/1925) | 32022R1925 | 74 | 2 089 | 1–54 ✅ | 2022-10-14 |
| Data Act (UE 2023/2854) | 32023R2854 | 70 | 2 380 | 1–50 ✅ | 2023-12-13 |
| Data Governance Act (UE 2022/868) | 32022R0868 | 51 | 2 343 | 1–38 ✅ | 2022-05-30 |
| Cyber Resilience Act (UE 2024/2847) | 32024R2847 | 102 | 2 150 | 1–71 ✅ | 2024-10-23 |
| Règlement Machines (UE 2023/1230) | 32023R1230 | 114 | 2 653 | 1–54 ✅ | 2023-06-29 |
| eIDAS 2 (UE 2024/1183) | 32024R1183 | 19 | 3 428 | Art. premier (modificatif) ✅ | 2024-05-30 |
| NIS 2 (UE 2022/2555) | 32022L2555 | 70 | 2 469 | 1–46 ✅ | 2022-12-14 |
| Directive DSM (UE 2019/790) | 32019L0790 | 37 | 1 614 | 1–32 ✅ | 2019-06-05 |
| RGPD (UE 2016/679) | 32016R0679 | 118 | 1 852 | 1–99 ✅ | 2018-05-25 |
| Directive ePrivacy (UE 2002/58/CE) | 32002L0058 | 21 | 1 263 | 1–21 ✅ | 2002-07-12 |

### Lignes directrices EDPB

| Texte | Référence EDPB | Chunks | Moy. chars/chunk | Type de chunking | Dernière MAJ |
|---|---|---|---|---|---|
| WP243 — Délégué à la Protection des Données (DPO) | WP243 | 187 | 392 | Paragraphes | 2017-04-05 |
| WP248 — Analyse d'Impact (AIPD/DPIA) | WP248 | 158 | 448 | Paragraphes | 2017-10-04 |
| 01/2020 — Transferts internationaux post-Schrems II | Rec. 01/2020 v2.0 | 98 | 1 709 | Paragraphes | 2021-06-18 |
| 05/2020 — Consentement RGPD | Lignes 05/2020 | 81 | 1 693 | Paragraphes | 2020-05-04 |
| 07/2020 — Responsable du traitement / Sous-traitant | Lignes 07/2020 | 126 | 1 582 | Paragraphes | 2021-07-07 |
| 04/2019 — Privacy by Design (Art. 25) | Lignes 04/2019 v2.0 | 74 | 1 677 | Paragraphes | 2020-10-20 |
| 08/2020 — Ciblage médias sociaux | Lignes 08/2020 | 77 | 2 158 | Paragraphes | 2021-04-13 |
| 03/2022 — Dark patterns / interfaces trompeuses | Lignes 03/2022 | 453 | 546 | Paragraphes | 2023-02-14 |
| 02/2019 — Article 6(1)(b) RGPD | Lignes 02/2019 | 44 | 1 244 | Paragraphes | 2019-10-09 |

### Codes & Bonnes Pratiques

| Texte | Source | Chunks | Moy. chars/chunk | Dernière MAJ |
|---|---|---|---|---|
| GPAI Code de bonnes pratiques — IA à usage général | AI Office (Commission) | 66 | 692 | 2025-07-10 |

### Jurisprudence CJUE

| Affaire | CELEX / ECLI | Chunks | Moy. chars/chunk | Thème principal |
|---|---|---|---|---|
| La Quadrature du Net 2 (C-511/18, C-512/18, C-520/18) | 62018CJ0511 | 401 | 557 | Conservation données & surveillance |
| Meta Platforms Ireland (C-252/21) | 62021CJ0252 | 237 | 521 | Publicité personnalisée & bases légales |
| Tele2 Sverige / Watson (C-203/15, C-698/15) | 62015CJ0203 | 222 | 487 | Conservation données & ePrivacy |
| Lindqvist (C-101/01) | 62001CJ0101 | 162 | 426 | Définition donnée personnelle & internet |
| Lindenapotheke (C-21/23) | 62023CJ0021 | 129 | 541 | Données de santé en vente en ligne |
| Bara (C-201/14) | 62014CJ0201 | 85 | 370 | Transferts administrations & information |

---

## Méthode d'ingestion actuelle

```
scripts/
├── fetch-eurlex-fr.ts       # Téléchargement HTML EUR-Lex → txt
├── ingest-legal-docs.ts     # Parsing articles + génération embeddings + upsert Supabase
└── data/                    # Fichiers .txt sources (un par texte)
```

**Chunking** : article-based pour les règlements/directives (split sur `^Article\s+N\b`), paragraph-based pour les lignes directrices et arrêts.  
**Déduplication** : `ON CONFLICT (chunk_hash) DO UPDATE` — le SHA-256 du contenu évite les doublons.  
**Embeddings** : OpenAI `text-embedding-3-small`, dimension 1536. Ce modèle est conservé pour l'ensemble du chantier d'automatisation (Phases 1–5). Une migration vers un modèle supérieur est documentée dans `RAG_FUTURE_IMPROVEMENTS.md`.

### Index en production sur `legal_chunks`

| Nom de l'index | Type | Colonnes | Paramètres |
|---|---|---|---|
| `legal_chunks_pkey` | B-Tree (unique) | `id` | — |
| `legal_chunks_chunk_hash_key` | B-Tree (unique) | `chunk_hash` | — |
| `legal_chunks_embedding_idx` | **HNSW** | `embedding` (cosine) | m=16, ef_construction=64 (défauts pgvector) |
| `legal_chunks_tsv_idx` | GIN | `tsv` | — |

> **Note** : l'index vectoriel est HNSW (pas ivfflat). HNSW ne nécessite pas de paramètre `lists` — il est configuré via `m` (nombre de liens par nœud) et `ef_construction` (taille du graphe de construction). Les valeurs par défaut (m=16, ef_construction=64) sont adaptées pour 4 704 chunks mais pourraient être optimisées avec la croissance du corpus. Voir `RAG_FUTURE_IMPROVEMENTS.md`.

---

## Lacunes et manques identifiés

### Documents recommandés non encore indexés
| Priorité | Document | Type |
|---|---|---|
| P1 | Décisions contraignantes EDPB Art. 65 (Meta, WhatsApp, TikTok, Clearview) | Décisions EDPB |
| P1 | Guidances AI Office sur l'interprétation de l'AI Act (2025) | Guides Commission |
| P2 | Conclusions d'avocats généraux sur affaires en cours | Jurisprudence |
| P3 | Décisions autorités nationales (CNIL délibérations, BfDI, DPC, Garante…) | Décisions nationales |

### Limitations de l'ingestion manuelle actuelle
- Aucune détection automatique de mise à jour des textes existants
- Un seul embedding model (text-embedding-3-small), pas de fallback
- Pas de gestion de versionnage (si un article est amendé, l'ancien reste)
- Pas de traçabilité end-to-end (qui a ingéré quoi, quand, depuis quelle URL exacte)
- Langue : FR uniquement dans le corpus actuel — le pipeline automatique Phase 1 ingérera les documents dans leur langue originale (EN, DE, IT, ES, NL, SL)
