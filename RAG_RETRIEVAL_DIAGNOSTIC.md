# RAG Retrieval Diagnostic — CompliAI Phase 5

> **Objet** : Analyse des causes racines des anomalies détectées par la baseline Phase 5  
> **Date** : 26 juin 2026  
> **Méthode** : Requêtes diagnostiques directes sur le RAG production (lecture seule)  
> **Aucune modification de code ou de données**

---

## Résumé exécutif

Les 12 questions en échec critique sur 16 et le score de couverture à 53,4 % ont **trois causes racines distinctes**, dont seulement deux sont des problèmes de retrieval.

| # | Cause racine | Nombre de questions affectées | Nature |
|---|--------------|-------------------------------|--------|
| 1 | **Asymétrie corpus** : EDPB (1 298 chunks) + CJUE (1 236 chunks) écrasent RGPD (118) + AI Act (165) dans les rankings sémantiques | 7 questions (Q06, Q08, Q09, Q12, Q13, Q04, Q05) | Problème de retrieval réel |
| 2 | **Chunking trop large** : RGPD chunké au niveau article (pas §), montants précis Art. 83 §4/§5 et AI Act Art. 99 §3/§4 absents des chunks | 3 questions (Q14, Q12 partiellement, Q13 partiellement) | Problème de retrieval réel |
| 3 | **Design golden set** : 5 questions ont des articles simultanément requis ET blacklistés, ce qui rend la validation impossible sans lien avec la qualité du RAG | 5 questions (Q07, Q10, Q11, Q14, Q16) | Faux négatifs — problème de test |

**Répartition réelle des 12 critiques** :
- 5 faux négatifs du golden set (erreurs de test, pas de retrieval)
- 7 échecs de retrieval réels

---

## Données brutes du diagnostic

### Inventaire corpus production

```
TOTAL legal_chunks :  4 704

Règlement          Chunks    % corpus
-----------        ------    --------
EDPB guidelines    1 298     27,6 %
CJUE arrêts        1 236     26,3 %
DSA                  113      2,4 %
AI Act               165      3,5 %
RGPD                 118      2,5 %
Cyber Resilience     102      2,2 %
DMA                   74      1,6 %
Data Act              70      1,5 %
Autres             1 528     32,4 %  (TFUE, ePrivacy, Code GPAI, CEDH, etc.)

EDPB + CJUE = 2 534 chunks = 54 % du corpus
RGPD + AI Act =  283 chunks =  6 % du corpus
Ratio : 9 chunks EDPB/CJUE pour 1 chunk RGPD ou AI Act
```

### Longueur moyenne des chunks

```
RGPD articles     118 chunks  avg = 1 852 chars  p50 = 1 588  p90 = 3 821
EDPB guidelines 1 298 chunks  avg =   418 chars  p50 =   332  p90 =   738
```

### Distribution EDPB par document

```
453  EDPB Dark Patterns 03/2022 (interfaces trompeuses)
187  EDPB WP243 — DPO
158  EDPB WP248 — AIPD/DPIA
 98  EDPB Recommandations 01/2020 — Transferts (Schrems II)
 57  EDPB 04/2019 — Privacy by Design (Art. 25)
 44  EDPB 02/2019 — Art. 6(1)(b)
  3  EDPB 08/2020 — Ciblage médias sociaux
```

**Note critique** : Le document EDPB Dark Patterns 03/2022 seul représente **453 chunks = 9,6 % du corpus total**. Il couvre les mêmes thèmes que le RGPD (consentement, droits des personnes, transparence) mais sous l'angle de l'UX malveillante, générant du bruit sémantique massif pour les requêtes sur ces articles.

---

## Diagnostic 1 — Asymétrie corpus (EDPB/CJUE vs RGPD/AI Act)

### Question posée
Pourquoi les requêtes sur les articles RGPD retournent-elles massivement des chunks EDPB guidelines au lieu des articles RGPD eux-mêmes ?

### Mesures de similarité brutes (cosine pur, seuil = 0,25)

