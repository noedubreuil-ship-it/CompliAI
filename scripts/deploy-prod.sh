#!/usr/bin/env bash
#
# deploy-prod.sh — Déploiement production Vercel non interactif.
#
# Lit VERCEL_TOKEN depuis .env.local (fichier gitignoré) et déclenche un
# déploiement --prod. Permet un déploiement autonome sans login interactif et
# sans jamais exposer le token (ni en argument visible d'un historique partagé,
# ni dans un commit).
#
# Prérequis : une ligne `VERCEL_TOKEN=...` dans .env.local
#   (créée dans Vercel → Account Settings → Tokens, jamais collée dans un chat).
#
# Usage :
#   npm run deploy:prod            # build + déploiement production
#   npm run deploy:prod -- --dry   # vérifie seulement la présence du token
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "✗ .env.local introuvable." >&2
  exit 1
fi

# Extraction robuste de la seule variable VERCEL_TOKEN (pas de source du fichier
# entier, pour éviter qu'une ligne non-shell ne casse le script).
# `|| true` : sans correspondance, grep sort en 1 et, sous `set -e`/`pipefail`,
# couperait le script avant le message d'erreur clair ci-dessous.
VERCEL_TOKEN="$( { grep -E '^VERCEL_TOKEN=' .env.local || true; } | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "✗ VERCEL_TOKEN absent de .env.local." >&2
  echo "  Crée-le dans Vercel → Account Settings → Tokens, puis ajoute dans .env.local :" >&2
  echo "    VERCEL_TOKEN=xxxxxxxx" >&2
  exit 1
fi

if [ "${1:-}" = "--dry" ]; then
  echo "✓ VERCEL_TOKEN présent (${#VERCEL_TOKEN} caractères). Prêt à déployer."
  exit 0
fi

echo "→ Build + déploiement production Vercel…"
npx vercel@latest --prod --yes --token="$VERCEL_TOKEN"
