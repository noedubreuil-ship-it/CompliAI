#!/usr/bin/env bash
# Génère une version Full HD 1920×1080 de public/videos/hero.mp4
# - Lanczos + léger sharpen
# - H.264 CRF 17, faststart (web)
# - Pas de vrais détails en plus qu’à la prise de vue : l’upscale lisse l’image.
#   Pour un gain « type IA » : Topaz Video, etc.
#
# Prérequis : brew install ffmpeg
# Usage : npm run video:upscale-hero

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="${ROOT}/public/videos/hero.mp4"
OUT="${ROOT}/public/videos/hero-upscaled.mp4"
BAK="${ROOT}/public/videos/hero.backup-before-upscale.mp4"
TARGET_W="${TARGET_W:-1920}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg n'est pas installé. Installe-le avec :"
  echo "  brew install ffmpeg"
  exit 1
fi

if [[ ! -f "$IN" ]]; then
  echo "Fichier introuvable : $IN"
  exit 1
fi

echo "→ Sauvegarde : $BAK"
cp -f "$IN" "$BAK"

echo "→ Encodage ${TARGET_W}px de large (Full HD si 1920) — peut prendre plusieurs minutes…"

VF="scale=${TARGET_W}:-2:flags=lanczos+accurate_rnd+full_chroma_int,unsharp=5:5:0.4:3:3:0.04,format=yuv420p"

ffmpeg -y -hide_banner -loglevel warning -i "$IN" \
  -vf "$VF" \
  -c:v libx264 -crf 17 -preset slow \
  -movflags +faststart \
  -an \
  "$OUT"

echo "→ Remplacement de hero.mp4"
mv -f "$OUT" "$IN"

ls -lh "$IN"
echo "Terminé. Secours : $BAK"
echo "Pour du 4K : TARGET_W=3840 npm run video:upscale-hero"
