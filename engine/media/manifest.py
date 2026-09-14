"""Resolve beat-keyed narration into a timing manifest."""

import json
import sys
from pathlib import Path


def _read_beats(path):
    beats = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(beats, list) or not beats:
        raise ValueError('beats.json must contain a non-empty array')

    normalized = []
    seen = set()
    previous = -1
    for index, item in enumerate(beats):
        if not isinstance(item, dict):
            raise ValueError(f'beat {index} must be an object')
        name = item.get('beat')
        at_ms = item.get('atMs')
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f'beat {index} has no name')
        if name in seen:
            raise ValueError(f'duplicate beat {name!r}')
        if not isinstance(at_ms, (int, float)) or at_ms < previous:
            raise ValueError(f'beat {name!r} has an invalid timestamp')
        seen.add(name)
        previous = int(at_ms)
        normalized.append({'beat': name, 'atMs': int(at_ms)})
    return normalized


def _read_script(path):
    rows = []
    for number, raw in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        parts = [part.strip() for part in line.split('|', 2)]
        if len(parts) != 3 or not parts[0] or not parts[2]:
            raise ValueError(f'narration line {number} must be: beat | offset_ms | spoken text')
        try:
            offset = int(parts[1])
        except ValueError as error:
            raise ValueError(f'narration line {number} has a non-integer offset') from error
        rows.append((parts[0], offset, parts[2]))
    if not rows:
        raise ValueError('narration script contains no spoken lines')
    return rows


def build(run_dir, script_path):
    root = Path(run_dir)
    beats = _read_beats(root / 'beats.json')
    rows = _read_script(Path(script_path))
    beat_times = {item['beat']: item['atMs'] for item in beats}
    visual_ends = {
        item['beat']: beats[index + 1]['atMs'] if index + 1 < len(beats) else None
        for index, item in enumerate(beats)
    }

    lines = []
    missing = []
    for name, offset, text in rows:
        if name not in beat_times:
            missing.append(f'beat {name!r} never happened: {text[:50]}')
            continue
        lines.append({
            'beat': name,
            'ms': beat_times[name] + offset,
            'visual_end_ms': visual_ends[name],
            'text': text,
        })
    if missing:
        raise ValueError('; '.join(missing))

    lines.sort(key=lambda item: item['ms'])
    (root / 'lines.json').write_text(
        f'{json.dumps(lines, indent=2, ensure_ascii=False)}\n',
        encoding='utf-8',
    )
    print(f'  {len(lines)} lines resolved against {len(beats)} beats')
    return lines


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('usage: manifest.py <run-dir> <narration-script>', file=sys.stderr)
        sys.exit(2)
    try:
        build(sys.argv[1], sys.argv[2])
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f'manifest error: {error}', file=sys.stderr)
        sys.exit(1)
