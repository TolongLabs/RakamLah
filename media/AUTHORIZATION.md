# Bundled Media Authorization Record

This record covers only the exact files and SHA-256 checksums listed in `media/manifest.json`.

## Maintainer attestation

On 2026-09-14, a TolongLabs maintainer responsible for the supplied media collections confirmed that TolongLabs may:

- include and publicly redistribute the listed files, including for commercial use;
- allow others to use and redistribute them without royalty or attribution;
- use the listed music in rendered recordings; and
- use the listed voice samples as references for local voice synthesis.

The confirmation was made explicitly during the repository bootstrap and public-release approval. The repository
records that authorization as its rights basis; it does not infer or assert an individual creator or rightsholder where
one was not supplied. Embedded metadata is preserved verbatim for auditability and does not alter the no-attribution
grant recorded in the [bundled media terms](LICENSE.md).

## Provenance and technical record

| Collection                         | Manifest paths                                        | Recorded scope                                      |
| ---------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| TolongLabs lo-fi BGM collection    | `media/bgm/lofi-bgm.mp3`, cue sheet                   | Use, commercial use, redistribution, no attribution |
| TolongLabs voice-reference archive | `media/voices/columbina-voice-sample.mp3`, `varesa-*` | Same scope, plus voice-reference synthesis          |

The BGM file contains an MP3 audio stream, a PNG attached-picture stream, and embedded artist metadata identifying
“LoFi Tokyo.” Those facts are declared in the manifest rather than stripped or silently omitted. They are metadata,
not an additional ownership claim by TolongLabs.

## Adding media

Future additions require a new manifest entry with checksum, source collection, rightsholder status, applicable terms,
and an authorization record. Voice samples additionally require explicit voice-synthesis permission. A maintainer must
review that evidence before merging the file.
