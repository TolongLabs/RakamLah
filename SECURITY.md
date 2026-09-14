# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `0.1.x` | Yes       |
| `<0.1`  | No        |

## Report a vulnerability

Please use [GitHub's private vulnerability reporting](https://github.com/TolongLabs/RakamLah/security/advisories/new).
Do not open a public issue for an unpatched vulnerability or include credentials, private recordings, voice samples,
or personal data in a report.

Include the affected command or module, a minimal reproduction, impact, environment, and any safe mitigation you have
identified. Maintainers will acknowledge a report as soon as practical, coordinate remediation privately, and credit
reporters who want attribution.

## Security boundaries

RakamLah drives a browser and invokes local media tools. Treat scenario modules as trusted code: they execute with the
permissions of the caller. Keep authentication in the consuming environment, use dedicated test accounts, avoid
recording sensitive data, and inspect artifacts before sharing them.

Media and model files are local inputs. Verify bundled assets with `node scripts/check-media.mjs`; obtain third-party
models from a source you trust. RakamLah does not upload recordings or telemetry in v0.1.
