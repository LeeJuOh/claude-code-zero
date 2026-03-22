---
name: codex-arch
description: Run Codex architecture review with Claude's critical evaluation. Use when the user asks for "codex arch", "codex 아키텍처", "codex architecture review", or wants Codex to evaluate project structure, dependencies, or design patterns.
argument-hint: [target path or scope description]
---

# Codex Architecture Review

Run an architecture-focused analysis using Codex and add Claude's critical evaluation.

## 1. Build Analysis Prompt

If $ARGUMENTS specifies a target path or scope, incorporate it.

**Prompt template:**

```
Review the architecture of this codebase{TARGET}.

Focus areas:
- Directory structure and separation of concerns
- Module boundaries and coupling between components
- Circular dependencies
- God files or classes (doing too many things)
- Configuration centralization vs scattered config
- Error handling consistency across modules
- API contract design and type safety
- Dependency graph health (check import patterns)

For each finding report:
1. File path or directory
2. Severity (critical / high / medium / low)
3. Description of the architectural issue
4. Evidence (relevant code or structure)
5. Suggested improvement

Do NOT flag:
- Architectural decisions that are clearly intentional and documented
- Small utility files that don't need further abstraction
- Framework-imposed structure (e.g., Next.js app/ directory conventions)
- Issues that would require a full rewrite without clear benefit

Self-verification: Before concluding, confirm you reviewed the top-level directory structure, key configuration files, and the main dependency/import graph.
```

## 2-4. Execute, Evaluate, Save

Read `${CLAUDE_PLUGIN_ROOT}/references/common.md` for the execution, critical evaluation, and file saving workflow. Save as `codex-reviews/arch-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- Architecture is subjective. Present findings as suggestions, not mandates.
- Codex may not understand the project's history or intentional trade-offs. Context from CLAUDE.md, README, or ADRs should inform your evaluation.
- Small projects don't need enterprise-level architecture. Scale your expectations to the project size.
