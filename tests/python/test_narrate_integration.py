import json
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


MEDIA_DIR = Path(__file__).resolve().parents[2] / 'engine' / 'media'


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'ffmpeg and ffprobe are required')
class NarrateIntegrationTests(unittest.TestCase):
    def test_one_batch_is_composed_with_subtitles_bgm_and_verified_streams(self):
        with tempfile.TemporaryDirectory(prefix="rakam-O'Brien [preview],v1;-") as temporary:
            root = Path(temporary)
            source = root / 'capture.mp4'
            bgm = root / 'bgm.wav'
            subprocess.run(
                [
                    'ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
                    'color=c=0x15211c:s=320x180:d=3', '-pix_fmt', 'yuv420p', str(source),
                ],
                check=True,
            )
            subprocess.run(
                [
                    'ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
                    'sine=frequency=220:duration=3', '-ac', '2', str(bgm),
                ],
                check=True,
            )
            (root / 'beats.json').write_text(
                json.dumps([
                    {'beat': 'landing', 'atMs': 0},
                    {'beat': 'finish', 'atMs': 2500},
                ]),
                encoding='utf-8',
            )
            narration = root / 'narration.txt'
            narration.write_text('landing | 100 | A visible result.\n', encoding='utf-8')
            speaker = root / 'fake_speaker.py'
            speaker.write_text(
                textwrap.dedent(
                    '''
                    import json, sys, wave
                    from pathlib import Path

                    if len(sys.argv) != 4 or sys.argv[1] != '--batch':
                        raise SystemExit(2)
                    lines = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
                    output = Path(sys.argv[3])
                    output.mkdir(parents=True, exist_ok=True)
                    (output.parent / 'speaker-invocations.txt').write_text('batch\\n', encoding='utf-8')
                    for index, _line in enumerate(lines):
                        with wave.open(str(output / f'{index}.wav'), 'wb') as audio:
                            audio.setnchannels(1)
                            audio.setsampwidth(2)
                            audio.setframerate(24000)
                            audio.writeframes(b'\\0\\0' * 24000)
                    '''
                ).lstrip(),
                encoding='utf-8',
            )
            output = root / 'demo.mp4'
            environment = {
                **os.environ,
                'RAKAM_DIR': str(root),
                'RAKAM_SOURCE': str(source),
                'RAKAM_SCRIPT': str(narration),
                'RAKAM_SPEAK': str(speaker),
                'RAKAM_PYTHON': sys.executable,
                'RAKAM_OUT': str(output),
                'RAKAM_BGM': str(bgm),
                'RAKAM_MIN_DURATION': '1',
                'RAKAM_MAX_DURATION': '6',
                'RAKAM_VIDEO_WIDTH': '320',
                'RAKAM_VIDEO_HEIGHT': '180',
                'RAKAM_PRESET': 'ultrafast',
                'RAKAM_SUBTITLE_FONT': 'DejaVu Sans',
                'RAKAM_SUBTITLE_FONT_SIZE': '12',
            }

            result = subprocess.run(
                ['bash', str(MEDIA_DIR / 'narrate.sh')],
                capture_output=True,
                text=True,
                env=environment,
                timeout=60,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / 'speaker-invocations.txt').read_text(encoding='utf-8'), 'batch\n')
            self.assertTrue((root / 'narration.srt').is_file())
            metadata = subprocess.run(
                [
                    'ffprobe', '-v', 'error', '-show_entries',
                    'format=duration:stream=codec_type,codec_name,width,height,channels',
                    '-of', 'json', str(output),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            probed = json.loads(metadata.stdout)
            video = next(stream for stream in probed['streams'] if stream['codec_type'] == 'video')
            audio = next(stream for stream in probed['streams'] if stream['codec_type'] == 'audio')
            self.assertEqual((video['codec_name'], video['width'], video['height']), ('h264', 320, 180))
            self.assertEqual((audio['codec_name'], audio['channels']), ('aac', 2))
            self.assertGreaterEqual(float(probed['format']['duration']), 2.9)
            self.assertLessEqual(float(probed['format']['duration']), 3.2)


if __name__ == '__main__':
    unittest.main()
