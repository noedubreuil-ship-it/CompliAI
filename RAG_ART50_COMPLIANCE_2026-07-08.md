# Rapport Chantier P0-3 — Art. 50 AI Act Conformité

**Date :** 2026-07-08
**Branche :** claude-code/fix-ai-act-art50
**Statut :** TERMINÉ — en attente feu vert déploiement

---

## Obligation légale

Art. 50 §1 du Règlement (UE) 2024/1689 — applicable depuis le 2 août 2025 :

> « Les fournisseurs de systèmes d'IA destinés à interagir directement avec des personnes physiques
> conçoivent ces systèmes de manière à ce que les personnes physiques soient informées qu'elles
> interagissent avec un système d'IA, sauf si cela est évident. »

Sanction art. 99 §4 : jusqu'à 15 M€ ou 3% du CA annuel mondial.

---

## Implémentation

### 1. Badge "IA générative" permanent — `components/chat/ChatInterface.tsx`

Badge bleu visible en permanence dans la barre supérieure du chat, à côté du bouton "Nouveau".
Lien vers `/transparence-ia`. Icône Bot (Lucide React).

### 2. Encart déclaration Art. 50 — état vide du chat

Affiché quand aucune conversation n'est en cours (premier contact). Texte :
> « Vous interagissez avec CompliAI, une intelligence artificielle basée sur Claude Sonnet 4.6.
> Les réponses sont générées par IA à partir de sources juridiques officielles.
> Elles ne constituent pas un avis juridique professionnel et doivent être vérifiées avant utilisation. »

### 3. Page `/transparence-ia` — `app/(marketing)/transparence-ia/page.tsx`

Page publique indexable contenant :
- Modèles utilisés : Claude Sonnet 4.6 (Anthropic) + text-embedding-3-small (OpenAI)
- Nature des réponses (information juridique, pas conseil professionnel)
- Limitations connues du système
- Mécanismes de contrôle humain (validation corpus, golden set, citations sourcées)
- Données traitées et transferts USA avec mention Clauses Contractuelles Types (CCT)
- Base légale AI Act : système à risque limité Art. 50

---

## Vérification

```
✓ npm run build — 0 erreurs
✓ Page /transparence-ia rendue (vérifiée en preview)
✓ LegalPageShell utilisé (cohérence avec les autres pages légales)
✓ Badge Bot visible dans la barre supérieure du chat
✓ Encart visible dans l'état vide du chat
```

---

## Amélioration future (P2)

- Ajouter la page `/transparence-ia` dans le footer marketing pour accessibilité universelle
- Internationaliser la page (EN) avec le reste de l'interface (chantier i18n P2.1)
