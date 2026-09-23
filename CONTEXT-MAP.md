# Context Map

Each plugin in this marketplace is its own bounded context with its own vocabulary. A context's
glossary lives at `docs/context/<plugin-name>.md`, written lazily — only once its language has
actually been debated and pinned down.

## Contexts

- [codex-advisor](./docs/context/codex-advisor.md) — wraps Codex as a double-check peer, not an oracle, and survives its long jobs and fragile input parsing
- [rubber-duck-tutor](./docs/context/rubber-duck-tutor.md) — verifies (Duck) and builds (Coach) the user's understanding during AI-assisted coding
- [skill-creator-pro](./docs/context/skill-creator-pro.md) — re-baselines skill-creator-pro on the official Anthropic skill-creator, eval harness included
- [vision-powers](./docs/context/vision-powers.md) — gives Claude visual expression through diagrams and structured HTML and markdown output

## Relationships

- **rubber-duck-tutor → external `teach` skill (user-installed, mattpock)**: course-sized topics are
  out of Coach's scope — Coach narrows the scope or defers to a long-term learning tool. Not a code
  dependency; a deliberate scope boundary (ADR 0008).
- **rubber-duck-tutor → `/code-review`**: code quality judgments are out of scope for both personas —
  Duck asks "do you know this," never "is this good."
