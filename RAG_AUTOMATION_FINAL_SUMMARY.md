# RAG Automation — Récapitulatif final du chantier

> **Date** : 26 juin 2026  
> **Statut** : prêt pour validation finale Phase 6  
> **Périmètre** : automatisation complète du cycle sources officielles → monitoring → ingestion → validation → production → qualité continue

---

## 1. Récapitulatif des 6 phases

Les métriques de lignes de code sont des approximations utiles pour situer l'ordre de grandeur du chantier. Elles incluent code applicatif, scripts, tests, migrations et documentation opérationnelle.

| Phase | Date de validation | Livrables produits | Lignes ajoutées approx. | Tests ajoutés approx. | Documentation créée |
|-------|--------------------|--------------------|--------------------------|------------------------|---------------------|
| Phase 0 — Cartographie & schéma cible | 25/06/2026 | Inventaire corpus, schéma DB cible, cartographie sources, estimation coûts | ≈ 1 200 | 0 | `RAG_INVENTORY.md`, `RAG_PIPELINE_SCHEMA.md`, `MONITORING_SOURCES.md`, `RAG_COST_ESTIMATE.md` |
| Phase 1 — Monitoring sources officielles | 25/06/2026 | Connecteurs EUR-Lex, CELLAR, Curia, EDPB, AI Office, 7 DPAs nationales, worker monitoring | ≈ 2 500 | ≈ 120 | Compléments dans `MONITORING_SOURCES.md` |
| Phase 2 — Pipeline ingestion Claude → staging | 25/06/2026 | Parsing Claude Sonnet 4.6, prompts par type documentaire, validateur, insertion `staging_chunks` | ≈ 1 400 | ≈ 35 | Prompts versionnés dans `lib/rag-ingestion/prompts/` |
| Phase 3 — Interface validation admin | 25/06/2026 | `/dashboard/admin/rag-validation`, modales correction/rejet, viewer source, API admin | ≈ 1 800 | ≈ 10 | Documentation implicite UI + types `rag-types.ts` |
| Phase 4 — Indexation production & rollback | 25/06/2026 | Upsert `legal_chunks`, archivage `historical_chunks`, invalidation cache, notifier email, rollback | ≈ 1 100 | 19 | `RAG_PRODUCTION_INDEXER.md` |
| Phase 5 — Qualité continue + corrections P0/P1/P2/P2.5 | 26/06/2026 | Golden set 16 questions, historique, couverture, chunks morts, re-chunking RGPD, parent-child RGPD, dual-pass retrieval | ≈ 2 400 | 19+ | `RAG_QUALITY_ASSURANCE.md`, `RAG_FUTURE_IMPROVEMENTS.md` |
| Phase 6 — Runbook final & automatisation cron | 26/06/2026 | Runbook opérationnel, scripts cron monitoring/ingestion, résumé final chantier | ≈ 1 300 | 0 direct | `RAG_AUTOMATION_RUNBOOK.md`, `RAG_AUTOMATION_FINAL_SUMMARY.md` |

**Total chantier estimé** : ≈ 11 700 lignes ajoutées, ≈ 200 tests ou assertions de tests ajoutés sur l'ensemble du périmètre.

---

## 2. Score final golden set

| Statut | Nombre | Questions |
|--------|--------|-----------|
| OK | **12 / 16** | Q01, Q03, Q06, Q07, Q08, Q09, Q10, Q11, Q12, Q13, Q14, Q16 |
| WARNING | **0 / 16** | — |
| CRITICAL | **4 / 16** | Q02, Q04, Q05, Q15 |

Les 4 criticals restants sont **hors scope Phase 6**. Ils sont liés au corpus AI Act non encore re-chunké / non encore enrichi en parent-child :

- **Q02** — pratiques interdites AI Act Art. 5
- **Q04** — obligations GPAI base Art. 53
- **Q05** — exemption open source GPAI Art. 53 §2
- **Q15** — transparence chatbot Art. 50

Les acquis P0/P2.5 sont préservés : Q08 et Q14 corrigées, Q07/Q10/Q11 maintenues.

---

## 3. Couverture finale

| Métrique | Valeur |
|----------|--------|
| Couverture articles critiques top-3 | **54,8 %** |
| Articles critiques vérifiés | 73 |
| Échecs critiques | 33 |

Interprétation opérationnelle : 54,8 % n'est pas une cible finale satisfaisante à long terme, mais c'est la **baseline stabilisée post-P2.5**. Les alertes doivent être interprétées en variation par rapport à cette baseline, pas comme un échec de mise en production du pipeline automatique.

---

## 4. Volume final du corpus

### Total consolidé

| Métrique | Valeur |
|----------|--------|
| Corpus avant re-chunking RGPD | 4 704 chunks |
| Anciens chunks RGPD archivés | 118 |
| Nouveaux chunks RGPD actifs post-P2.5 | 901 |
| **Total production estimé final** | **5 487 chunks actifs** |

Calcul : `4 704 - 118 + 901 = 5 487`.

### Chunks par règlement / corpus principal

