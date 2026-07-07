# Context Map

Each plugin in this marketplace is its own bounded context with its own vocabulary. Contexts get a
`CONTEXT.md` lazily — only once their language has actually been debated and pinned down.

## Contexts

- [rubber-duck-tutor](./plugins/rubber-duck-tutor/CONTEXT.md) — verifies (Duck) and builds (Coach) the user's understanding during AI-assisted coding

## Relationships

- **rubber-duck-tutor → external `teach` skill (user-installed, mattpock)**: course-sized topics are
  out of Coach's scope — Coach narrows the scope or defers to a long-term learning tool. Not a code
  dependency; a deliberate scope boundary (ADR 0008).
- **rubber-duck-tutor → `/code-review`**: code quality judgments are out of scope for both personas —
  Duck asks "do you know this," never "is this good."
