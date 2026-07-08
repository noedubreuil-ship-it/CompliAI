# Audit 05 — Corpus Juridique

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — lib/rag-quality/, lib/data/, scripts/rechunk-*

---

## 5.1 Corpus Principal (legal_chunks)

Réglements couverts selon les migrations, scripts de rechunking et golden set :

| Règlement | Statut Chunking | Parent-Child | Connecteur Monitoring |
|---|---|---|---|
| AI Act (Règl. UE 2024/1689) | Chunké | NON — chantier prioritaire | ai-office-rss.ts, eurlex-*.ts |
| RGPD (Règl. UE 2016/679) | Chunké + rechunk parent-child | OUI | cnil-rss.ts, edpb-scraping.ts |
| NIS2 (Dir. UE 2022/2555) | Chunké (rechunk-reglements.ts) | NON | eurlex-*.ts |
| DSA (Règl. UE 2022/2065) | Chunké (rechunk-reglements.ts) | NON | eurlex-*.ts |
| DMA (Règl. UE 2022/1925) | Chunké (rechunk-reglements.ts) | NON | eurlex-*.ts |
| CRA (Cyber Resilience Act) | Chunké (rechunk-reglements.ts) | NON | eurlex-*.ts |
| Data Act (Règl. UE 2023/2854) | Chunké (rechunk-reglements.ts) | NON | eurlex-*.ts |
| eIDAS 2 (Règl. UE 2024/1183) | Chunké (rechunk-eidas2.ts) | NON | eurlex-*.ts |
| ePrivacy (Dir. 2002/58) | Chunké (rechunk-eprivacy.ts) | NON | eurlex-*.ts |

---

## 5.2 Corpus Jurisprudentiel

| Source | Connecteur | Statut |
|---|---|---|
| CJUE (Cour de Justice UE) | curia-rss.ts | Actif |
| Jurisprudence nationale | national_legal_texts | Scripts dédiés |

---

## 5.3 Corpus DPA Nationaux (EU27)

Sources nationales configurées dans `lib/data/eu-national-sources.ts` (586 lignes) et `lib/data/eu27-registry-data.ts` (1074 lignes).

Connecteurs actifs pour :
- CNIL (France) — RSS
- AEPD (Espagne) — RSS  
- Garante (Italie) — Scraping
- DPC (Irlande) — Scraping
- EDPB (niveau UE) — Scraping
- AP (autre) — Scraping
- IPSI — Scraping

**Backfill EU27 :** Script `backfill-national-corpus-eu27.ts` disponible pour les 27 États membres.

---

## 5.4 Golden Set — 16 Questions de Référence

```
Bloc 1 — AI Act Qualification (Q01-Q04)
Bloc 2 — AI Act GPAI (Q03)
Bloc 3 — AI Act Obligations (Q06-Q10)
Bloc 4 — RGPD/AI Act (Q11-Q16)
```

**État actuel :** 12/16 OK, 4 CRITICAL

| Question | Thème | Statut | Cause |
|---|---|---|---|
| Q01 | AI Act haut risque Annexe III | OK | — |
| Q02 | AI Act pratique interdite Art. 5 | **CRITICAL** | Chunks AI Act Art.5 insuffisants sans parent-child |
| Q03 | AI Act GPAI Art. 51+55 | OK | — |
| Q04 | AI Act obligations haut risque | **CRITICAL** | Manque chunks parent-child AI Act |
| Q05 | AI Act + RGPD articulation | **CRITICAL** | Cross-réglementation difficile sans parent-child |
| Q06-Q14 | Divers AI Act + RGPD | OK (majorité) | — |
| Q15 | AI Act Art. 50 transparence | **CRITICAL** | ef_search trop bas (résolu migration 049) / corpus Commission Guidelines dense |
| Q16 | Clauses contrat AI Act | OK | — |

---

## 5.5 Couverture Articles RAG

`lib/rag-quality/coverage-articles.ts` (714 lignes) définit la couverture attendue par article.

**Granularités supportées (migration 040+044) :**
- `article` — niveau article
- `paragraph` — niveau paragraphe
- `point` — niveau point (lettre)
- `annexe` — annexes
- `considerant` — considérants

---

## 5.6 Corpus Standards Internationaux

`lib/ai/supplementary-rag-detect.ts` contient la détection pour :
- Standards NIST, ISO/IEC 27001/42001
- Normes EN harmonisées AI Act

---

## 5.7 Corpus Sources Institutionnelles UK

`searchUkRegulatorTexts` dans `lib/ai/national-rag.ts` — ICO UK disponible.

---

## 5.8 Lacunes Identifiées

| Lacune | Impact Business | Priorité |
|---|---|---|
| AI Act sans parent-child | 4 questions CRITICAL golden set / réponses incomplètes sur Art. 5, 6, 9-15 | P0 |
| DSA, DMA, CRA, Data Act sans parent-child | Réponses sur articles complexes potentiellement incomplètes | P2 |
| NIS2 sans parent-child | Idem | P2 |
| eIDAS2 et ePrivacy sans parent-child | Idem | P3 |
| Absence DPA : Pologne, Belgique, Allemagne (BfDI) | Mentions dans CLAUDE.md comme candidats | P2 |

---

## 5.9 Scripts de Maintenance Corpus

| Script | Règlement | Action |
|---|---|---|
| `scripts/rechunk-rgpd.ts` (871 lignes) | RGPD | Re-parsing complet parent-child |
| `scripts/rechunk-aiact.ts` (823 lignes) | AI Act | Re-parsing complet (parent-child pending) |
| `scripts/rechunk-eidas2.ts` (796 lignes) | eIDAS2 | Re-parsing |
| `scripts/rechunk-eprivacy.ts` (541 lignes) | ePrivacy | Re-parsing |
| `scripts/rechunk-reglements.ts` (579 lignes) | NIS2/DSA/DMA/CRA/Data Act | Re-parsing groupé |

**Dette :** 5 scripts très similaires — candidate à une abstraction commune.

---

## 5.10 Conclusion Corpus

Le corpus est substantiel et bien structuré pour les réglements EU clés. La principale lacune est l'absence de chunking parent-child sur l'AI Act, qui est le texte central du produit. Les 4 questions CRITICAL du golden set bloquent la qualité de réponse sur les cas d'usage les plus importants pour les clients.
