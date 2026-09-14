# Voice Engines

RakamLah supports local Kokoro narration and Chatterbox voice-reference synthesis. Model weights, Python environments,
and generated speech caches stay outside the repository. `rakam doctor` checks the active engine's Python imports and,
for Kokoro, both required model files. It honors `RAKAM_PYTHON`, `RAKAM_DATA_HOME`, `KOKORO_HOME`, and
`CHATTERBOX_HOME`, matching the render environment.

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
pins include CPU-safe Nano support and security-fixed PyTorch. This v0.1 dependency set requires Python 3.14 because
upstream still pins PyTorch 2.6 on older interpreters:

```bash
export CHATTERBOX_HOME="$HOME/.local/share/rakamlah/chatterbox"
python3.14 -m venv "$CHATTERBOX_HOME/.venv"
"$CHATTERBOX_HOME/.venv/bin/python" -m pip install \
  torch==2.13.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cpu
"$CHATTERBOX_HOME/.venv/bin/python" -m pip install -r engine/media/chatterbox-requirements.txt
"$CHATTERBOX_HOME/.venv/bin/python" -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='ResembleAI/chatterbox-nano', allow_patterns=['*.safetensors', '*.json', '*.txt', '*.pt', '*.model'])"
```

Then configure a manifest-listed or consent-cleared reference:

```js
tts: {
  engine: 'chatterbox',
  reference: './media/voices/reference.mp3',
  speed: 1
}
```

The renderer defaults to the Nano variant. The explicit snapshot step fills the normal Hugging Face cache; `doctor`
checks it in local-only mode and never turns a readiness check into an implicit download. For Turbo, change the repo ID
to `ResembleAI/chatterbox-turbo` and set `CHATTERBOX_VARIANT=turbo`. The Base variant uses
`ResembleAI/chatterbox`; its five checkpoint files are checked individually. Use a non-default variant only when the
installed runtime and hardware support it. RakamLah disables MKL-DNN and forces the mathematical attention backend on
CPU because fused paths can produce non-finite audio on some processors.

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