**Q06 — "SCHUFA Art. 22 décision automatisée" :**
```
Rang  Sim.    Source
  1   0,6146  EDPB Lignes directrices 04/2019 — Art. 25 RGPD (P38)
  2   0,5869  EDPB Lignes directrices 05/2020 — Consentement (P18)
  ...
 10   0,5635  RGPD Art. 22       ← seul chunk RGPD dans le top-12
```

**Q08 — "Transferts DPF Art. 45 adéquation" :**
```
Rang  Sim.    Source
  1   0,7104  EDPB Lignes directrices 05/2020 — Consentement (P77)
  2   0,7091  EDPB Lignes directrices 05/2020 — Consentement (P48)
  ...
 10   0,6940  RGPD Art. 44       ← RGPD Art. 45 absent du top-12
```

**Q14 — "Sanctions Art. 83 §4/§5 RGPD montants" :**
```
Rang  Sim.    Source
  1   0,5717  CJUE — Arrêt Meta Platforms (C-252/21) P160
  2   0,5698  CJUE — Arrêt Meta Platforms (C-252/21) P110
  3   0,5634  CJUE — Arrêt Meta Platforms (C-252/21) P65
  ...        (7 chunks CJUE Meta dans le top-12)
  → RGPD Art. 83 ABSENT du top-12 pour une requête directe sur ses sanctions
```

**Test d'impact du seuil (Q06, requête "article 22 RGPD décision automatisée") :**
```
Seuil   Total  RGPD  EDPB  art22 présent  topSim
0,50      10     1     9     ✓              0,6590
0,40      10     1     9     ✓              0,6590
0,35      10     1     9     ✓              0,6590
0,30      10     1     9     ✓              0,6590
0,25      10     1     9     ✓              0,6590
```

**Conclusion : le seuil n'est PAS en cause.** Quelle que soit sa valeur, le résultat est identique : 9 chunks EDPB pour 1 chunk RGPD. Le problème est dans la similarité relative, pas dans le filtrage.

### Hypothèses testées

| Hypothèse | Résultat du test |
|-----------|-----------------|
| H1 : Les chunks EDPB sont plus longs/riches → domination | **RÉFUTÉE** — les EDPB sont plus COURTS (418 chars avg), pas plus longs. Les RGPD (1 852 chars) sont plus longs mais dominent moins. |
| H2 : Embedding des articles courts insuffisant | **PARTIELLEMENT CONFIRMÉE** — mais inversement : les EDPB sont courts (focalisés sémantiquement), les RGPD sont longs (dilués). |
| H3 : Seuil 0,30 trop bas → bruit | **RÉFUTÉE** — le seuil ne change rien au classement relatif (voir table ci-dessus). |
| H4 : Pas de boost text_type selon nature de la question | **CONFIRMÉE** — `text_type` est NULL pour TOUS les chunks dans la table. La migration 037 a créé la colonne mais ne l'a pas peuplée. Aucun boost n'est possible aujourd'hui. |
| H5 (nouvelle) : Asymétrie numérique massive → loi des grands nombres | **CAUSE PRINCIPALE CONFIRMÉE** — voir analyse ci-dessous. |

### Cause principale identifiée : la loi des grands nombres sémantique

**Mécanisme** :

1. Pour une requête sur "décision automatisée Art. 22", les EDPB guidelines sur le consentement (WP243, WP248, 03/2022, 05/2020) utilisent exactement le même vocabulaire juridique (données à caractère personnel, traitement, droits, consentement, garanties...) mais dans des contextes variés.

2. Il y a **9 chunks EDPB pour 1 chunk RGPD** dans le corpus. Même si chaque chunk EDPB a une similarité légèrement inférieure au chunk RGPD correspondant, la probabilité qu'au moins 9 d'entre eux soient plus proches qu'Art. 22 est très élevée.

3. Données confirmées pour Q06 :
   - RGPD Art. 22 : sim = **0,5635** → rang #10
   - EDPB top chunk : sim = **0,6146** → rang #1
   - Écart : 0,051 point de sim. Cet écart existe car l'EDPB commente et contextualise l'Art. 22 avec un vocabulaire plus proche des requêtes utilisateurs (qui ressemblent à des questions, pas à du texte juridique).

