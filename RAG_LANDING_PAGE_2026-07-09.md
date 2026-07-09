# RAG_LANDING_PAGE_2026-07-09

**Chantier :** 2.2 — Landing page conversion
**Branche :** `claude-code/landing-page-conversion`
**Fichier :** `app/(marketing)/page.tsx`
**Date :** 2026-07-09
**Statut :** ✅ Implémenté, build OK, vérifié en preview — en attente feu vert prod

---

## Diagnostic

Landing existante déjà soignée (style Apple, branding EU). Écarts vs objectifs 2.2 :
- Corpus **sous-vendu** : affichait "5 règlements" alors que le corpus réel = 43 règlements / 14 276 extraits.
- Pas d'argument "mise à jour quotidienne".
- Pas de section méthodologie/crédibilité (juste un lien EUR-Lex).
- Pas d'aperçu produit.

## Modifications livrées

| # | Élément | Détail |
|---|---|---|
| 1 | Stats bar | `43` règlements & textes · `14 276` extraits officiels · `Quotidienne` mise à jour · `16` outils |
| 2 | Section **Aperçu produit** | Nouveau `ProductPreview` : affiche `public/product-preview.png` si présent, sinon un mock du consultant (question « chatbot doit-il informer ? » → réponse Art. 50 §1 + puces sources AI Act / considérant 132 / EUR-Lex) |
| 3 | Section **Méthodologie** | 3 cartes : Mise à jour quotidienne · Sources officielles citées · 43 règlements / 14 276 extraits |
| 4 | Section Réglementations | Titre "5" → "43 règlements européens" ; liste 5 → 10 textes phares (AI Act, RGPD, DSA, DMA, Data Act, DORA, NIS2, CRA, eIDAS 2, DGA) + carte "+33 autres" |

## Décisions utilisateur intégrées
- **Arguments retenus** : mise à jour quotidienne auto, 43 règlements + 14 276 extraits, sources officielles citées. *(FAQ et claim "golden set 16/16" non retenus.)*
- **Vidéo** : emplacement "aperçu produit" avec capture réelle (mock en attendant).
- **Témoignages** : laissés en l'état.
  ⚠️ **Réserve maintenue** : les 3 témoignages nominatifs (Marie Lefebvre, Thomas Dubois, Sarah Chen) et les avatars du CTA final semblent fictifs. Pour un produit de conformité, afficher de faux témoignages nominatifs expose à un risque de pratique commerciale trompeuse (dir. 2005/29/CE, art. L121-1 s. C. conso). Recommandation : remplacer par de vrais témoignages ou une preuve non-nominative dès que possible.

## Vérification (preview)
- Build `✓ Compiled successfully`.
- Stats bar, aperçu produit (mock consultant), méthodologie : rendus vérifiés par captures.
- Seules erreurs console : warning d'hydration `data-cmp-info` pré-existant (script cookie-consent sur HeroBackground), sans lien avec ce chantier.

## Action requise (pour finaliser)
1. **Déposer une vraie capture** dans `public/product-preview.png` (idéalement le consultant avec une réponse sourcée) — elle remplacera automatiquement le mock. Sinon le mock reste affiché, propre.
2. Ton **feu vert prod** → cherry-pick sur `claude-code/fix-ai-act-art50` + déploiement Vercel.

## Reste ouvert (non fait, hors décisions retenues)
- FAQ objections (non retenue).
- Audit SEO / Lighthouse 90+ (à faire dans une passe dédiée si souhaité).
- A/B testing accroche (nécessite l'outillage analytics — chantier 3.3).

## Rollback
`git revert` du commit de chantier. Aucune migration, aucun impact DB.
