import sys
import unittest
from pathlib import Path


MEDIA_DIR = Path(__file__).resolve().parents[2] / 'engine' / 'media'
sys.path.insert(0, str(MEDIA_DIR))

import schedule  # noqa: E402


class ScheduleTests(unittest.TestCase):
    def test_pushes_colliding_lines_without_reordering_them(self):
        lines = [
            {'beat': 'one', 'ms': 100, 'visual_end_ms': 3000},
            {'beat': 'two', 'ms': 900, 'visual_end_ms': 5000},
        ]

        shifted, final_end = schedule.deconflict(lines, [1200, 500], gap_ms=260)

        self.assertEqual(shifted, 1)
        self.assertEqual(lines[1]['ms'], 1560)
        self.assertEqual(final_end, 2060)
        self.assertGreaterEqual(lines[1]['ms'], lines[0]['ms'] + lines[0]['dur_ms'] + 260)

    def test_reports_speech_that_crosses_its_visual_boundary(self):
        lines = [
            {'beat': 'one', 'ms': 100, 'visual_end_ms': 1000},
            {'beat': 'two', 'ms': 1300, 'visual_end_ms': None},
        ]
        schedule.deconflict(lines, [1000, 400])

        overruns = schedule.find_visual_overruns(lines)

        self.assertEqual(len(overruns), 1)
        self.assertEqual(overruns[0]['beat'], 'one')
        self.assertEqual(overruns[0]['overrun_ms'], 100)


if __name__ == '__main__':
    unittest.main()
