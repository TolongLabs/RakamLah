"""Build compact, beat-aligned SRT subtitles from measured narration audio."""

import json
import sys
import wave
from pathlib import Path


DEFAULT_MAX_CHARS = 36
DEFAULT_MAX_ROWS = 2
DEFAULT_MIN_CARD_MS = 900


def wav_ms(path):
    with wave.open(str(path)) as audio:
        return int(1000 * audio.getnframes() / audio.getframerate())


def _split_long_words(words, max_chars):
    split = []
    for word in words:
        if len(word) <= max_chars:
            split.append(word)
        else:
            split.extend(word[index:index + max_chars] for index in range(0, len(word), max_chars))
    return split


def wrap(text, max_chars=DEFAULT_MAX_CHARS):
    """Split text into balanced rows without exceeding the configured width."""
    words = _split_long_words(text.split(), max_chars)
    if not words:
        return []

    def pack(row_count):
        best = None

        def search(index, made, rows, longest):
            nonlocal best
            if best is not None and longest >= best[0]:
                return
            if made == row_count - 1:
                tail = ' '.join(words[index:])
                candidate = max(longest, len(tail))
                if tail and candidate <= max_chars and (best is None or candidate < best[0]):
                    best = (candidate, rows + [tail])
                return
            for end in range(index + 1, len(words)):
                row = ' '.join(words[index:end])
                if len(row) > max_chars:
                    break
                search(end, made + 1, rows + [row], max(longest, len(row)))

        search(0, 0, [], 0)
        return best

    for row_count in range(1, len(words) + 1):
        result = pack(row_count)
        if result:
            return result[1]
    return words


def cards(text, max_chars=DEFAULT_MAX_CHARS, max_rows=DEFAULT_MAX_ROWS):
    rows = wrap(text, max_chars=max_chars)
    if not rows:
        return []
    first_size = len(rows) % max_rows or max_rows
    groups = [rows[:first_size]]
    groups.extend(rows[index:index + max_rows] for index in range(first_size, len(rows), max_rows))
    return ['\n'.join(group) for group in groups]


def timestamp(milliseconds):
    milliseconds = max(0, int(milliseconds))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1000)
    return f'{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}'


def build(
    run_dir,
    max_chars=DEFAULT_MAX_CHARS,
    max_rows=DEFAULT_MAX_ROWS,
    min_card_ms=DEFAULT_MIN_CARD_MS,
):
    root = Path(run_dir)
    lines = json.loads((root / 'lines.json').read_text(encoding='utf-8'))
    spans = []
    for index, line in enumerate(lines):
        segment = root / 'seg' / f'{index}.wav'
        if not segment.exists():
            raise ValueError(f'no audio segment for narration line {index}')
        chunks = cards(line['text'], max_chars=max_chars, max_rows=max_rows)
        total = wav_ms(segment)
        weights = [len(chunk.replace('\n', ' ')) for chunk in chunks]
        weight_sum = sum(weights) or 1
        cursor = int(line['ms'])
        for chunk, weight in zip(chunks, weights):
            duration = max(min_card_ms, int(total * weight / weight_sum))
            spans.append([cursor, cursor + duration, chunk])
            cursor += duration

    spans.sort(key=lambda span: span[0])
    for current, following in zip(spans, spans[1:]):
        if current[1] > following[0]:
            current[1] = following[0]
    spans = [span for span in spans if span[1] - span[0] >= 200]

    cues = [
        f'{number}\n{timestamp(start)} --> {timestamp(end)}\n{text}\n'
        for number, (start, end, text) in enumerate(spans, start=1)
    ]
    output = root / 'narration.srt'
    output.write_text('\n'.join(cues), encoding='utf-8')
    print(f'  {len(cues)} subtitle cards from {len(lines)} narration lines')
    return output


if __name__ == '__main__':
    if len(sys.argv) not in {2, 3, 4, 5}:
        print('usage: subtitles.py <run-dir> [max-chars] [max-rows] [min-card-ms]', file=sys.stderr)
        sys.exit(2)
    try:
        build(
            sys.argv[1],
            int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_MAX_CHARS,
            int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_MAX_ROWS,
            int(sys.argv[4]) if len(sys.argv) > 4 else DEFAULT_MIN_CARD_MS,
        )
    except (OSError, ValueError, KeyError, json.JSONDecodeError, wave.Error) as error:
        print(f'subtitle error: {error}', file=sys.stderr)
        sys.exit(1)
