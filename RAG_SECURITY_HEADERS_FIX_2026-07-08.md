# Rapport Chantier P0-2 — Headers HTTP Sécurité

**Date :** 2026-07-08
**Branche :** claude-code/fix-security-headers
**Statut :** TERMINÉ — en attente feu vert déploiement

---

## Headers ajoutés

| Header | Valeur | Protection |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Fuite d'URL |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Downgrade HTTPS → HTTP |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(self https://js.stripe.com)` | Accès périphériques |
| `Content-Security-Policy` | Voir ci-dessous | XSS, injection |

### CSP détaillée

```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.consentmanager.net https://delivery.consentmanager.net
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://upload.wikimedia.org https://images.unsplash.com https://*.supabase.co
font-src 'self' data:
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://o4507983235080192.ingest.sentry.io https://delivery.consentmanager.net
frame-src https://js.stripe.com https://hooks.stripe.com
object-src 'none'
base-uri 'self'
form-action 'self'
upgrade-insecure-requests
```

**Pourquoi `unsafe-inline` et `unsafe-eval` :** Next.js 14 App Router et React Server Components nécessitent ces directives pour l'hydratation côté client. La suppression de `unsafe-eval` et `unsafe-inline` nécessite une implémentation de nonces via middleware, documentée dans `RAG_FUTURE_IMPROVEMENTS.md` section A comme amélioration future.

---

## Score securityheaders.com attendu

Sans `unsafe-inline`/`unsafe-eval` : A+  
Avec (nécessaire pour Next.js) : A ou B+

Le score réel devra être mesuré après déploiement sur https://securityheaders.com/?q=https%3A%2F%2Fwww.compliai.eu

---

## Vérification build

```
✓ npm run build — 0 erreurs
✓ Aucune page ni route impactée
✓ First Load JS: 87.7 kB (inchangé)
```

---

## Amélioration future (P3)

Nonce-based CSP pour éliminer `unsafe-inline` et `unsafe-eval` :
- Nécessite middleware Next.js qui génère un nonce par requête
- Injecte le nonce dans tous les scripts et styles inline
- Effort M, impact sécurité élevé
- Documenté dans RAG_FUTURE_IMPROVEMENTS.md section A
