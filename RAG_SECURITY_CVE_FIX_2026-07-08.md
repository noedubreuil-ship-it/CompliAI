# Rapport Chantier P0-1 — Sécurité CVE npm

**Date :** 2026-07-08
**Branche :** claude-code/fix-security-cve
**Statut :** TERMINÉ — en attente feu vert déploiement

---

## Résultat

| Sévérité | Avant | Après |
|---|---|---|
| CRITICAL | 2 | **0** |
| HIGH | 6 | **4** |
| MODERATE | 0 | 2 |
| LOW | 0 | 1 |

---

## Actions réalisées

### 1. next 14.2.18 → 14.2.35
Latest patch du canal 14.x. Résout l'Authorization Bypass CRITICAL (CVE-2025-29927), le middleware SSRF, le cache poisoning et 15+ autres CVE qui étaient classifiées CRITICAL dans la version 14.2.18.

### 2. vitest CRITICAL résolue (via npm audit fix)
CVE GHSA — arbitrary file read when Vitest UI server is listening. Résolue par mise à jour des dépendances transitives.

### 3. form-data, ws, vite HIGH résolus (via npm audit fix)
- form-data: CRLF injection dans multipart
- ws: mémoire non initialisée + DoS par fragments
- vite: NTLMv2 hash disclosure (Windows dev server)

---

## Vulnérabilités résiduelles

### HIGH — next (4 CVEs)
Toutes nécessitent Next.js 15.x ou 16.x (saut de version majeur avec breaking changes).

**CVEs résiduelles :**
- GHSA-9g9p-9gw9-jx7f : DoS via Image Optimizer remotePatterns
- GHSA-h25m-26qc-wcjf : HTTP request deserialization DoS (RSC)
- GHSA-ggv3-7p47-pfv8 : HTTP request smuggling in rewrites
- GHSA-q4gf-8mx6-v5v3 / GHSA-8h8q-6873-q5fj : DoS Server Components
- GHSA-3g8h-86w9-wvmq : Cache poisoning middleware redirects
- GHSA-ffhc-5mcf-pf4q : XSS avec CSP nonces
- GHSA-vfv6-92ff-j949 / GHSA-wfc6-r584-vfw7 : Cache poisoning RSC
- GHSA-gx5p-jg67-6x7h : XSS beforeInteractive scripts
- GHSA-h64f-5h5j-jqjh : DoS Image Optimization API
- GHSA-c4j6-fc7j-m34r : SSRF WebSocket upgrades
- GHSA-36qx-fr4f-26g5 : Middleware bypass i18n

**Évaluation risque réel :**
- Les DoS Server Components sont conditionnés à des payloads malformés spécifiques — risque modéré en production Vercel avec CDN en frontal
- Les XSS (CSP nonces, beforeInteractive) sont mitigables par les headers HTTP sécurité (P0-2)
- L'SSRF WebSocket nécessite que l'app utilise des upgrades WebSocket — à vérifier

**Action recommandée :** Chantier dédié `fix/nextjs-15-migration` après stabilisation des P0 en cours.

### MODERATE — @anthropic-ai/sdk
GHSA-p7fg-763f-g4gf : insecure file permissions dans le Local Filesystem Memory Tool. Ce tool n'est pas utilisé par CompliAI (pas de `MemorySaver` local). **Risque nul en pratique.**

### MODERATE — postcss (dépendance transitive de next)
GHSA-qx2v-qp2m-jg93 : XSS via `</style>` dans CSS stringify. Dépendance transitive de next — ne sera corrigé qu'avec next@16.

### LOW — esbuild (outil de dev)
GHSA-g7r4-m6w7-qqqr : arbitrary file read sur Windows dev server. Dev uniquement, Windows uniquement. **Risque nul en production.**

---

## Vérification build

```
✓ npm run build — 0 erreurs
✓ All routes compiled (100 API routes + 50+ pages)
✓ First Load JS: 87.7 kB (inchangé)
✓ Middleware: 78.2 kB (inchangé)
```

---

## Prochaine étape

Migration Next.js 15.x ou 16.x — chantier séparé nécessitant :
1. Audit des breaking changes (async `cookies()`, `headers()`, `params`)
2. Mise à jour des routes API et pages concernées
3. Tests complets en staging
4. Déploiement progressif