4. **Les guidelines EDPB sont l'exégèse des articles RGPD** : elles reformulent les articles en langage appliqué, qui est sémantiquement plus proche des requêtes utilisateurs que le texte officiel.

**Exemple concret** : La requête "une banque refuse un prêt sur la base d'un score de crédit — quels droits RGPD ?" ressemble plus à EDPB 05/2020 §23 ("lorsqu'un algorithme de notation est utilisé pour évaluer la solvabilité...") qu'à Art. 22 §1 ("La personne concernée a le droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé...").

### Document EDPB Dark Patterns 03/2022 : cas particulier

Ce document à lui seul pèse 453 chunks (9,6 % du corpus). Il couvre en détail tous les aspects du RGPD liés au consentement, à l'information des utilisateurs et aux pratiques trompeuses. Ses chunks apparaissent massivement dans les requêtes sur :
- Q13 (consentement Art. 9) : chunks Dark Patterns P70, P73, P75, P216 dans le top-10
- Q07 (Art. 22) : chunk P299 dans le top-5
- Q09 (transferts) : absent mais ses voisins EDPB Consentement 05/2020 dominent

Ce document est probablement trop représenté pour son intérêt opérationnel dans un contexte de compliance légale (il cible les concepteurs UX, pas les juristes).

---

## Diagnostic 2 — Sous-paragraphes non retrouvables

### Question posée
Pourquoi les articles avec sous-paragraphes précis (Art. 83 §4/§5, Art. 22 §3) ne remontent-ils pas correctement ?

### Structure exacte des chunks diagnostiqués

**RGPD Art. 22 — 1 seul chunk :**
```
article_number = "22"
longueur = 1 584 chars
contenu = §1 (droit à ne pas faire l'objet...) + §2 (a, b, c exceptions) + §3 (garanties) + §4 (données sensibles)
```
L'article complet est dans UN seul chunk. §3 et §2 sont indissociables dans l'embedding.

**RGPD Art. 83 — 2 chunks :**
```
article_number = "83_§1"
longueur = 3 934 chars
contenu = §1 (effectivité) + §2 (critères pondération) + §3 (principe de specialité) 
          + §4 (10 000 000 EUR / 2 %) + §5 (20 000 000 EUR / 4 %)
          → §4 et §5 sont présents mais dilués dans 3 934 chars

article_number = "83_§2"
longueur = 2 388 chars
contenu = suite de §5 (liste des violations 20M€) + §6 (non-respect injonction) + §7 (critères sectoriels)
```

**Confirmation** : Les montants exacts ("10 000 000 EUR" et "20 000 000 EUR") sont présents dans `83_§1`. Le problème n'est pas leur absence mais leur **dilution sémantique** dans un chunk de 3 934 chars dont 60 % couvre §1-§3 (principes généraux). L'embedding de `83_§1` est une moyenne de l'ensemble → les montants précis ne "pèsent" que ~40 % de l'embedding total.

**AI Act Art. 99 — 2 chunks :**
```
article_number = "99_§1"
longueur = 3 753 chars
contenu = §1 (cadre national de sanctions, délégation aux États membres) + début §2 (critères de pondération)

article_number = "99_§2"
longueur = 2 347 chars
contenu = suite de §2 (criteria list — facteurs aggravants/atténuants)
```

**Montants AI Act Art. 99 §3/§4 : ABSENTS des chunks.**
Les montants spécifiques (15 000 000 EUR / 3 % et 30 000 000 EUR / 6 %) se trouvent dans §3 et §4 de l'Art. 99, mais le chunker n'a produit que `99_§1` et `99_§2` qui couvrent §1 et §2. Le reste de l'article a été tronqué lors de l'ingestion.

**Vérification** : Recherche texte-intégrale dans TOUS les chunks AI Act :
```
Chunks AI Act contenant "15 000 000" : 0
Chunks AI Act contenant "30 000 000" : 0
```

### Granularité comparative AI Act vs RGPD

