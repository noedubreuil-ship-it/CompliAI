# Rapport de Correction d'Audit — Erreur Méthodologique

**Date :** 2026-07-08
**Objet :** Correction des chiffres corpus RAG dans RAG_AUDIT_05_CORPUS.md et RAG_APPLICATION_FULL_AUDIT_2026-07-08.md

---

## 1. Erreur identifiée

**Nature :** Troncature silencieuse par pagination du client Supabase JS.

**Script incriminé :** `scripts/check-corpus-live.ts` (première version)

**Mécanisme de l'erreur :**

Le client `@supabase/supabase-js` applique une limite par défaut de **1 000 lignes** sur toutes les requêtes `.select()`. Le script initial faisait :

```typescript
const { data } = await supabase
  .from('legal_chunks')
  .select('regulation, embedding, granularity, updated_at')
// Aucun .range(), aucune pagination → retourne exactement 1000 lignes
```

La table `legal_chunks` contient **14 276 lignes**. Le script a reçu les 1 000 premières (triées par ordre d'insertion, correspondant aux chunks les plus anciens — EDPB, TFUE, jurisprudence pré-rechunk), les a agrégées, et a présenté ce résultat partiel comme total.

L'erreur a ensuite été **auto-validée par erreur** : quand l'utilisateur a signalé la contradiction, une deuxième requête utilisant `.select('*', { count: 'exact', head: true })` a confirmé 1 000 — mais cette requête sans `.range()` appliquait aussi la limite par défaut côté count. En réalité le `count: exact` avec `head: true` retourne bien le vrai total (14 276), mais la lecture du log a été mal interprétée.

**Preuve de la correction :** Le script corrigé avec pagination explicite (`.range(from, from + 999)` dans une boucle) a parcouru 15 pages et agrégé 14 276 lignes concordant exactement avec les chiffres de l'utilisateur.

---

## 2. Chiffres erronés vs réels

| Règlement | Rapport initial (FAUX) | Réel (confirmé) |
|---|---|---|
| AI Act | 15 chunks | **1 258 chunks** |
| RGPD | 8 chunks | **1 040 chunks** |
| DSA | 62 chunks | **965 chunks** |
| DMA | 41 chunks | **612 chunks** |
| DORA | 12 chunks | **756 chunks** |
| eIDAS 2 | 2 chunks | **692 chunks** |
| **TOTAL** | **1 000** | **14 276** |

---

## 3. Impact sur les autres sections de l'audit

### Sections NON affectées (métriques indépendantes du corpus)

- **Section 1 Architecture** — métriques codebase (LOC, fichiers, migrations) : **inchangées**
- **Section 2 Base de données** — schéma, RLS, migrations : **inchangées**
- **Section 3 Sécurité** — CVE npm, headers HTTP, rate limiting : **inchangées** (re-vérifiés ci-dessous)
- **Section 6 API** — inventaire 100 routes, protection admin : **inchangées**
- **Section 7 UI** — composants, i18n, accessibilité : **inchangées**
- **Section 8 Performance** — unit economics, bundles, coûts : **inchangées**
- **Section 9 Conformité** — Art.50, RGPD Art.17, transferts USA : **inchangées**
- **Section 10 Business** — Stripe, outils, analytics : **inchangées**

### Sections affectées

- **Section 4 Pipeline RAG** — conclusions sur la qualité du corpus à réviser partiellement
- **Section 5 Corpus** — entièrement à refaire (voir RAG_AUDIT_05_CORPUS_V2.md)
- **Score global** — à recalculer

---

## 4. Re-vérification des constats critiques

| Constat | Statut |
|---|---|
| 2 CVE CRITICAL + 6 HIGH npm | **CONFIRMÉ** — indépendant du corpus |
| Absence headers HTTP sécurité (0/6) | **CONFIRMÉ** — next.config.mjs inchangé |
| Rate limiting manquant sur 91 routes | **CONFIRMÉ** — inventaire routes indépendant |
| Art. 50 AI Act non respecté | **CONFIRMÉ** — code ChatInterface.tsx inchangé |
| Interface 100% français | **CONFIRMÉ** — 0 occurrence i18n |
| 4 questions golden set CRITICAL (Q02/Q04/Q05/Q15) | **À RÉÉVALUER** — avec 1 258 chunks AI Act et 1 040 RGPD, certaines questions CRITICAL pourraient être résolues. Le golden set doit être re-exécuté. |
