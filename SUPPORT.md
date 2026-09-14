# Support

Use the [GitHub issue tracker](https://github.com/TolongLabs/RakamLah/issues) for reproducible bugs and focused feature
requests. Search existing issues first and use the provided form so environment and command details are included.

Before reporting a problem:

```bash
node bin/rakam.mjs doctor --config ./rakam.config.mjs --json
node bin/rakam.mjs validate --config ./rakam.config.mjs --json
corepack pnpm test
```

Redact URLs, cookies, tokens, personal data, private frames, and voice samples from logs or attachments. Questions about
configuration and adapter design should include a minimal synthetic example rather than proprietary application code.

Security vulnerabilities and private safety reports do not belong in public issues. Follow [`SECURITY.md`](SECURITY.md).
