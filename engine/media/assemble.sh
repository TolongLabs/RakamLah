#!/usr/bin/env bash
set -euo pipefail

: "${RAKAM_DIR:?RAKAM_DIR must name a run directory}"

FFMPEG="${RAKAM_FFMPEG:-$(command -v ffmpeg || true)}"
SOURCE="${RAKAM_SOURCE:-$RAKAM_DIR/capture.webm}"
OUTPUT="${RAKAM_ASSEMBLED:-$RAKAM_DIR/capture-normalized.mp4}"
WIDTH="${RAKAM_VIDEO_WIDTH:-1920}"
HEIGHT="${RAKAM_VIDEO_HEIGHT:-1080}"
PAD="${RAKAM_PAD:-#101418}"

[ -n "$FFMPEG" ] && [ -x "$FFMPEG" ] || { echo "ffmpeg is unavailable" >&2; exit 1; }
[ -f "$SOURCE" ] || { echo "missing capture: $SOURCE" >&2; exit 1; }

"$FFMPEG" -y -loglevel error -i "$SOURCE" \
  -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${PAD},fps=30,format=yuv420p" \
  -an "$OUTPUT"

printf 'normalized capture: %s\n' "$OUTPUT"
