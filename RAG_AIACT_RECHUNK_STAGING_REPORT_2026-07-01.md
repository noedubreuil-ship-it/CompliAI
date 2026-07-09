# Rapport re-chunking AI Act — staging

**Date** : 2026-07-02T23:12:31.303Z
**Environnement** : compliai-staging (via --env-file=.env.staging)
**Modèle parsing** : claude-sonnet-4-6
**Statut production** : NON promu — en attente validation explicite

## Chunks générés

| Granularité | Nombre |
|---|---:|
| paragraph | 527 |
| point | 425 |
| article (parents) | 113 |
| **Total** | **1065** |

## Coût API

| Métrique | Valeur |
|---|---:|
| Tokens input | 217,976 |
| Tokens output | 194,552 |
| Coût estimé pré-run | ~$2.50 USD |
| **Coût réel mesuré** | **$3.57 USD** |

## Golden set — articles critiques (Art. 5, 26, 50, 51, 53)

Score : **1/5 OK**

| Question | Thème | Statut | Articles retrouvés |
|---|---|---|---|
| Q02 | AI Act — Pratique interdite Art. 5 (inférence émotions au travail) | CRITICAL | AI Act (UE 2024/1689):15, AI Act (UE 2024/1689):50, AI Act (UE 2024/1689):5, AI Act (UE 2024/1689):3, AI Act (UE 2024/1689):60, AI Act (UE 2024/1689):4 |
| Q03 | AI Act — GPAI risque systémique seuil 10²⁵ FLOPS (Art. 51 + Art. 55) | OK | AI Act (UE 2024/1689):51, AI Act (UE 2024/1689):52, AI Act (UE 2024/1689):55, AI Act (UE 2024/1689):90 |
| Q04 | AI Act — Obligations générales GPAI Art. 53 | CRITICAL | AI Act (UE 2024/1689):54, AI Act (UE 2024/1689):55, AI Act (UE 2024/1689):52, AI Act (UE 2024/1689):25, AI Act (UE 2024/1689):15 |
| Q05 | AI Act — Exemption open source GPAI (Art. 53 §2) | CRITICAL | AI Act (UE 2024/1689):54, AI Act (UE 2024/1689):53, AI Act (UE 2024/1689):55, AI Act (UE 2024/1689):52 |
| Q15 | AI Act — Transparence chatbot Art. 50 (obligation du déployeur) | WARNING | AI Act (UE 2024/1689):27, AI Act (UE 2024/1689):54, AI Act (UE 2024/1689):50, AI Act (UE 2024/1689):91, AI Act (UE 2024/1689):15, AI Act (UE 2024/1689):49 |

## Anomalies

- Aucune anomalie bloquante détectée

## Prochaine étape

Validation explicite requise avant promotion production.