import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


MEDIA_DIR = Path(__file__).resolve().parents[2] / 'engine' / 'media'
sys.path.insert(0, str(MEDIA_DIR))

import speak  # noqa: E402


class FakeRenderer:
    def __init__(self):
        self.calls = []

    def render(self, text, output):
        self.calls.append(text)
        Path(output).write_bytes(text.encode('utf-8'))
        return True


class SpeechBatchTests(unittest.TestCase):
    def test_cache_key_changes_with_text_voice_speed_and_variant(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            reference = root / 'reference.wav'
            reference.write_bytes(b'voice-one')
            with mock.patch.object(speak, 'CB_REF', reference), \
                 mock.patch.object(speak, 'CB_VARIANT', 'nano'), \
                 mock.patch.object(speak, 'SPEED', 1.0), \
                 mock.patch.dict(os.environ, {'CHATTERBOX_CACHE': str(root / 'cache')}):
                first = speak.chatterbox_cache_path('A line')
                changed_text = speak.chatterbox_cache_path('Another line')
                reference.write_bytes(b'voice-two')
                changed_voice = speak.chatterbox_cache_path('A line')
                with mock.patch.object(speak, 'SPEED', 1.2):
                    changed_speed = speak.chatterbox_cache_path('A line')

            self.assertEqual(len({first, changed_text, changed_voice, changed_speed}), 4)

    def test_batch_constructs_one_renderer_for_all_uncached_lines(self):
        with tempfile.TemporaryDirectory() as temporary:
            renderer = FakeRenderer()
            factory_calls = []

            def factory():
                factory_calls.append(True)
                return renderer

            with mock.patch.object(speak, 'TTS', 'kokoro'):
                result = speak.render_batch(
                    [{'text': 'First'}, {'text': 'Second'}],
                    Path(temporary),
                    renderer_factory=factory,
                )

            self.assertEqual(result, 0)
            self.assertEqual(len(factory_calls), 1)
            self.assertEqual(renderer.calls, ['First', 'Second'])

    def test_fully_cached_chatterbox_batch_never_loads_a_model(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            reference = root / 'reference.wav'
            reference.write_bytes(b'voice')
            lines = [{'text': 'First'}, {'text': 'Second'}]
            cache = root / 'cache'
            with mock.patch.object(speak, 'TTS', 'chatterbox'), \
                 mock.patch.object(speak, 'CB_REF', reference), \
                 mock.patch.dict(os.environ, {'CHATTERBOX_CACHE': str(cache)}):
                for line in lines:
                    path = speak.chatterbox_cache_path(line['text'])
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(line['text'].encode('utf-8'))

                def forbidden_factory():
                    self.fail('a fully cached batch must not load a model')

                output = root / 'segments'
                result = speak.render_batch(lines, output, renderer_factory=forbidden_factory)

            self.assertEqual(result, 0)
            self.assertEqual((output / '0.wav').read_bytes(), b'First')
            self.assertEqual((output / '1.wav').read_bytes(), b'Second')


if __name__ == '__main__':
    unittest.main()
