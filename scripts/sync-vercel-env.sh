#!/usr/bin/env bash
# Synchronise .env.local vers Vercel (production).
# Prérequis : npx vercel login && npx vercel link
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "Fichier .env.local introuvable."
  exit 1
fi

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  # Retire les guillemets éventuels
  value="${value%\"}"
  value="${value#\"}"
  echo "→ $key"
  printf '%s' "$value" | npx vercel env add "$key" production --force 2>/dev/null || \
    printf '%s' "$value" | npx vercel env add "$key" production
done < .env.local

echo "Variables synchronisées. Lancez : npx vercel --prod"