| Règlement | Approche de chunking | Résultat |
|-----------|---------------------|----------|
| AI Act | Par sous-paragraphe (§1, §2, §3...) pour les longs articles | Art. 5 : 4 chunks (5_§1, 5_§2, 5_§3, 5_§4) ✓ |
| AI Act | Par sous-paragraphe | Art. 6 : 2 vrais chunks (6_§1, 6_§2) ✓ |
| RGPD | Hybride : certains articles en 1 chunk, d'autres en 2 | Art. 22 : 1 seul chunk ✗ |
| RGPD | Hybride | Art. 83 : 2 chunks mais §4/§5 dilués dans `83_§1` ✗ |
| RGPD | Hybride | Art. 9 : 2 chunks (`9_§1` = 3 939 chars, `9_§2` = 1 883 chars) — §2(a) consentement explicite noyé dans §1 ✗ |

**Hypothèse principale confirmée** : Le RGPD a été chunké selon une limite de taille (≈ 4 000 chars) sans alignement systématique sur les frontières de paragraphes. L'AI Act a été chunké plus granulaire, ce qui explique son meilleur retrieval (Q01, Q02, Q03 = 3 questions OK sur 16 = les 3 qui portent sur l'AI Act).

**Hypothèse "métadonnées paragraph_number" : NON APPLICABLE** — `paragraph_number` et `point_letter` sont dans le schéma mais ne sont pas utilisés par `search_legal_chunks` (la recherche est purement vectorielle). Ces métadonnées ne peuvent pas compenser un embedding dilué.

---

## Diagnostic 3 — Design du golden set (faux négatifs)

### Question posée
5 des 12 critiques proviennent-ils du design des questions plutôt que du RAG ?

### Analyse des questions Q07, Q10, Q11, Q14, Q16

Chacune de ces questions a dans son `blacklisted_articles` un article qui est **aussi dans `required_articles`**, ce qui rend la condition logiquement impossible à satisfaire. Le golden set was designed with paragraph-level retrieval in mind, assuming chunks like "22_§2" and "22_§3" would exist separately.

**Q07 — Art. 22 : required ET blacklisté**
```javascript
required_articles:     [{ regulation: "RGPD", article_number: "22" }]
blacklisted_articles:  [{ regulation: "RGPD", article_number: "22" }]
// → Dès que Art. 22 apparaît → blacklist. Dès qu'il est absent → missing.
// Il est IMPOSSIBLE de satisfaire Q07 avec le chunking actuel (1 chunk pour §1-§4).
```
**Intention du concepteur** : Détecter si §2 apparaît SANS §3. Réalisable seulement avec des chunks séparés `22_§2` et `22_§3`.

**Q10 — Art. 37 : required ET blacklisté**
```javascript
required_articles:     [{ regulation: "RGPD", article_number: "37" }]
blacklisted_articles:  [{ regulation: "RGPD", article_number: "37", reason: "Présenter les 3 critères §1 (a)(b)(c) comme cumulatifs" }]
```
La baseline montre que le RAG retrouve correctement Art. 37 ET les lignes directrices DPO WP243 qui détaillent les critères. C'est un résultat correct — mais le blacklist le pénalise.

**Q11 — Art. 35 §1 required ET Art. 35 blacklisté**
```javascript
required_articles:     [{ regulation: "RGPD", article_number: "35" }, { regulation: "RGPD", article_number: "35" }]
blacklisted_articles:  [{ regulation: "RGPD", article_number: "35" }]
// → Identiquement impossible.
```

**Q14 — Art. 83 required ET blacklisté + blacklist null**
```javascript
required_articles:     [{ regulation: "RGPD", article_number: "83" }, { regulation: "AI Act", article_number: "99" }]
blacklisted_articles:  [
  { regulation: "RGPD", article_number: "83" },    // Art. 83 à la fois requis et blacklisté
  { regulation: "RGPD", article_number: null }     // TOUT chunk RGPD est suspect → impossible
]
```
La deuxième entrée blacklistée (`article_number: null`) flag **n'importe quel chunk RGPD** — y compris des résultats parfaitement corrects comme Art. 46, Art. 44, Art. 6.

