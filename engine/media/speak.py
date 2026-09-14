"""Synthesize narration with Kokoro or a cloned Chatterbox voice.

Models and generated caches live outside the repository. Both supported engines
are loaded once per batch so a recording does not pay model startup per line.
"""

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path


def _data_home():
    return Path(os.environ.get('RAKAM_DATA_HOME', Path.home() / '.local/share/rakamlah'))


KOKORO_HOME = Path(os.environ.get('KOKORO_HOME', _data_home() / 'kokoro'))
VOICE = os.environ.get('RAKAM_VOICE', 'af_heart')
CB_HOME = Path(os.environ.get('CHATTERBOX_HOME', _data_home() / 'chatterbox'))
CB_REF = Path(os.environ.get('CHATTERBOX_REF', CB_HOME / 'reference.wav'))
CB_VARIANT = os.environ.get('CHATTERBOX_VARIANT', 'nano')
TTS = os.environ.get('RAKAM_TTS', 'kokoro')
SPEED = float(os.environ.get('RAKAM_SPEED', '1.0'))


def chatterbox_cache_path(text):
    cache = Path(os.environ.get('CHATTERBOX_CACHE', CB_HOME / 'cache'))
    voice_hash = hashlib.sha256(CB_REF.read_bytes()).hexdigest()
    identity = f'{CB_VARIANT}:{voice_hash}:{SPEED}:{text}'
    return cache / f'{hashlib.sha256(identity.encode()).hexdigest()}.wav'


class ChatterboxRenderer:
    """Load one CPU-safe Chatterbox renderer and reuse its voice conditionals."""

    def __init__(self):
        import torch

        # Fused CPU attention can emit non-finite audio on older instruction
        # sets. The MATH backend is slower, deterministic, and safe.
        torch.backends.mkldnn.enabled = False
        import torchaudio

        self.torch = torch
        self.torchaudio = torchaudio
        if CB_VARIANT == 'base':
            from chatterbox.tts import ChatterboxTTS

            self.model = ChatterboxTTS.from_pretrained(device='cpu')
            self.model.t3.tfmr.config._attn_implementation = 'eager'
            for module in self.model.t3.tfmr.modules():
                if hasattr(module, 'config'):
                    module.config._attn_implementation = 'eager'
        elif CB_VARIANT in {'nano', 'turbo'}:
            from chatterbox.tts_turbo import ChatterboxTurboTTS

            self.model = ChatterboxTurboTTS.from_pretrained(device='cpu', nano=CB_VARIANT == 'nano')
        else:
            raise ValueError(f'unsupported CHATTERBOX_VARIANT={CB_VARIANT!r}; use nano, turbo, or base')

        with self._attention_context():
            self.model.prepare_conditionals(str(CB_REF))
        chatterbox_cache_path('cache-probe').parent.mkdir(parents=True, exist_ok=True)

    def _attention_context(self):
        return self.torch.nn.attention.sdpa_kernel(self.torch.nn.attention.SDPBackend.MATH)

    def render(self, text, output):
        cached = chatterbox_cache_path(text)
        if cached.exists():
            shutil.copyfile(cached, output)
            return True

        with self._attention_context():
            audio = self.model.generate(text)
        if not self.torch.isfinite(audio).all():
            print('chatterbox produced non-finite audio; refusing to write it', file=sys.stderr)
            return False
        if SPEED != 1:
            audio = self.torchaudio.functional.resample(audio, self.model.sr, round(self.model.sr / SPEED))
        self.torchaudio.save(cached, audio, self.model.sr, encoding='PCM_S', bits_per_sample=16)
        shutil.copyfile(cached, output)
        return True


class KokoroRenderer:
    def __init__(self):
        import numpy as np
        import soundfile as sf
        from kokoro_onnx import Kokoro

        model = KOKORO_HOME / 'kokoro-v1.0.onnx'
        voices = KOKORO_HOME / 'voices-v1.0.bin'
        for path in (model, voices):
            if not path.exists():
                raise FileNotFoundError(f'missing {path}; see docs/voices.md')
        self.np = np
        self.sf = sf
        self.model = Kokoro(str(model), str(voices))

    def render(self, text, output):
        audio, rate = self.model.create(text, voice=VOICE, speed=SPEED, lang='en-us')
        if not self.np.isfinite(audio).all():
            print('kokoro produced non-finite audio; refusing to write it', file=sys.stderr)
            return False
        self.sf.write(output, audio, rate, subtype='PCM_16')
        return True


def renderer_factory():
    return ChatterboxRenderer() if TTS == 'chatterbox' else KokoroRenderer()


def render_batch(lines, output_dir, renderer_factory=renderer_factory):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    if not lines:
        return 0
    for index, line in enumerate(lines):
        if not isinstance(line, dict) or not isinstance(line.get('text'), str) or not line['text'].strip():
            print(f'line {index} must contain non-empty text', file=sys.stderr)
            return 2

    if TTS == 'chatterbox':
        cached = [chatterbox_cache_path(line['text'].strip()) for line in lines]
        if all(path.exists() for path in cached):
            for index, path in enumerate(cached):
                shutil.copyfile(path, output_dir / f'{index}.wav')
            return 0

    renderer = renderer_factory()
    for index, line in enumerate(lines):
        if not renderer.render(line['text'].strip(), output_dir / f'{index}.wav'):
            return 1
    return 0


def in_chatterbox_venv(prefix=None):
    active = Path(sys.prefix if prefix is None else prefix)
    return active.resolve() == (CB_HOME / '.venv').resolve()


def chatterbox_runtime(arguments, input_text=None):
    if TTS != 'chatterbox':
        return None
    python = CB_HOME / '.venv/bin/python'
    if not python.exists():
        print(f'missing {python}; see docs/voices.md', file=sys.stderr)
        return 1
    if not CB_REF.exists():
        print(f'missing reference clip {CB_REF}', file=sys.stderr)
        return 1
    if not in_chatterbox_venv():
        import subprocess

        return subprocess.run(
            [str(python), __file__, *arguments],
            input=input_text,
            text=True,
            check=False,
        ).returncode
    return None


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == '--batch':
        if len(sys.argv) != 4:
            print('usage: speak.py --batch <lines.json> <output-dir>', file=sys.stderr)
            return 2
        try:
            lines = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as error:
            print(f'failed to read lines.json: {error}', file=sys.stderr)
            return 2
        if not isinstance(lines, list):
            print('lines.json must contain an array', file=sys.stderr)
            return 2
        if not lines:
            return 0
        runtime_result = chatterbox_runtime(sys.argv[1:])
        if runtime_result is not None:
            return runtime_result
        try:
            return render_batch(lines, Path(sys.argv[3]))
        except (FileNotFoundError, ModuleNotFoundError, ValueError) as error:
            print(error, file=sys.stderr)
            return 1

    if len(sys.argv) != 2:
        print('usage: speak.py <out.wav> (text on stdin)', file=sys.stderr)
        return 2
    text = sys.stdin.read().strip()
    if not text:
        print('no text on stdin', file=sys.stderr)
        return 2
    runtime_result = chatterbox_runtime(sys.argv[1:], text)
    if runtime_result is not None:
        return runtime_result
    try:
        renderer = renderer_factory()
    except (FileNotFoundError, ModuleNotFoundError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0 if renderer.render(text, Path(sys.argv[1])) else 1


if __name__ == '__main__':
    sys.exit(main())
