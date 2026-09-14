import json
import re
import sys
import tempfile
import unittest
import wave
from pathlib import Path


MEDIA_DIR = Path(__file__).resolve().parents[2] / 'engine' / 'media'
sys.path.insert(0, str(MEDIA_DIR))

import subtitles  # noqa: E402


def silent_wav(path, duration_ms, rate=16000):
    frames = round(rate * duration_ms / 1000)
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(b'\x00\x00' * frames)


def milliseconds(timestamp):
    hours, minutes, rest = timestamp.split(':')
    seconds, millis = rest.split(',')
    return ((int(hours) * 60 + int(minutes)) * 60 + int(seconds)) * 1000 + int(millis)


class SubtitleTests(unittest.TestCase):
    def test_cards_never_exceed_the_configured_rows(self):
        text = 'A portable recording flow stays readable while every visible action remains easy to follow.'
        cards = subtitles.cards(text, max_chars=22, max_rows=2)

        self.assertGreater(len(cards), 1)
        self.assertTrue(all(len(card.splitlines()) <= 2 for card in cards))
        self.assertTrue(all(len(row) <= 22 for card in cards for row in card.splitlines()))

    def test_generated_cards_do_not_overlap(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'seg').mkdir()
            lines = [
                {'ms': 0, 'text': 'The first concise product moment is shown clearly.'},
                {'ms': 1200, 'text': 'The next moment stays visually synchronized.'},
            ]
            (root / 'lines.json').write_text(json.dumps(lines), encoding='utf-8')
            silent_wav(root / 'seg' / '0.wav', 1800)
            silent_wav(root / 'seg' / '1.wav', 1400)

            output = subtitles.build(root, max_chars=24, max_rows=2, min_card_ms=200)
            contents = output.read_text(encoding='utf-8')
            ranges = re.findall(r'(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})', contents)

            self.assertGreaterEqual(len(ranges), 2)
            for current, following in zip(ranges, ranges[1:]):
                self.assertLessEqual(milliseconds(current[1]), milliseconds(following[0]))
            blocks = [block.splitlines()[2:] for block in contents.strip().split('\n\n')]
            self.assertTrue(all(len(rows) <= 2 for rows in blocks))

    def test_short_audio_never_extends_cards_past_audio_or_visual_end(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'seg').mkdir()
            lines = [
                {
                    'ms': 500,
                    'visual_end_ms': 1350,
                    'text': (
                        'Every compact subtitle card must stay attached to the measured narration '
                        'even when many cards share a very short audio segment.'
                    ),
                }
            ]
            (root / 'lines.json').write_text(json.dumps(lines), encoding='utf-8')
            silent_wav(root / 'seg' / '0.wav', 1000)

            output = subtitles.build(root, max_chars=18, max_rows=2, min_card_ms=900)
            contents = output.read_text(encoding='utf-8')
            ranges = re.findall(r'(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})', contents)

            self.assertGreater(len(ranges), 1)
            self.assertLessEqual(max(milliseconds(end) for _, end in ranges), 1350)
            for current, following in zip(ranges, ranges[1:]):
                self.assertLessEqual(milliseconds(current[1]), milliseconds(following[0]))


if __name__ == '__main__':
    unittest.main()