| Corpus | Chunks actifs finaux |
|--------|----------------------|
| RGPD (UE 2016/679) | **901** |
| AI Act (UE 2024/1689) | 165 |
| DSA (UE 2022/2065) | 113 |
| DMA (UE 2022/1925) | 74 |
| Data Act (UE 2023/2854) | 70 |
| Data Governance Act (UE 2022/868) | 51 |
| Cyber Resilience Act (UE 2024/2847) | 102 |
| Règlement Machines (UE 2023/1230) | 114 |
| eIDAS 2 (UE 2024/1183) | 19 |
| NIS 2 (UE 2022/2555) | 70 |
| Directive DSM (UE 2019/790) | 37 |
| Directive ePrivacy (UE 2002/58/CE) | 21 |
| TFUE | 646 |
| TUE | 336 |
| Charte droits fondamentaux UE | 54 |
| CEDH | 114 |
| Lignes directrices EDPB principales | 1 298 |
| Jurisprudence CJUE principale | 1 236 |
| AI Office — GPAI Code de bonnes pratiques | 66 |

### Distribution par granularité

| Granularité | Chunks | Commentaire |
|-------------|--------|-------------|
| `article` | **99** | Chunks parent RGPD P2.5 |
| `paragraph` | **≈ 5 041** | Chunks existants + paragraphes RGPD |
| `point` | **347** | Points RGPD générés en P2 |
| **Total** | **5 487** | Estimation cohérente avec l'inventaire et P2.5 |

Note : les chunks historiques pré-P2.5 ont reçu la valeur par défaut `granularity='paragraph'` via migration, même lorsque leur découpage sémantique était article-based. Le champ est pleinement fiable pour les nouveaux chunks RGPD et les futurs documents ingérés par le pipeline.

---

## 5. Coût total estimé du chantier

| Poste | Coût estimé |
|-------|-------------|
| Parsing initial RGPD P2 avec GPT-4.1 | ≈ **1,44 $** |
| Assemblage parent-child P2.5 | **0 $** (pas de LLM, assemblage depuis source EUR-Lex) |
| Embeddings nouveaux chunks | ≈ **0,02 $** |
| Tests, fixtures, dry-runs API | ≈ **0,50 $** |
| **Total chantier estimé** | **≈ 1,96 $** |

Le coût direct LLM/API du chantier est très faible. Le coût principal a été le temps d'ingénierie, la validation juridique et les itérations de qualité retrieval.

---

## 6. Coût mensuel récurrent estimé

| Poste mensuel | Fourchette basse | Fourchette haute |
|---------------|------------------|------------------|
| Monitoring sources | ≈ 0 € | ≈ 0 € |
| Ingestion Claude Sonnet 4.6 | ≈ 1,20 €/mois | ≈ 18,00 €/mois |
| Embeddings OpenAI | < 0,01 €/mois | ≈ 0,08 €/mois |
| Qualité RAG (golden set, couverture, chunks morts) | < 0,10 €/mois | < 0,50 €/mois |
| **Total attendu** | **≈ 1,30 €/mois** | **≈ 18,60 €/mois** |

Fourchette de pilotage recommandée avec marge d'exploitation : **5–25 €/mois**. Cette enveloppe couvre les variations de taille des documents, erreurs de parsing ponctuelles, re-runs manuels et pics de publications.

---

## 7. Statut final

**Prêt pour mise en production effective sous réserve du feu vert explicite OK pour mise en production effective du système d'ingestion automatique.**

À ce stade :

- le pipeline de monitoring est implémenté ;
- l'ingestion Claude → staging est implémentée ;
- la validation admin existe ;
- l'indexation production et le rollback existent ;
- la qualité continue est instrumentée ;
- les scripts cron opérationnels sont disponibles ;
- le runbook documente activation, supervision et rollback.

---

## 8. Points d'attention futurs

### Priorité 1 — Qualité retrieval et corpus

1. **Extension de la stratégie parent-child aux autres règlements** : AI Act, DSA, DMA, CRA, Data Act. C'est le chantier le plus susceptible de corriger Q02/Q04/Q05/Q15.
2. **Re-parsing complet du corpus existant avec le pipeline Phase 2** : homogénéiser métadonnées, `source_method`, `pending_document_id`, `granularity`, hash et validation.
3. **Migration future vers Voyage-3-large pour les embeddings** : chantier séparé à mener avec double index et benchmark avant bascule.

### Priorité 2 — Sécurité et administration

4. **Middleware admin centralisé sur `/api/admin/*`** : réduire les risques de divergence d'autorisation entre routes admin.
5. **Indexation automatique sous garde-fous** : possible seulement après plusieurs semaines de cycles manuels stables.

### Priorité 3 — Couverture sources

6. **Ajout de nouvelles autorités nationales selon l'usage observé** : Pologne et Belgique candidates prioritaires.
7. **Surveillance des changements de markup sur les sources scrapées** : DPC, Garante, AP, IP SI, EDPB, Curia.
8. **Système de rafraîchissement automatique des fixtures de tests** : détecter les changements de structure tout en gardant des snapshots reviewables.

### Priorité 4 — Produit et internationalisation

9. **Traduction de l'interface en anglais** pour la cible internationale.
10. **Reporting qualité accessible côté admin** : exposer golden set, couverture et chunks morts dans une interface plutôt que seulement en Markdown/SQL.

---

## 9. Conclusion

Le chantier RAG Automation est complet sur son périmètre initial : il transforme une base RAG manuelle en système supervisé, traçable, validable et rollbackable. La prochaine décision n'est plus technique mais opérationnelle : activer ou non les crons en production avec le feu vert explicite prévu.
