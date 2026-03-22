---
name: codex-security
description: Run Codex security audit with Claude's critical evaluation. Use when the user asks for "codex security", "codex 보안", "codex vulnerability scan", security audit via Codex, or OWASP analysis using Codex.
argument-hint: [target path or scope description]
---

# Codex Security Audit

Run a focused security analysis using Codex and add Claude's critical evaluation.

## 1. Build Analysis Prompt

If $ARGUMENTS specifies a target path or scope, incorporate it. Otherwise analyze the full project.

**Prompt template:**

```
Perform a security audit of this codebase{TARGET}.

Focus areas:
- Injection vulnerabilities (SQL, XSS, command injection, path traversal)
- Authentication and authorization gaps
- Hardcoded secrets or weak cryptography
- Input validation at system boundaries
- OWASP Top 10 coverage
- Dependency vulnerabilities (check package/lock files)

For each finding report:
1. File path and line number
2. Severity (critical / high / medium / low)
3. Description of the vulnerability
4. Evidence (the problematic code snippet)
5. Recommended fix

Do NOT flag:
- Hardcoded values in test files or fixtures
- Framework-provided protections already active (e.g., Django auto-escaping, React JSX escaping, Rails CSRF tokens)
- Issues in vendored, generated, or third-party code
- Hypothetical issues without concrete evidence in the code

Self-verification: Before concluding, list every file you analyzed and every file you skipped (with reason).
```

Replace `{TARGET}` with ` focusing on <path>` if a target was specified, or empty string for full project.

## 2-4. Execute, Evaluate, Save

Read `${CLAUDE_PLUGIN_ROOT}/references/common.md` for the execution, critical evaluation, and file saving workflow. Save as `codex-reviews/security-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- Security findings are high-stakes. Always verify file paths and line numbers by reading the actual code before agreeing.
- Codex may miss vulnerabilities that require understanding runtime behavior or deployment configuration.
- If Codex flags a dependency vulnerability, verify it against the actual installed version, not just the package name.
