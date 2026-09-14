import json
import sys
import tempfile
import unittest
from pathlib import Path


MEDIA_DIR = Path(__file__).resolve().parents[2] / 'engine' / 'media'
sys.path.insert(0, str(MEDIA_DIR))

import manifest  # noqa: E402


class ManifestTests(unittest.TestCase):
    def test_resolves_narration_against_canonical_beats(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'beats.json').write_text(
                json.dumps([
                    {'beat': 'landing', 'atMs': 0},
                    {'beat': 'result', 'atMs': 4100},
                    {'beat': 'finish', 'atMs': 8900},
                ]),
                encoding='utf-8',
            )
            script = root / 'narration.txt'
            script.write_text(
                '# beat | offset in milliseconds | spoken line\n'
                'landing | 150 | Start with a clear overview.\n'
                'result | 200 | The result appears in context.\n',
                encoding='utf-8',
            )

            lines = manifest.build(root, script)

            self.assertEqual(lines, [
                {
                    'beat': 'landing',
                    'ms': 150,
                    'visual_end_ms': 4100,
                    'text': 'Start with a clear overview.',
                },
                {
                    'beat': 'result',
                    'ms': 4300,
                    'visual_end_ms': 8900,
                    'text': 'The result appears in context.',
                },
            ])
            self.assertEqual(
                json.loads((root / 'lines.json').read_text(encoding='utf-8')),
                lines,
            )

    def test_rejects_a_narration_beat_that_was_not_recorded(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'beats.json').write_text(
                json.dumps([{'beat': 'landing', 'atMs': 0}]),
                encoding='utf-8',
            )
            script = root / 'narration.txt'
            script.write_text('missing | 0 | This cannot be synchronized.\n', encoding='utf-8')

            with self.assertRaisesRegex(ValueError, 'never happened'):
                manifest.build(root, script)

    def test_rejects_malformed_narration_rows(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'beats.json').write_text(
                json.dumps([{'beat': 'landing', 'atMs': 0}]),
                encoding='utf-8',
            )
            script = root / 'narration.txt'
            script.write_text('landing | missing spoken text\n', encoding='utf-8')

            with self.assertRaisesRegex(ValueError, 'line 1'):
                manifest.build(root, script)


if __name__ == '__main__':
    unittest.main()
