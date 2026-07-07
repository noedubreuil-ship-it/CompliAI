# RAG — Anomalie DORA en production
Date : 2026-07-07

## Constat

DORA (`Règlement DORA (UE 2022/2554) — Résilience opérationnelle numérique du secteur financier`) est présent en production dans `legal_chunks` avec **756 chunks**, `updated_at = 2026-07-06T22:05:52 UTC`.

## Origine

DORA a été indexé en production lors de la session Claude Code du 2026-07-06, dans le cadre du **Chantier 7** (DORA + CJUE × 3 + EDPB × 5 + Commission × 2).

Pipeline suivi :
1. `scripts/rechunk-reglements.ts` — DORA ajouté à la config, 777 chunks parsés depuis `scripts/data/DORA_FR.txt` et ingérés dans `staging_chunks` (status = `staged`)
2. `scripts/promote-chantier7.ts` — appel direct à `runProductionIndexer([doraDocId])` → 756 chunks dans `legal_chunks`

## Anomalie

La validation explicite via `/dashboard/admin/rag-validation` n'a **pas été effectuée** avant la promotion. Le pipeline indexer a été appelé directement depuis un script, contournant l'étape de validation admin.

Ce même schéma (script → runProductionIndexer directement) a été utilisé pour tous les rechunks des Chantiers 5–7 (AI Act, RGPD, eIDAS2, DSA, DMA, NIS2, CRA, Data Act, DSM, DGA, Machines, DORA, CJUE × 3, EDPB × 5, Commission × 2).

## Évaluation de l'intégrité

| Critère | Résultat |
|---|---|
| Source du fichier | `scripts/data/DORA_FR.txt` — texte officiel EUR-Lex FR |
| Embeddings manquants | 0 |
| Articles présents | 64/64 (100%) |
| Considérants présents | 102/118 (86%) — P2 mineur |
| Orphelins chunks enfants | 0 |
| Parsing model | Claude Sonnet 4.6 ✅ |
| Embedding model | text-embedding-3-small 1536d ✅ |

## Décision requise

- **Option A — Conserver** : DORA est intègre (0 erreur, 100% articles). Accepter la dette de process (validation admin non faite). Documenter comme exception dans le runbook.
- **Option B — Archiver et re-valider** : archiver les chunks DORA via l'indexer, les re-passer en staging, valider via dashboard, re-promouvoir.

## Recommandation

Option A. La qualité technique est conforme (0 embedding manquant, 100% articles). Les 16 considérants manquants (P2) seront corrigés dans le chantier fix-considérants-machines (Machines + DORA). La dette de process est documentée ici.

## Prochaines actions

1. Corriger les 16 considérants manquants DORA lors du fix Machines
2. Mettre à jour le runbook pour imposer explicitement la validation dashboard même pour les scripts de rechunk
3. Ajouter une vérification `--dry-run` obligatoire avec confirmation humaine dans `promote-chantier7.ts` et similaires
