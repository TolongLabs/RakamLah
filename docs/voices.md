# Voice Engines

RakamLah supports local Kokoro narration and Chatterbox voice-reference synthesis. Model weights, Python environments,
and generated speech caches stay outside the repository.

## Kokoro

The default expects these model files:

```text
~/.local/share/rakamlah/kokoro/
  kokoro-v1.0.onnx
  voices-v1.0.bin
```

Install `kokoro-onnx`, `numpy`, and `soundfile` into a dedicated Python environment, obtain the two model files from the
Kokoro ONNX distributor you trust, and pass that interpreter to the render:

```bash
python3 -m venv .venv-rakam-kokoro
. .venv-rakam-kokoro/bin/activate
python -m pip install kokoro-onnx numpy soundfile

KOKORO_HOME="$HOME/.local/share/rakamlah/kokoro" \
RAKAM_PYTHON="$PWD/.venv-rakam-kokoro/bin/python" \
node bin/rakam.mjs narrate --config ./rakam.config.mjs --json
```

Set `tts.voice` and `tts.speed` in config. Kokoro output is written as finite 16-bit PCM WAV before mixing.

## Chatterbox

Chatterbox loads a reference voice and keeps one model resident for the whole narration batch. The reviewed dependency
pins include CPU-safe Nano support:

```bash
export CHATTERBOX_HOME="$HOME/.local/share/rakamlah/chatterbox"
python3 -m venv "$CHATTERBOX_HOME/.venv"
"$CHATTERBOX_HOME/.venv/bin/python" -m pip install -r engine/media/chatterbox-requirements.txt
```

Then configure a manifest-listed or consent-cleared reference:

```js
tts: {
  engine: 'chatterbox',
  reference: './media/voices/reference.mp3',
  speed: 1
}
```

The renderer defaults to the Nano variant. Set `CHATTERBOX_VARIANT=turbo` or `base` only when the installed runtime and
hardware support it. RakamLah disables MKL-DNN and forces the mathematical attention backend on CPU because fused paths
can produce non-finite audio on some processors.

## Cache identity

Chatterbox segments are keyed by variant, reference-file SHA-256, speed, and exact text. A fully cached batch does not
load the model. The default cache is:

```text
~/.local/share/rakamlah/chatterbox/cache/
```

Override it with `CHATTERBOX_CACHE`. Do not put the cache in Git.

## Responsible use

Only add a voice when you have informed permission to use it as a synthesis reference and permission to redistribute
the sample if it will be committed. Never use synthesized speech for deceptive impersonation. The bundled samples have
the usage and redistribution authorization described in [`../media/LICENSE.md`](../media/LICENSE.md); user-added files
remain the user's responsibility. Read [`../RESPONSIBLE_USE.md`](../RESPONSIBLE_USE.md) before publishing a dub.
