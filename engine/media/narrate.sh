#!/usr/bin/env bash
set -euo pipefail

: "${RAKAM_DIR:?RAKAM_DIR must name a run directory}"

MEDIA_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="${RAKAM_PYTHON:-$(command -v python3 || true)}"
FFMPEG="${RAKAM_FFMPEG:-$(command -v ffmpeg || true)}"
FFPROBE="${RAKAM_FFPROBE:-$(command -v ffprobe || true)}"
SCRIPT="${RAKAM_SCRIPT:?RAKAM_SCRIPT must name a narration file}"
OUTPUT="${RAKAM_OUT:-$RAKAM_DIR/demo.mp4}"
SOURCE="${RAKAM_SOURCE:-$RAKAM_DIR/capture.webm}"
ASSEMBLED="$RAKAM_DIR/capture-normalized.mp4"
SEGMENTS="$RAKAM_DIR/seg"
BGM="${RAKAM_BGM:-}"
BGM_GAIN_DB="${RAKAM_BGM_GAIN_DB:--17}"
MIN_DURATION="${RAKAM_MIN_DURATION:-60}"
MAX_DURATION="${RAKAM_MAX_DURATION:-120}"
WIDTH="${RAKAM_VIDEO_WIDTH:-1920}"
HEIGHT="${RAKAM_VIDEO_HEIGHT:-1080}"
PRESET="${RAKAM_PRESET:-slow}"
FONT="${RAKAM_SUBTITLE_FONT:-Quicksand}"
FONT_SIZE="${RAKAM_SUBTITLE_FONT_SIZE:-18}"
MARGIN_H="${RAKAM_SUBTITLE_MARGIN_H:-80}"
MARGIN_V="${RAKAM_SUBTITLE_MARGIN_V:-28}"
MAX_ROWS="${RAKAM_SUBTITLE_MAX_ROWS:-2}"
MAX_CHARS="${RAKAM_SUBTITLE_MAX_CHARS:-36}"

[ -n "$PYTHON" ] && [ -x "$PYTHON" ] || { echo "python3 is unavailable" >&2; exit 1; }
[ -n "$FFMPEG" ] && [ -x "$FFMPEG" ] || { echo "ffmpeg is unavailable" >&2; exit 1; }
[ -n "$FFPROBE" ] && [ -x "$FFPROBE" ] || { echo "ffprobe is unavailable" >&2; exit 1; }
for required in "$SOURCE" "$RAKAM_DIR/beats.json" "$SCRIPT"; do
  [ -f "$required" ] || { echo "missing required input: $required" >&2; exit 1; }
done
if [ -n "$BGM" ]; then
  [ -f "$BGM" ] || { echo "missing BGM: $BGM" >&2; exit 1; }
fi

RAKAM_SOURCE="$SOURCE" RAKAM_ASSEMBLED="$ASSEMBLED" \
  RAKAM_VIDEO_WIDTH="$WIDTH" RAKAM_VIDEO_HEIGHT="$HEIGHT" \
  RAKAM_FFMPEG="$FFMPEG" "$MEDIA_DIR/assemble.sh"

mkdir -p "$SEGMENTS"
find "$SEGMENTS" -mindepth 1 -maxdepth 1 -delete

"$PYTHON" "$MEDIA_DIR/manifest.py" "$RAKAM_DIR" "$SCRIPT"
line_count=$("$PYTHON" -c 'import json,sys; print(len(json.load(open(sys.argv[1], encoding="utf-8"))))' "$RAKAM_DIR/lines.json")
[ "$line_count" -gt 0 ] || { echo "no narration lines resolved" >&2; exit 1; }

"$PYTHON" "$MEDIA_DIR/speak.py" --batch "$RAKAM_DIR/lines.json" "$SEGMENTS"
"$PYTHON" "$MEDIA_DIR/schedule.py" "$RAKAM_DIR" "$FFPROBE"
"$PYTHON" "$MEDIA_DIR/subtitles.py" "$RAKAM_DIR" "$MAX_CHARS" "$MAX_ROWS"

audio_inputs=()
audio_filters=""
audio_labels=""
for ((index = 0; index < line_count; index += 1)); do
  start_ms=$("$PYTHON" -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))[int(sys.argv[2])]["ms"])' "$RAKAM_DIR/lines.json" "$index")
  audio_inputs+=(-i "$SEGMENTS/$index.wav")
  audio_filters+="[$index:a]adelay=${start_ms}:all=1[a$index];"
  audio_labels+="[a$index]"