**Q16 — Art. 28 required ET blacklisté**
Même pattern : Art. 28 requis ET blacklisté.

### Comptage correct des causes des 12 échecs critiques

| Question | Cause principale | Nature |
|----------|-----------------|--------|
| Q04 | RAG retourne Art. 54/55/52 au lieu de Art. 53 (GPAI) | Problème retrieval |
| Q05 | Art. 51 absent pour la requête "exemption open source" | Problème retrieval |
| Q06 | Art. 22 rang #10 (EDPB domine) | Asymétrie corpus |
| Q07 | Art. 22 required ET blacklisté | **Faux négatif golden set** |
| Q08 | Art. 45 absent du top-12 (EDPB consentement domine) | Asymétrie corpus |
| Q09 | Art. 44 absent, Art. 46 blacklisté (même si présent correctement) | Asymétrie + golden set |
| Q10 | Art. 37 required ET blacklisté | **Faux négatif golden set** |
| Q11 | Art. 35 required ET blacklisté | **Faux négatif golden set** |
| Q12 | Art. 17 absent, Data Act retourné à la place | Asymétrie corpus |
| Q13 | Art. 9 §1 absent (EDPB Dark Patterns domine) | Asymétrie corpus |
| Q14 | Art. 83 required+blacklisté; Art. 99 §3/§4 absents | **Faux négatif golden set** + chunking |
| Q16 | Art. 28 required ET blacklisté | **Faux négatif golden set** |

**Bilan : 5 faux négatifs + 7 problèmes de retrieval réels.**

---

## Corrections recommandées (par priorité)

### P0 — Corriger le golden set (effort : 2h, impact : immédiat)

**Cause adressée** : Faux négatifs golden set (5 questions)

**Corrections** :

1. **Q07** : Remplacer le blacklist `article_number: "22"` par une vérification que `22_§3` apparaît dans les résultats si `22_§2` y est. En attendant le re-chunking RGPD, supprimer simplement le blacklist Q07 et ne conserver que `required_articles` = Art. 22.

2. **Q10** : Supprimer l'entrée blacklistée `Art. 37` et reformuler : l'objectif est de vérifier que la réponse mentionne le caractère **alternatif** (et non cumulatif) des 3 critères. Ce test ne peut pas être fait par retrieval — nécessite une évaluation de génération. En attendant : supprimer le blacklist.

3. **Q11** : Supprimer le doublon Art. 35 dans `blacklisted_articles`. Conserver uniquement `required_articles` = Art. 35 §1.

4. **Q14** : 
   - Supprimer le doublon `{ regulation: "RGPD", article_number: "83" }` dans blacklisted.
   - **Supprimer impérativement** `{ regulation: "RGPD", article_number: null }` qui pénalise tout chunk RGPD.
   - Conserver uniquement : "alert si Art. 99 est absent" (car les montants AI Act sont manquants = problème réel).

5. **Q16** : Supprimer le doublon Art. 28 dans `blacklisted_articles`.

**Impact attendu** : +5 questions OK (Q07, Q10, Q11, Q16 → OK ; Q14 → warning au lieu de critical).

**Risque de régression** : Nul — on supprime des tests logiquement impossibles, on ne modifie pas le comportement du RAG.

---

### P1 — Compléter les chunks manquants AI Act Art. 99 §3-§6 (effort : 0,5j, impact : élevé)

**Cause adressée** : Montants précis AI Act inexistants (Q14)

**Action** : Ajouter manuellement des chunks pour les paragraphes §3, §4, §5, §6 de l'AI Act Art. 99 (amendes 15M€/3% et 30M€/6% pour pratiques interdites). Ces chunks existent dans le texte officiel mais le chunker s'est arrêté après §2 (limite de taille atteinte à 3 753 chars).

**Exemple de chunk à créer** :
```
regulation: "AI Act (UE 2024/1689)"
article_number: "99_§3"
content: "3. Les violations des dispositions suivantes font l'objet d'amendes administratives 
          pouvant s'élever jusqu'à 15 000 000 EUR ou, dans le cas d'une entreprise, 
          jusqu'à 3 % de son chiffre d'affaires annuel mondial total..."
```

