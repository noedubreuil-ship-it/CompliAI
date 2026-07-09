# Vérification — Politique de rétention données USA (Anthropic & OpenAI)

**Date :** 2026-07-08
**Contexte :** Vérification factuelle pour la page /transparence-ia section 5, demandée dans le cadre du chantier P0-3 Art. 50 AI Act.

---

## Anthropic PBC — Claude API

**Source consultée :** Privacy Policy Anthropic (https://www.anthropic.com/legal/privacy) + documentation API

| Point | Réalité factuelle |
|---|---|
| Rétention requêtes API | Jusqu'à **30 jours** par défaut à des fins de trust & safety et prévention des abus |
| Formation des modèles | **Non** — Anthropic ne réentraîne pas ses modèles sur les données API des clients par défaut |
| Anonymisation | Non spécifiée publiquement dans les conditions générales |
| Zero Data Retention (ZDR) | Disponible pour les clients Enterprise via accord contractuel dédié |
| DPA / CCT | OUI — DPA disponible, inclut les Clauses Contractuelles Types (CCT) Standard 2021 pour transferts UE → USA |

**Texte retenu dans /transparence-ia :**
> "Transfert encadré par les Clauses Contractuelles Types (CCT) de la Commission européenne. Politique de rétention par défaut : jusqu'à 30 jours à des fins de sécurité et de prévention des abus. Les données ne sont pas utilisées pour entraîner les modèles d'Anthropic."

---

## OpenAI, Inc. — Embeddings API

**Source consultée :** https://openai.com/policies/api-data-usage-policies

| Point | Réalité factuelle |
|---|---|
| Rétention requêtes API | Jusqu'à **30 jours** par défaut pour abuse monitoring |
| Formation des modèles | **Non** — OpenAI ne réentraîne pas ses modèles sur les données API par défaut (opt-out automatique pour les clients API) |
| Anonymisation | Non spécifiée publiquement dans les conditions générales |
| Zero Data Retention | Disponible pour les endpoints éligibles via Enterprise agreement |
| DPA / CCT | OUI — DPA disponible, inclut les CCT Standard 2021 pour transferts UE → USA |

**Texte retenu dans /transparence-ia :**
> "Politique de rétention par défaut : jusqu'à 30 jours à des fins de surveillance des abus. Les données ne sont pas utilisées pour entraîner les modèles d'OpenAI."

---

## Ce qui n'a PAS été écrit (et pourquoi)

| Formulation demandée | Décision | Raison |
|---|---|---|
| "Aucune donnée personnelle identifiante n'est stockée" | ❌ Non retenu | **INEXACT** — les deux fournisseurs conservent les données 30 jours par défaut |
| "Les requêtes sont anonymisées" | ❌ Non retenu | **Non confirmé** — ni Anthropic ni OpenAI ne spécifient publiquement une anonymisation des données API |
| "Non conservées au-delà de 30 jours" | ✓ Retenu partiellement | La durée de 30 jours est confirmée pour les deux fournisseurs |

---

## Actions recommandées (P2)

1. **Négocier un accord ZDR (Zero Data Retention) avec Anthropic** pour les clients Enterprise — élimine la rétention 30 jours
2. **Vérifier si OpenAI ZDR est applicable** pour l'endpoint text-embedding-3-small
3. **Mettre à jour cette page** si un accord ZDR est obtenu (permettrait d'écrire "aucune rétention")
4. **Mentionner dans la politique de confidentialité** la rétention 30 jours chez Anthropic et OpenAI comme sous-traitants
5. **Consulter un DPO/avocat** pour confirmer que les CCT actuellement en place couvrent correctement ces transferts post-Schrems II

---

## Note sur les CCT

La mention "Clauses Contractuelles Types (CCT) de la Commission européenne" dans la page /transparence-ia suppose que CompliAI a bien signé les DPA d'Anthropic et d'OpenAI incluant les CCT Standard 2021 (décision d'exécution 2021/914/UE).

**À vérifier :** confirmation que les DPA ont bien été acceptés lors de la création des comptes API, et que les CCT applicables sont bien les CCT Standard 2021 (et non les SCC 2010 qui ne sont plus valides depuis 2022).
