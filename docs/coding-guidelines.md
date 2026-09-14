# Coding Guidelines

`AGENTS.md` is authoritative. These standing guidelines keep implementation work deliberate and reviewable.

## Think Before Coding

- State assumptions that change behavior.
- Prefer the smallest interface that satisfies an observable requirement.
- Keep a project adapter responsible for project knowledge; do not leak selectors or deployment assumptions into core.

## Work Test-First

Name the production break each test catches. Watch a new behavioral test fail for the expected reason, implement the
minimum behavior, then keep the full suite green while refactoring. Human prose and static policy files do not need
token tests; executable contracts do.

## Make Surgical Changes

- Touch only files required by the task.
- Preserve stable command output and exit codes unless the change explicitly versions the interface.
- Clean up artifacts created by the current change, not unrelated historical material.
- Treat a surprising adjacent defect as a finding unless it blocks the requested behavior.

## Verify Outcomes

File existence is not completion. Run the command, parse its output, inspect media metadata, validate checksums, and
exercise a fresh clone when packaging or Git LFS behavior changes.
