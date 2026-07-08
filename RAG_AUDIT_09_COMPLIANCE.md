# Section 9 — Conformité et Légal (méta-audit)

**Date :** 2026-07-08 | **Mode :** Lecture seule

*CompliAI est un outil de conformité. Est-il lui-même conforme ?*

---

## 9.1 Documents légaux présents

| Document | Fichier | Statut |
|---|---|---|
| Politique de confidentialité | `app/(marketing)/legal/privacy/page.tsx` | ✓ Présent |
| CGU | `app/(marketing)/legal/cgu/page.tsx` | ✓ Présent |
| Mentions légales | `app/(marketing)/legal/mentions-legales/page.tsx` | ✓ Présent |
| Disclaimer | `app/(marketing)/legal/disclaimer/page.tsx` | ✓ Présent |

Contenu exact non audité (fichiers non lus intégralement). À VÉRIFIER que les sous-traitants (Supabase, Anthropic, OpenAI, Vercel, Stripe, Resend) sont listés avec localisation des données.

---

## 9.2 Cookies et consentement (ePrivacy)

**CMP consentmanager intégré** dans `app/layout.tsx` :
```tsx
src="https://cdn.consentmanager.net/delivery/autoblocking/cfe565ec0275c.js"
```
Ajouté le 2026-07-07. ✓

Analytics détectés : Sentry (monitoring erreurs). Pas de Google Analytics, Mixpanel, PostHog détectés dans le code applicatif. Le scanner de site CompliAI lui-même détecte les trackers — cohérent avec l'absence de trackers invasifs.

---

## 9.3 Art. 50 AI Act — Transparence chatbot IA

L'Art. 50 §1 du Règlement (UE) 2024/1689 impose d'informer les utilisateurs qu'ils interagissent avec un système IA lorsqu'il n'est pas évident de le distinguer d'un humain.

**État :** Le chat consultant se présente implicitement comme un outil IA (interface produit "CompliAI"), mais aucune mention explicite "Vous interagissez avec un assistant IA" n'a été détectée dans le code de l'interface chat. Le prompt système interdit au modèle de se signer "CompliAI" — ce qui est une bonne pratique pour éviter la confusion de marque, mais ne suffit pas à satisfaire l'obligation de transparence Art. 50.

**Risque :** L'Art. 50 est applicable depuis le 2 août 2025 (GPAI et obligations de transparence). Sanction potentielle : art. 99 §4 → jusqu'à 15M€ ou 3% du CA.

---

## 9.4 Localisation des données

| Service | Région | Transfert hors UE |
|---|---|---|
| Supabase (DB + pgvector) | À VÉRIFIER (probablement EU-West) | Possible (société US) |
| Anthropic (Claude) | USA | ✓ Transfert vers USA |
| OpenAI (embeddings) | USA | ✓ Transfert vers USA |
| Vercel (hosting) | Edge mondial | Possible hors UE |
| Stripe | USA/EU | DPA disponible |
| Resend (email) | À VÉRIFIER | Possible |

Les transferts vers Anthropic et OpenAI constituent des transferts de données personnelles vers les USA (si les questions des utilisateurs contiennent des données personnelles — probable dans un contexte conformité RGPD). Mécanisme de transfert (SCCs) à vérifier dans les DPA de chaque sous-traitant.

---

## 9.5 Droits des personnes (RGPD Art. 15-17)

| Droit | Implémenté | Preuve |
|---|---|---|
| Accès (Art. 15) | À VÉRIFIER | Pas de `/api/user/data-export` détectée |
| Rectification (Art. 16) | Partiel | Profil utilisateur modifiable dans settings |
| Effacement (Art. 17) | À VÉRIFIER | `grep delete app/api/` trouve des suppressions de documents mais pas de suppression de compte complète |
| Portabilité (Art. 20) | À VÉRIFIER | Pas d'export RGPD détecté |
| Opposition (Art. 21) | À VÉRIFIER | |

**Risque :** L'absence d'un endpoint d'effacement complet du compte est une non-conformité RGPD. Un utilisateur doit pouvoir demander la suppression de toutes ses données.

---

## 9.6 Registre des traitements (Art. 30 RGPD)

Pas de registre des traitements dans le code (pas attendu — c'est un document organisationnel). À maintenir hors code. À VÉRIFIER existence d'un document RoPA interne.

---

## 9.7 AI Act — CompliAI comme système IA

CompliAI fournit des analyses juridiques automatisées. Question : est-ce un système IA à haut risque ?

- **Art. 6 + Annexe III** : la liste des systèmes haut risque inclut notamment les systèmes utilisés dans l'administration de la justice (point 8). Un outil d'aide à la conformité juridique n'y figure pas explicitement.
- **Qualification probable :** système IA à usage général (GPAI) ou système IA à risque limité (Art. 50)
- **Obligations applicables :** Art. 50 (transparence) ✓ à compléter, Art. 53 §1 (obligations fournisseur GPAI) À VÉRIFIER selon classification finale

---

## 9.8 Problèmes identifiés

### P1 — Art. 50 AI Act non respecté (depuis août 2025)
Pas de mention explicite "assistant IA" dans l'interface chat. Sanction potentielle 15M€.

### P1 — Droit à l'effacement non complet (RGPD Art. 17)
Pas d'endpoint de suppression complète du compte utilisateur détecté.

### P2 — Transferts USA non documentés
Anthropic et OpenAI reçoivent les questions des utilisateurs. Mécanisme de transfert (SCCs) à documenter et mentionner dans la politique de confidentialité.

### P2 — Sous-traitants à lister
Politique de confidentialité à vérifier pour la liste complète : Supabase, Anthropic, OpenAI, Vercel, Stripe, Resend, Upstash, Sentry.

---

## 9.9 Score

**60/100** — CMP consentmanager intégré, pages légales présentes, Sentry pour monitoring. Déductions : Art. 50 AI Act non respecté (applicable depuis août 2025), droit à l'effacement incomplet, transferts USA à documenter.
