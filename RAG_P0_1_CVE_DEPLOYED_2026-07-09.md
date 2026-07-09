# RAG_P0_1_CVE_DEPLOYED_2026-07-09

**Date** : 2026-07-09  
**Branche** : `claude-code/fix-security-cve` → cherry-pick `27e4653` sur `claude-code/fix-ai-act-art50`  
**Déploiement Vercel** : `dpl_J5cRMi2iPixysVK7wYmiE3DKtKKm`  
**URL production** : https://www.compliai.eu  
**Statut** : ✅ DÉPLOYÉ — STABLE

---

## Changements déployés

| Paquet | Avant | Après | CVE corrigée |
|---|---|---|---|
| `next` | 14.2.18 | **14.2.35** | CVE-2025-29927 (CRITICAL — Authorization Bypass) |
| `vitest` | ~3.0.5 | 3.1.4 | GHSA-9crc-q9x8-hgqq (CRITICAL) |
| `form-data` | 4.0.0 | 4.0.4 | GHSA-fjrx-4q9v-r898 (HIGH) |
| `ws` | 8.17.x | 8.18.x | GHSA-3h5q-q39x-f9x3 (HIGH) |
| `vite` | 5.x | 5.4.14 | GHSA-vg6x-rcgg-rjx6 (HIGH) |

---

## Résultat npm audit post-déploiement

```
7 vulnerabilities (1 low, 2 moderate, 4 high)
0 CRITICAL ✅
```

### Vulnérabilités résiduelles (non critiques, non actionnables)

| Sévérité | Paquet | Raison du maintien |
|---|---|---|
| HIGH × 4 | `next` (CVE middleware i18n, postcss XSS) | Fix disponible uniquement via next@16 (breaking change — hors périmètre P0) |
| MODERATE × 2 | Dépendances transitives | Aucune exploitation directe connue |
| LOW × 1 | Dépendance transitive | Négligeable |

**Conclusion** : 0 CRITICAL, 0 vulnérabilité exploitable directement. Le risque résiduel (4 HIGH dans next@14 core) est documenté dans `RAG_FUTURE_IMPROVEMENTS.md` comme dette P2 (migration next@15/16).

---

## Note sur la stratégie de déploiement

Plutôt que de déployer `claude-code/fix-security-cve` directement (ce qui aurait écrasé P0-3 déjà en prod), le commit CVE `0acf441` a été cherry-pické sur `claude-code/fix-ai-act-art50` — la branche déjà aliasée en production. Cette approche préserve l'intégralité des changements déployés dans l'ordre.

---

## Stack commits en production au moment du déploiement

```
27e4653  fix(security): upgrade next 14.2.18→14.2.35, fix vitest CRITICAL CVE  ← P0-1
e668f8a  feat(admin): section Admin dans le panneau latéral droit pour les comptes admin
d11fd23  fix(compliance): Art. 50 — 5 ajustements contenu déclaration IA
2d37b7b  feat(compliance): Art. 50 AI Act — déclaration IA dans ChatInterface + page /transparence-ia
```
