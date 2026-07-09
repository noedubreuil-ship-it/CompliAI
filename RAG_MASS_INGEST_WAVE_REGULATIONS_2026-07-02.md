# Rapport ingestion massive — vague regulations

**Date** : 2026-07-02T23:01:46.015Z
**Mode** : dry-run
**Documents** : 20
**URL fails** : 1

## Détail

| # | ID | Titre | URL | Size risk | Résultat |
|---:|---|---|---|---|---|
| 1 | commission-ai-act-gpai-guidelines | Commission — Guidelines GPAI models (Art. 51-56 AI Act) | HTTP 200 ✓ | low | (dry-run) |
| 2 | directive-led-2016-680 | Directive (UE) 2016/680 — Police et justice (LED) | HTTP 202 ✓ | low | (dry-run) |
| 3 | reg-2018-1725-eu-institutions | Règlement (UE) 2018/1725 — Protection des données par les in | HTTP 202 ✓ | medium | (dry-run) |
| 4 | reg-p2b-2019-1150 | Règlement (UE) 2019/1150 — Platform-to-Business (P2B) | HTTP 202 ✓ | low | (dry-run) |
| 5 | directive-product-liability-2024-2853 | Directive (UE) 2024/2853 — Responsabilité du fait des produi | HTTP 202 ✓ | low | (dry-run) |
| 6 | reg-cybersecurity-act-2019-881 | Règlement (UE) 2019/881 — Cybersecurity Act (ENISA et certif | HTTP 202 ✓ | medium | (dry-run) |
| 7 | directive-dcd-2019-770 | Directive (UE) 2019/770 — Contrats de fourniture de contenus | HTTP 202 ✓ | low | (dry-run) |
| 8 | reg-ehds-2025-327 | Règlement (UE) 2025/327 — Espace européen des données de san | HTTP 202 ✓ | high | (dry-run) |
| 9 | reg-gpsr-2023-988 | Règlement (UE) 2023/988 — Sécurité générale des produits (GP | HTTP 202 ✓ | medium | (dry-run) |
| 10 | directive-csddd-2024-1760 | Directive (UE) 2024/1760 — Devoir de vigilance des entrepris | HTTP 202 ✓ | medium | (dry-run) |
| 11 | reg-mica-2023-1114 | Règlement (UE) 2023/1114 — Marchés de crypto-actifs (MiCA) | HTTP 202 ✓ | high | (dry-run) |
| 12 | directive-csrd-2022-2464 | Directive (UE) 2022/2464 — Rapportage sur la durabilité des  | HTTP 202 ✓ | medium | (dry-run) |
| 13 | directive-sale-goods-2019-771 | Directive (UE) 2019/771 — Vente de biens (SVG) | HTTP 202 ✓ | low | (dry-run) |
| 14 | reg-geoblocking-2018-302 | Règlement (UE) 2018/302 — Géoblocage injustifié | HTTP 202 ✓ | low | (dry-run) |
| 15 | reg-tco-2021-784 | Règlement (UE) 2021/784 — Contenus terroristes en ligne (TCO | HTTP 202 ✓ | low | (dry-run) |
| 16 | directive-sma-2018-1808 | Directive (UE) 2018/1808 — Services de médias audiovisuels ( | HTTP 202 ✓ | low | (dry-run) |
| 17 | directive-accessibility-2019-882 | Directive (UE) 2019/882 — Accessibilité des produits et serv | HTTP 202 ✓ | low | (dry-run) |
| 18 | directive-open-data-2019-1024 | Directive (UE) 2019/1024 — Données ouvertes et réutilisation | HTTP 202 ✓ | low | (dry-run) |
| 19 | directive-platform-work-2024-2831 | Directive (UE) 2024/2831 — Travail via plateforme numérique  | HTTP 202 ✓ | low | (dry-run) |
| 20 | commission-ai-act-transparency-art50 | Commission — Guidelines transparence Art. 50 AI Act (chatbot | FAIL 429 ✗ | low | (dry-run) |

## Prochaines étapes

1. Vérifier les URL FAIL et corriger le manifeste
2. Relancer avec --execute après feu vert
3. Puis lancer cron-ingestion.ts pour créer les staging_chunks