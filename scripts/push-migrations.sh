#!/usr/bin/env bash
# Applique les migrations Supabase sur le projet distant.
# Prérequis : supabase login && supabase link --project-ref hhdmkuwgrtflcqzzteom
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase db push