done

"$FFMPEG" -y -loglevel error "${audio_inputs[@]}" \
  -filter_complex "${audio_filters}${audio_labels}amix=inputs=${line_count}:normalize=0,loudnorm=I=-18:TP=-2:LRA=7[out]" \
  -map "[out]" -ar 44100 -ac 1 "$RAKAM_DIR/narration.wav"

duration() {
  "$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$1" | head -n 1
}

video_duration=$(duration "$ASSEMBLED")
audio_duration=$(duration "$RAKAM_DIR/narration.wav")
tail_pad=$(awk -v audio="$audio_duration" -v video="$video_duration" 'BEGIN { delta=audio-video; printf "%.3f", delta > 0 ? delta + 0.4 : 0 }')
total_duration=$(awk -v padding="$tail_pad" -v video="$video_duration" 'BEGIN { printf "%.3f", video + padding }')

tpad=""
if awk -v value="$tail_pad" 'BEGIN { exit !(value > 0) }'; then
  tpad="tpad=stop_mode=clone:stop_duration=${tail_pad},"
fi

subtitle_path="${RAKAM_DIR}/narration.srt"
subtitle_path="${subtitle_path//\\/\\\\}"
subtitle_path="${subtitle_path//:/\\:}"
subtitle_filter="subtitles=filename='${subtitle_path}':force_style='FontName=${FONT},FontSize=${FONT_SIZE},PrimaryColour=&H00FFFFFF,BackColour=&H70000000,OutlineColour=&H70000000,BorderStyle=3,Outline=0.6,Shadow=0,Alignment=2,MarginL=${MARGIN_H},MarginR=${MARGIN_H},MarginV=${MARGIN_V},Spacing=0.2'"

if [ -n "$BGM" ]; then
  fade_in=$(awk -v total="$total_duration" 'BEGIN { printf "%.3f", total < 6 ? total / 3 : 2 }')
  fade_out=$(awk -v total="$total_duration" 'BEGIN { printf "%.3f", total < 12 ? total / 3 : 4 }')
  fade_start=$(awk -v total="$total_duration" -v fade="$fade_out" 'BEGIN { printf "%.3f", total - fade }')
  "$FFMPEG" -y -loglevel error -i "$ASSEMBLED" -i "$RAKAM_DIR/narration.wav" -stream_loop -1 -i "$BGM" \
    -filter_complex "[0:v]${tpad}${subtitle_filter}[video];[1:a]pan=stereo|c0=c0|c1=c0,asplit=2[voice][side-source];[side-source]apad=whole_dur=${total_duration}[side];[2:a]atrim=start=0:end=${total_duration},asetpts=PTS-STARTPTS,aformat=sample_rates=44100:channel_layouts=stereo,volume=${BGM_GAIN_DB}dB,afade=t=in:st=0:d=${fade_in},afade=t=out:st=${fade_start}:d=${fade_out}[music];[music][side]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=500:knee=2.8[ducked];[voice][ducked]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.95:attack=5:release=50:level=false:latency=true[audio]" \
    -map "[video]" -map "[audio]" -t "$total_duration" \
    -c:v libx264 -preset "$PRESET" -crf 23 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 44100 -ac 2 -movflags +faststart "$OUTPUT"
else
  "$FFMPEG" -y -loglevel error -i "$ASSEMBLED" -i "$RAKAM_DIR/narration.wav" \
    -filter_complex "[0:v]${tpad}${subtitle_filter}[video]" \
    -map "[video]" -map 1:a -t "$total_duration" \
    -c:v libx264 -preset "$PRESET" -crf 23 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ar 44100 -ac 2 -movflags +faststart "$OUTPUT"
fi

delivered=$(duration "$OUTPUT")
if ! awk -v duration="$delivered" -v minimum="$MIN_DURATION" -v maximum="$MAX_DURATION" \
  'BEGIN { exit !(duration >= minimum && duration <= maximum) }'; then
  echo "deliverable duration ${delivered}s is outside ${MIN_DURATION}-${MAX_DURATION}s" >&2
  exit 1
fi

printf 'video %.1fs; narration %.1fs; tail pad %.1fs\n' "$video_duration" "$audio_duration" "$tail_pad"
printf 'output: %s\n' "$OUTPUT"
