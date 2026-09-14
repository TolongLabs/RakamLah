# Vendored Skills

`.agents/skills/` is the canonical repository-local copy of product-neutral engineering and product-development skills
used by TolongLabs. Reinstallable package origins and content hashes are recorded in `skills-lock.json` where available.
Copyright notices, path mappings, upstream links, and full license texts are preserved in
[`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md).

Claude discovers matching entries through relative symlinks in `.claude/skills/`. `impeccable` remains a real Claude
skill directory because its own hook and scripts expect that layout.

When updating a skill:

1. Review its upstream license and update `THIRD_PARTY_NOTICES.md` when the origin, copyright, or terms change.
2. Update the canonical `.agents/skills/<name>/` directory.
3. Verify every `.claude/skills/<name>` link resolves.
4. Run the skill's validation or behavioral checks.
5. Update `skills-lock.json` when the upstream package metadata changes.

Do not add project-specific pitch, market, deployment, or private-workflow skills to this portable repository.
