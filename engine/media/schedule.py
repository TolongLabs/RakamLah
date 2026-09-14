"""Prevent narration collisions and reject speech that crosses a visual beat."""

import json
import subprocess
import sys
from pathlib import Path


GAP_MS = 260


def duration_ms(path, ffprobe='ffprobe'):
    result = subprocess.run(
        [ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise ValueError(f'cannot measure {path}: {result.stderr.strip() or "no duration returned"}')
    return round(float(result.stdout.strip()) * 1000)


def deconflict(lines, durations, gap_ms=GAP_MS):
    """Push starts later so consecutive speech never overlaps."""
    if len(lines) != len(durations):
        raise ValueError('every narration line must have exactly one audio segment')
    previous_end = None
    shifted = 0
    for index, line in enumerate(lines):
        duration = int(durations[index])
        if duration <= 0:
            raise ValueError(f'line {index} has empty audio')
        line['dur_ms'] = duration
        requested = int(line['ms'])
        if previous_end is not None and requested < previous_end + gap_ms:
            line['ms'] = previous_end + gap_ms
            shifted += 1
            print(f'  line {index} pushed {line["ms"] - requested}ms later')
        previous_end = int(line['ms']) + duration
    return shifted, previous_end


def find_visual_overruns(lines):
    overruns = []
    for index, line in enumerate(lines):
        boundary = line.get('visual_end_ms')
        if boundary is None:
            continue
        overrun = int(line['ms']) + int(line['dur_ms']) - int(boundary)
        if overrun > 0:
            overruns.append({
                'index': index,
                'beat': line.get('beat', 'unknown'),
                'overrun_ms': overrun,
            })
    return overruns


def main(run_dir, ffprobe='ffprobe'):
    root = Path(run_dir)
    lines = json.loads((root / 'lines.json').read_text(encoding='utf-8'))
    durations = [duration_ms(root / 'seg' / f'{index}.wav', ffprobe) for index in range(len(lines))]
    shifted, final_end = deconflict(lines, durations)
    (root / 'lines.json').write_text(
        f'{json.dumps(lines, indent=2, ensure_ascii=False)}\n',
        encoding='utf-8',
    )

    overlaps = sum(
        1
        for current, following in zip(lines, lines[1:])
        if current['ms'] + current['dur_ms'] > following['ms']
    )
    if overlaps:
        print('narration overlap remains after scheduling', file=sys.stderr)
        return 1

    overruns = find_visual_overruns(lines)
    for overrun in overruns:
        print(
            f'visual overrun: line {overrun["index"]} ({overrun["beat"]}) '
            f'crosses the next beat by {overrun["overrun_ms"]}ms',
            file=sys.stderr,
        )
    if overruns:
        return 1

    print(f'  {len(lines)} lines, {shifted} shifted; narration ends at {final_end or 0}ms')
    return 0


if __name__ == '__main__':
    if len(sys.argv) not in {2, 3}:
        print('usage: schedule.py <run-dir> [ffprobe]', file=sys.stderr)
        sys.exit(2)
    try:
        sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else 'ffprobe'))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f'schedule error: {error}', file=sys.stderr)
        sys.exit(1)