**Impact attendu** : Q14 → warning (Art. 83 §4/§5 accessible via embedding, Art. 99 §3/§4 maintenant présent).

**Risque de régression** : Faible — ajout de nouveaux chunks sans modification des existants.

---

### P2 — Re-chunker RGPD au niveau paragraphe (effort : 2-3j, impact : élevé)

**Cause adressée** : Dilution des sous-paragraphes clés (Art. 83 §4/§5, Art. 22 §3, Art. 9 §2(a))

**Action** : Re-ingérer le RGPD avec la même granularité que l'AI Act : un chunk par paragraphe numéroté (§1, §2, §3...). Actuellement :
- Art. 22 : 1 chunk de 1 584 chars → cible : 4 chunks (`22_§1`, `22_§2`, `22_§3`, `22_§4`)
- Art. 83 : 2 chunks dont `83_§1` (3 934 chars) contient §1-§5 → cible : 6 chunks
- Art. 9 : `9_§1` (3 939 chars) contient §1-§4 → cible : chunking par §

**Impact attendu sur les questions** :
- Q07 : Art. 22 §3 (garanties) maintenant chunk distinct → blacklist fonctionnel → Q07 potentiellement OK
- Q11 : Art. 35 §1 vs §3 distinguables → Q11 potentiellement OK
- Q14 : Art. 83 §4 et §5 comme chunks dédiés → sim. élevée pour requêtes sur les montants
- Q13 : Art. 9 §2(a) (consentement explicite) comme chunk distinct → Q13 amélioration probable

**Risque de régression** : Modéré — re-ingestion RGPD nécessite validation dans l'interface de Phase 3. Les chunks existants Art. 22, Art. 83, Art. 9 doivent être archivés et remplacés (procédure Phase 4).

---

### P3 — Rééquilibrer le corpus EDPB (effort : 1j, impact : modéré)

**Cause adressée** : Asymétrie numérique 9:1 EDPB/CJUE vs RGPD/AI Act

**Options** :

**Option A (recommandée)** : Exclure ou pondérer le document EDPB Dark Patterns 03/2022 (453 chunks). Ce document génère du bruit pour quasiment toutes les requêtes RGPD sans apporter de valeur juridique précise pour la compliance. Le réserver à des requêtes explicitement sur les dark patterns.

**Option B** : Ajouter un filtre BM25 soft par `text_type` une fois cette colonne peuplée. Les requêtes mentionnant "article X" seraient boostées vers les chunks avec `text_type = 'regulation'`.

**Option C** : Limiter le `match_count` à 10 et introduire une diversification : max 5 chunks EDPB par requête, au moins 2 chunks "regulation" si disponibles.

