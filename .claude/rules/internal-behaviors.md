# Known Claude Code Behaviors

Tested observations about Claude Code internals. Not in official docs — verified through experimentation.

## Skill `allowed-tools` Behavior

See `docs/reference/skill-allowed-tools.md` for full details (tested on v2.1.63).

- Bare names and `Bash(command *)` command-scoped patterns work. `Write(path)` path-scoped does not
- `$()` command substitution triggers a separate security prompt regardless of allowed-tools
- `~/.claude/` hardcoded write protection was not observed in v2.1.63
- Skills **do** inherit parent `settings.json` permissions: `permissions.allow` is additive, `permissions.deny` overrides skill `allowed-tools` (deny > allow). Tested in v2.1.63; [#18950](https://github.com/anthropics/claude-code/issues/18950) may be outdated

## Agent `tools` / `disallowedTools` Behavior

See `docs/reference/agent-tools.md` for full details (tested on v2.1.63).

Agent `tools` is an **availability filter**, NOT an auto-approve list (unlike Skill `allowed-tools`). The `tools` field does NOT create a fresh permission context — safe CWD commands remain AUTO, risky commands (out-of-CWD, `$()`, `git -C`, rm) remain PROMPT.

`permissionMode` controls approval behavior:

| `permissionMode` | Write/Edit | Bash (safe) | `$()` |
|---|---|---|---|
| (default) | PROMPT | AUTO | PROMPT |
| `plan` | PROMPT | AUTO | PROMPT |
| `acceptEdits` | **AUTO** | PROMPT | PROMPT |
| `dontAsk` | AUTO | AUTO | **DENY** |
| `bypassPermissions` | AUTO | AUTO | **AUTO** |

Other findings:
- `disallowedTools: Write, Edit` → inherits parent permissions, specified tools removed entirely
- No `tools`/`disallowedTools` → same as `disallowedTools` alone (inherits parent)
- `dontAsk` + `disallowedTools` → same as `disallowedTools` alone (all AUTO)
- `Write(path)` path-scoped → not recognized (parsed as bare `Write`)
- `git -C` flag (any path, including `.`) → always PROMPT

Recommended patterns:
- Fully autonomous: `permissionMode: bypassPermissions` + `tools: Read, Write, Edit, Bash`
- Autonomous read+shell: `permissionMode: dontAsk` + `tools: Read, Bash`
- Auto-accept edits: `permissionMode: acceptEdits` + `tools: Read, Write, Edit, Bash`
- Read-only explorer: `disallowedTools: Write, Edit` (no `tools` field)

## Plugin Data Path Convention

| Purpose | Path |
|---------|------|
| Persistent data (reports, config) | `~/.claude-code-zero/<plugin-name>/` |
| Temporary data (clone tmp) | `/tmp/<plugin-name>/` |

## Plugin Data Access Auto-Approve

Two ways to auto-approve out-of-CWD paths (e.g., `~/.claude-code-zero/`):

- **Bare `allowed-tools`** (`Read, Write, Edit`): Auto-approves all paths. Simplest approach
- **PreToolUse hook**: Selectively auto-approves specific paths only. Use when plugin data paths should be allowed while other out-of-CWD paths remain prompted

`notebooklm-connector` and `plugin-bookmarks` use the PreToolUse hook for scope detection + lazy init (project-level data isolation requires Bash hash computation and atomic initialization that skill instructions alone cannot guarantee). Auto-approve was removed from these hooks — bare `allowed-tools: Read, Write, Edit` in the skills already auto-approves all paths.

## Skill Supporting Files

See `docs/reference/skill-supporting-files.md` for full details.

- Skills reference companion files via markdown links: `[reference.md](reference.md)`
- `${CLAUDE_SKILL_DIR}` resolves to the skill's directory (not plugin root)
- Supporting files are **not auto-loaded** — Claude reads them on demand
- Keep SKILL.md under 500 lines; move large reference material to separate files
- `@filename.md` syntax force-loads and burns context — prefer markdown links

## Sub-agent Output Token Limit

`CLAUDE_CODE_MAX_OUTPUT_TOKENS` defaults to 32,000 tokens (max 64,000). No per-subagent setting in frontmatter. Large HTML report generation may hit this limit.

**Workaround**: Set before launching Claude Code:
```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000
```

| Pros | Cons |
|------|------|
| Immediate, no code changes | Main conversation auto-compaction triggers slightly earlier (negligible) |
| Subagents use independent context — no impact | Higher output token cost if usage increases |
| 64K covers most reports | Very large plugins (>64K) still limited |
