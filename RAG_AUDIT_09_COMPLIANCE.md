# Audit 09 — Conformité et Légal

**Date :** 2026-07-08  
**Périmètre :** Lecture seule — pages légales, RGPD, AI Act, sous-traitants

---

## 9.1 Pages Légales Présentes

| Page | URL | Présente |
|---|---|---|
| Conditions Générales d'Utilisation | `/legal/cgu` | OUI |
| Politique de confidentialité | `/legal/privacy` | OUI |
| Mentions légales | `/legal/mentions-legales` | OUI |
| Avertissement légal | `/legal/disclaimer` | OUI |

**Bonne pratique :** Les 4 pages légales obligatoires pour un SaaS français opérant dans l'UE sont présentes.

---

## 9.2 Transparence Chatbot — Art. 50 AI Act

L'article 50 de l'AI Act impose que les systèmes d'IA qui interagissent avec des personnes physiques indiquent clairement qu'il s'agit d'une IA.

**Analyse :**
- Le consultant IA (`/dashboard/chat`) est un chatbot textuel
- La question Q15 du golden set porte précisément sur Art. 50 — elle était CRITICAL avant la migration 049
- L'interface Chat existe dans `components/chat/ChatInterface.tsx`

**À vérifier dans l'implémentation :**
- Un message d'introduction indiquant clairement "vous interagissez avec une IA" est-il affiché ?
- Le terme "consultant" peut être ambigu — à distinguer d'un humain

**Risque :** Sans divulgation explicite conforme Art. 50, CompliAI (un outil de conformité AI Act) serait lui-même non conforme à l'AI Act sur ce point.

---

## 9.3 Droits RGPD Utilisateurs

### Droits Théoriquement Couverts

| Droit RGPD | Mécanisme Identifié |
|---|---|
| Art. 13/14 — Information | `/legal/privacy` présente |
| Art. 15 — Accès | `/dashboard/settings` — export données ? |
| Art. 16 — Rectification | `/dashboard/settings` — modification profil |
| Art. 17 — Effacement | Suppression compte via Supabase Auth (ON DELETE CASCADE) |
| Art. 20 — Portabilité | Export CSV/PDF via `/api/audit-trail/export` et `/api/generate/export-pdf` |
| Art. 21 — Opposition | Non vérifié |
| Art. 22 — Décision automatisée | CompliAI génère des analyses — voir section 9.5 |

**Suppression en cascade :** Les migrations SQL utilisent `ON DELETE CASCADE` sur les tables liées à `auth.users` — la suppression d'un compte supprime toutes les données associées.

---

## 9.4 Cookies et Tracking

`find app -name "*.tsx" | xargs grep -l "privacy\|cookies\|cgu\|mentions"` → trouve les pages légales.

**Pas de bandeau cookies identifié** dans les composants marketing. Supabase Auth utilise des cookies de session — ils peuvent être considérés comme "strictly necessary" (exemptés de consentement RGPD). À vérifier si d'autres cookies analytiques sont utilisés.

**Sentry** (`@sentry/nextjs`) : collecte des données d'erreur incluant potentiellement des informations utilisateur. Doit être mentionné dans la politique de confidentialité.

---

## 9.5 DPIA Interne

CompliAI traite des données personnelles de ses utilisateurs et génère des analyses de conformité. Une DPIA interne est recommandée (Art. 35 RGPD) compte tenu du profil des traitements :
- Données professionnelles sensibles (stratégie IA des entreprises clientes)
- Traitement automatisé avec scoring/classification
- Logs d'interactions IA (ai_interaction_logs)

---

## 9.6 Sous-Traitants (Art. 28 RGPD)

Sous-traitants identifiés par l'analyse du code :

| Sous-traitant | Service | Données transmises | Base légale |
|---|---|---|---|
| **Anthropic** | LLM (Claude) | Questions utilisateurs, contexte juridique | Art. 28 RGPD — DPA à vérifier |
| **OpenAI** | Embeddings | Extraits de documents utilisateurs | Art. 28 RGPD — DPA à vérifier |
| **Supabase** | Base de données | Toutes données utilisateurs | Art. 28 RGPD — basé en UE ? |
| **Vercel** | Hébergement | Logs requêtes, headers | Art. 28 RGPD — US company |
| **Stripe** | Paiements | Données financières | Art. 28 RGPD — certifié |
| **Resend** | Emails transactionnels | Email utilisateurs | Art. 28 RGPD |
| **Upstash** | Cache Redis | Questions utilisateurs (cache sémantique) | Art. 28 RGPD |
| **Sentry** | Monitoring erreurs | Données techniques + identifiants | Art. 28 RGPD |

**Points de vigilance :**
- Anthropic et OpenAI sont des entreprises américaines — transferts Art. 44-49 RGPD nécessaires (SCCs ou équivalent)
- Vercel est une entreprise américaine — idem
- Le cache sémantique Upstash stocke des questions utilisateurs dans Redis — données potentiellement sensibles

---

## 9.7 Archivage et Rétention

| Donnée | Durée de rétention identifiée |
|---|---|
| `ai_interaction_logs` | Non définie dans les migrations |
| `auth_rate_limits` | Cleanup automatique après 24h (migration 024) |
| `legal_chunks` (historical) | Archivage dans historical_chunks sans durée limite |
| `processed_stripe_events` | Non définie |

**Lacune :** Pas de politique de rétention formalisée dans le code pour la majorité des données.

---

## 9.8 DPIA Produit — Outil d'Analyse IA

CompliAI inclut une fonctionnalité DPIA (`/dashboard/tools/dpia`) et FRIA (`/dashboard/tools/fria`). Ces outils génèrent des analyses sur les systèmes IA des clients. Il convient que :
- Les analyses générées ne soient pas considérées comme des décisions juridiques automatisées au sens Art. 22 RGPD
- Les avertissements légaux appropriés soient présents (voir `/legal/disclaimer`)

---

## 9.9 NIS2 et Cybersécurité

CompliAI traite et stocke des données stratégiques sur les systèmes IA de ses clients. Si CompliAI est qualifié de "fournisseur de services numériques" au sens NIS2, des obligations de sécurité supplémentaires s'appliquent (notification incidents, mesures techniques).

---

## 9.10 Verdict Conformité

**Points forts :**
- Pages légales complètes (CGU, privacy, mentions, disclaimer)
- Suppression en cascade RGPD
- Stripe certifié PCI-DSS
- Webhook Stripe sécurisé (HMAC)

**Lacunes à adresser :**
- Conformité Art. 50 AI Act du chatbot lui-même (transparence IA)
- Transferts internationaux Anthropic/OpenAI/Vercel (SCCs à documenter)
- Politique de rétention des données (ai_interaction_logs)
- Bandeau cookies à auditer
- DPIA interne recommandée
- DPA (Data Processing Agreements) avec Anthropic et OpenAI à vérifier
