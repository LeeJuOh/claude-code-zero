---
name: codex-perf
description: Run Codex performance analysis with Claude's critical evaluation. Use when the user asks for "codex perf", "codex 성능", "codex performance", or wants Codex to find performance bottlenecks or optimization opportunities.
argument-hint: [target path or scope description]
---

# Codex Performance Analysis

Run a performance-focused analysis using Codex and add Claude's critical evaluation.

## 1. Build Analysis Prompt

If $ARGUMENTS specifies a target path or scope, incorporate it.

**Prompt template:**

```
Analyze this codebase{TARGET} for performance issues and optimization opportunities.

Focus areas:
- N+1 queries and inefficient database access patterns
- Unnecessary iterations, redundant computations
- Memory leaks or excessive allocation
- Missing caching opportunities
- Bundle size and lazy loading opportunities (for frontend)
- Missing database indexes (check schema/migration files)
- Blocking I/O in async contexts
- Large payload serialization without pagination

For each finding report:
1. File path and line number
2. Impact (critical / high / medium / low)
3. Description of the performance issue
4. Evidence (the problematic code snippet)
5. Suggested optimization with expected improvement

Do NOT flag:
- Premature optimization targets (code that runs rarely or handles tiny data sets)
- Performance patterns that trade readability for negligible speed gains
- Issues in test files, development-only code, or build scripts
- Theoretical issues without evidence of actual impact

Self-verification: Before concluding, list every file you analyzed and confirm you checked database queries, loops, and I/O operations.
```

## 2-4. Execute, Evaluate, Save

Read `${CLAUDE_PLUGIN_ROOT}/references/common.md` for the execution, critical evaluation, and file saving workflow. Save as `codex-reviews/perf-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- Performance issues are context-dependent. A "slow" query on 100 rows is different from one on 10M rows. Consider scale.
- Codex cannot measure actual runtime performance. Its findings are static analysis only.
- If Codex suggests an optimization, consider whether it sacrifices readability or maintainability.