**Impact attendu** : Q06, Q08, Q12, Q13 → amélioration du rang des chunks RGPD (passage possible de rang #10 à rang #3-5).

**Risque de régression** : Modéré pour Option A (certaines requêtes sur le consentement bénéficient des chunks EDPB qui sont pertinents). Option C est plus sûre.

---

### P4 — Enrichir les embeddings RGPD/AI Act (effort : 2-3j, impact : modéré)

**Cause adressée** : Vocabulaire juridique brut des articles < vocabulaire appliqué des EDPB

**Action** : Lors du re-chunkage, ajouter un préfixe contextuel à chaque chunk avant de calculer l'embedding :

```
"Texte officiel RGPD article 22 — Décision individuelle automatisée :
1. La personne concernée a le droit de ne pas faire l'objet..."
```

Ce préfixe ancre sémantiquement le chunk (le moteur sait qu'il s'agit d'un article officiel RGPD) et rapproche son embedding des requêtes du type "article 22 du RGPD".

**Impact attendu** : Amélioration de 0,05-0,10 de similarité pour les requêtes directement sur l'article, suffisant pour passer devant les chunks EDPB dans les requêtes ciblées.

**Risque de régression** : Faible si le préfixe est court (< 15 tokens). Risque de biais si trop long.

---

### P5 — Peupler `text_type` (effort : 1j, impact : futur)

**Cause adressée** : Absence de boost par type dans la recherche hybride

**Action** : Migration UPDATE pour peupler `text_type` sur les chunks existants :
- `'regulation'` pour AI Act, RGPD, DSA, DMA, Data Act, etc.
- `'case_law'` pour CJUE
- `'guidance'` pour EDPB
- `'standard'` pour Code GPAI, normes techniques

Cela permet ensuite d'implémenter un boost optionnel : si la requête contient "article X", favoriser `text_type = 'regulation'`.

**Impact attendu** : Faible à court terme (nécessite une modification du code de recherche hybride), fort à long terme pour la précision du retrieval.

**Risque de régression** : Nul sur le comportement actuel (la colonne est NULL partout aujourd'hui).

---

## Impact simulé des corrections sur la baseline

| Question | Statut baseline | Après P0 (golden set) | Après P0+P1 (+ chunks AI Act) | Après P0+P1+P2 (+ re-chunk RGPD) |
|----------|----------------|----------------------|-------------------------------|-----------------------------------|
| Q01 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| Q02 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| Q03 | ✅ OK | ✅ OK | ✅ OK | ✅ OK |
| Q04 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN probable |
| Q05 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN probable |
| Q06 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN (P3 nécessaire) |
| Q07 | 🔴 CRIT | ✅ **OK** | ✅ OK | ✅ OK |
| Q08 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN (P3 nécessaire) |
| Q09 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN probable |
| Q10 | 🔴 CRIT | ✅ **OK** | ✅ OK | ✅ OK |
| Q11 | 🔴 CRIT | ✅ **OK** | ✅ OK | ✅ OK |
| Q12 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN (P3 nécessaire) |
| Q13 | 🔴 CRIT | 🔴 CRIT | 🔴 CRIT | ⚠️ WARN probable |
| Q14 | 🔴 CRIT | ⚠️ **WARN** | ✅ **OK** probable | ✅ OK |
| Q15 | ⚠️ WARN | ⚠️ WARN | ⚠️ WARN | ⚠️ WARN (Art. 26 cherchable) |
| Q16 | 🔴 CRIT | ✅ **OK** | ✅ OK | ✅ OK |

**Projection baseline après P0 seul** : 8/16 OK (au lieu de 3/16), 5 warnings, 3 critiques  
**Projection après P0+P1** : 9/16 OK, 4 warnings, 3 critiques  
**Projection après P0+P1+P2+P3** : 12-13/16 OK, 2-3 warnings, 1 critique max

---

## Décision proposée (au choix du mainteneur)

### Option A — Corrections immédiates avant Phase 6

Implémenter P0 (golden set, 2h) + P1 (chunks AI Act, 0,5j) avant de passer en Phase 6. Cela portera la baseline à 9/16 OK sans toucher au corpus existant. Re-chunking RGPD (P2) comme chantier séparé planifié.

### Option B — Phase 6 avec problèmes documentés

Passer en Phase 6 avec les anomalies documentées dans ce fichier et la baseline actuelle (3/16 OK). Les corrections du retrieval (P0-P5) deviennent un chantier parallèle ou post-Phase 6, tracé dans `RAG_FUTURE_IMPROVEMENTS.md`.

### Option C — Chantier de correction complet avant Phase 6

Implémenter P0+P1+P2 (2-4j) puis ré-exécuter la baseline pour confirmer l'amélioration avant Phase 6.

---

## Fichiers de diagnostic

```
scripts/diag-retrieval.ts    Script de diagnostic (lecture seule, sans effet de bord)
RAG_RETRIEVAL_DIAGNOSTIC.md  Ce document
```

Pour ré-exécuter le diagnostic à tout moment :
```bash
npx tsx --env-file=.env.local scripts/diag-retrieval.ts
```

---

*Diagnostic produit en lecture seule — aucune modification de code ou de données.*  
*CompliAI Phase 5 — 26 juin 2026*
