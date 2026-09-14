# Third-Party Notices

RakamLah includes the repository-local agent skills listed below. They remain under their upstream licenses; the root
MIT license does not replace those terms. Shared license texts are in [third_party/licenses/](third_party/licenses/).

The vendored source files were copied without intentional source modifications. TolongLabs added repository integration
metadata, lock records, and runtime symlinks outside the canonical vendored directories on 2026-09-14. Future edits to
Apache-2.0 files must carry a prominent modification notice in the edited file.

| Vendored path or group                                                                                                                                                                                                                                                                                                                       | Upstream repository                                                                     | License    | Upstream notice                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| .agents/skills/beachhead-segment, competitor-analysis, lean-canvas, market-sizing, strategy-red-team, value-proposition                                                                                                                                                                                                                      | [phuryn/pm-skills](https://github.com/phuryn/pm-skills)                                 | MIT        | Copyright © 2026 Pawel Huryn                                                 |
| .agents/skills/brainstorming, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills | [obra/superpowers](https://github.com/obra/superpowers)                                 | MIT        | Copyright © 2025 Jesse Vincent                                               |
| .agents/skills/design-taste-frontend, high-end-visual-design, image-to-code                                                                                                                                                                                                                                                                  | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)                         | MIT        | Copyright © 2026 Leonxlnx                                                    |
| .agents/skills/diagnosing-bugs, handoff                                                                                                                                                                                                                                                                                                      | [mattpocock/skills](https://github.com/mattpocock/skills)                               | MIT        | Copyright © 2026 Matt Pocock                                                 |
| .agents/skills/graphify                                                                                                                                                                                                                                                                                                                      | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)                     | Apache-2.0 | Copyright © 2026 Safi Shamsi and the Graphify contributors; see NOTICE below |
| .claude/skills/impeccable                                                                                                                                                                                                                                                                                                                    | [pbakaus/impeccable](https://github.com/pbakaus/impeccable)                             | Apache-2.0 | Copyright © 2025–2026 Paul Bakaus; see its NOTICE below                      |
| .agents/skills/jobs-to-be-done                                                                                                                                                                                                                                                                                                               | [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills)         | MIT        | Copyright © 2026 MC Dean                                                     |
| .agents/skills/startup-validator                                                                                                                                                                                                                                                                                                             | [ailabs-393/ai-labs-claude-skills](https://github.com/ailabs-393/ai-labs-claude-skills) | MIT        | Copyright © 2025 ailabs-393                                                  |

The .claude/skills symlinks that target .agents/skills are alternate discovery paths, not additional copies. Exact
package origins and content hashes are recorded in [skills-lock.json](skills-lock.json).

## Graphify NOTICE

> Graphify  
> Copyright 2026 Safi Shamsi and the Graphify contributors.
>
> This product is licensed under the Apache License, Version 2.0 (see LICENSE).
>
> Portions of this software were contributed under the MIT License prior to the relicensing and remain available under
> those terms. The original MIT license text is retained in LICENSE-MIT.

The exact notice and retained MIT license are reproduced in
[Graphify-NOTICE.txt](third_party/licenses/Graphify-NOTICE.txt) and
[Graphify-LICENSE-MIT.txt](third_party/licenses/Graphify-LICENSE-MIT.txt).

## Impeccable NOTICE and bundled work

The exact upstream Impeccable notice is reproduced in
[Impeccable-NOTICE.md](third_party/licenses/Impeccable-NOTICE.md). It covers the platform reference material derived
from [ehmo/platform-design-skills](https://github.com/ehmo/platform-design-skills), whose MIT license is preserved in
[platform-design-skills-MIT.txt](third_party/licenses/platform-design-skills-MIT.txt).

Impeccable also distributes `.claude/skills/impeccable/scripts/modern-screenshot.umd.js`, a browser bundle of
[qq15725/modern-screenshot](https://github.com/qq15725/modern-screenshot). Its MIT license and copyright notice are
preserved in [modern-screenshot-MIT.txt](third_party/licenses/modern-screenshot-MIT.txt).

## Source license references

These notices and license texts were verified against the upstream GitHub repositories on 2026-09-14:

- [pm-skills license](https://github.com/phuryn/pm-skills/blob/main/LICENSE)
- [superpowers license](https://github.com/obra/superpowers/blob/main/LICENSE)
- [taste-skill license](https://github.com/Leonxlnx/taste-skill/blob/main/LICENSE)
- [mattpocock/skills license](https://github.com/mattpocock/skills/blob/main/LICENSE)
- [Graphify license and NOTICE](https://github.com/Graphify-Labs/graphify/tree/v8)
- [Impeccable license](https://github.com/pbakaus/impeccable/blob/main/LICENSE)
- [Impeccable NOTICE](https://github.com/pbakaus/impeccable/blob/main/NOTICE.md)
- [platform-design-skills license](https://github.com/ehmo/platform-design-skills/blob/main/LICENSE)
- [modern-screenshot license](https://github.com/qq15725/modern-screenshot/blob/main/LICENSE)
- [designer-skills license](https://github.com/Owl-Listener/designer-skills/blob/main/LICENSE)
- [AI Labs skills license](https://github.com/ailabs-393/ai-labs-claude-skills/blob/main/LICENSE)
