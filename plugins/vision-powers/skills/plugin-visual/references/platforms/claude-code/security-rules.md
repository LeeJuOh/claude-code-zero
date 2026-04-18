# Security Rules

Detection patterns and risk classification for agent plugin security auditing.

The goal is to surface **real security threats** while avoiding false alarms on common development patterns. Claude Code already enforces a permission system (tool approval prompts, sandboxed execution) that mitigates many theoretical risks. Severity should reflect the **residual risk after Claude Code's built-in protections**, not the theoretical worst case.

## Risk Levels

### CRITICAL

Immediate security concern. Plugin should not be used without review.

| Pattern | Detection Method | Location |
|---------|-----------------|----------|
| `bypassPermissions` on skill | Grep SKILL.md frontmatter for `permissionMode: bypassPermissions` | `skills/*/SKILL.md` |
| Unlimited Bash on skill | Grep SKILL.md frontmatter for `Bash(*)` in allowed-tools | `skills/*/SKILL.md` |
| Hardcoded secrets | Grep all files for patterns: `(api[_-]?key\|secret\|token\|password)\s*[:=]\s*['"][A-Za-z0-9]` | All files |
| Credential file access | Grep for paths: `~/.ssh`, `~/.aws`, `~/.gnupg`, `~/.netrc` | All files |

### HIGH RISK

Genuine security concern — the plugin can perform actions that bypass or circumvent safety boundaries, or has patterns that could lead to data loss or exfiltration even with Claude Code's protections in place.

Reserve HIGH for patterns where **the risk is not mitigated by Claude Code's normal permission prompts**.

| Pattern | Detection Method | Location | Context Notes |
|---------|-----------------|----------|---------------|
| `bypassPermissions` on agent | Grep agent.md frontmatter for `permissionMode: bypassPermissions` | `agents/*.md` | Note: silently ignored in plugin agents (see Context Modifiers) |
| `sudo` usage | Grep for `sudo` in scripts and allowed-tools | All files | Privilege escalation |
| Agent hook with broad tool access | Check `agent` type hooks for unrestricted tool scope | `hooks/`, frontmatter `hooks` | Autonomous multi-turn with no guardrails |
| Dynamic context injection (dangerous) | Grep SKILL.md body for `` !`command` `` pattern with network/destructive commands | `skills/*/SKILL.md` | Shell execution during rendering |
| LSP server running untrusted binary | Check `.lsp.json` command field for non-standard binaries | `.lsp.json` | Persistent background process |
| Prompt hook with data exfiltration | Check `prompt` type hooks for instructions that reference user data and external destinations | `hooks/`, frontmatter `hooks` | Data leaves local environment |
| Env var exfiltration via instructions | Scan SKILL.md body for natural language references to sensitive env var names (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `*_TOKEN`, `*_SECRET`) combined with transmission instructions | `skills/*/SKILL.md` body | Apply Context Modifiers — setup/config skills legitimately reference env vars → MEDIUM |
| Output-channel data embedding | Instructions directing Claude to embed sensitive data (env vars, file contents, credentials) in externally-visible outputs: git commits, PR bodies, API request payloads, generated docs | `skills/*/SKILL.md` body | Exfiltration without direct network access |

### MEDIUM RISK

Worth noting. Patterns that expand the plugin's attack surface but are **commonly seen in legitimate plugins** and are **partially mitigated by Claude Code's permission system**. The user should understand what the plugin does, but these are not red flags.

| Pattern | Detection Method | Location | Context Notes |
|---------|-----------------|----------|---------------|
| Destructive Bash commands | Grep for: `rm -rf`, `rm -f`, `drop table`, `truncate`, `mkfs` | All files | Apply Context Modifiers — cleanup patterns targeting `/tmp/` or plugin temp dirs → LOW |
| Hook scripts with network | Grep hook scripts for: `curl`, `wget`, `fetch`, `nc`, `ssh` | `hooks/`, scripts | Apply Context Modifiers — logging/notification to known services → LOW |
| External MCP servers | MCP config pointing to non-local servers | `.mcp.json` | Third-party code execution |
| Agent memory persistence | Agent with `memory` field storing potentially sensitive data | `agents/*.md` | Cross-session data leakage potential |
| Unrestricted file write combo | Skill/agent with `Write` + `Bash` + no path restrictions | Frontmatter | Broad write surface |
| Content obfuscation | Base64 strings (>40 chars), zero-width Unicode (U+200B–U+200F, U+FEFF), or invisible/non-printing characters in markdown files | All `.md` files | Possible concealed instructions or payload |
| Undeclared outbound URLs | URLs, domains, or IP addresses in SKILL.md body not matching the plugin's stated purpose or documented endpoints | `skills/*/SKILL.md` body | Apply Context Modifiers — API reference skills naturally contain endpoint URLs → LOW |
| Unreferenced executable files | `.sh`, `.py`, `.js` scripts or binary files not referenced by any hook config, SKILL.md `allowed-tools`, or SKILL.md body instructions | Root and subdirectories | Possible sleeping payload — bundled code with no visible invocation path |

### LOW RISK

Standard development patterns. Claude Code's permission system already provides adequate protection.

| Pattern | Detection Method | Location | Context Notes |
|---------|-----------------|----------|---------------|
| Broad Bash patterns | Bash with broad globs: `Bash(git *)`, `Bash(npm *)`, `Bash(docker *)` | Frontmatter | Common toolchain access, permission-prompted |
| `Write` or `Edit` tool allowed | `Write` or `Edit` in allowed-tools or tools | Frontmatter | File changes are visible in Claude Code's diff view and prompted |
| `acceptEdits` permission mode | Grep for `permissionMode: acceptEdits` | Frontmatter | Auto-accepts file edits — changes still visible, easily reversible |
| Env var reading in hooks | Grep hook scripts for `$ENV`, `${`, `process.env`, `os.environ` | Hook scripts | Hooks commonly need config values; flag only if accessing sensitive vars like `*TOKEN*`, `*SECRET*`, `*KEY*` |
| Inline hooks in frontmatter | Check SKILL.md / agent.md frontmatter for `hooks` field | `skills/*/SKILL.md`, `agents/*.md` | Supported feature, not inherently risky |
| Dynamic context injection (benign) | Grep SKILL.md body for `` !`command` `` pattern (benign commands like `date`, `git log`) | `skills/*/SKILL.md` | Read-only local commands |
| `plan` or `dontAsk` permission | Grep for `permissionMode: plan\|dontAsk` | Frontmatter | Minimal impact modes |
| LSP server env var exposure | `.lsp.json` with `env` field exposing variables to LSP process | `.lsp.json` | Required for LSP functionality |
| Read-only tools only | Only Read, Glob, Grep in tools | Frontmatter | No write capability |
| Restricted Bash | Bash with specific safe commands | Frontmatter | Scoped execution |
| No hooks, agents, or MCP | No hooks/, agents/, .mcp.json | Directory scan | Minimal surface area |

## Context Modifiers

Context modifiers adjust severity based on how a pattern is actually used. The auditor applies these during analysis — the same pattern can have different severity depending on its context.

### Cleanup Pattern (HIGH/MEDIUM → LOW)

**Applies to**: `rm -rf`, `rm -f`, other destructive commands
**Condition**: Target path is clearly a temp/cleanup path:
- `/tmp/*`, `$TMPDIR/*`, or similar temp directories
- Plugin-generated output directories (e.g., `/tmp/plugin-visual-*`)
- Build artifacts (e.g., `dist/`, `node_modules/`, `.cache/`)

**Why**: Cleanup scripts are standard development practice. The risk is a stray path, not the `rm` command itself. When the target is visibly scoped to temp files, the actual risk is LOW.

### Notification/Logging Pattern (HIGH/MEDIUM → LOW)

**Applies to**: `curl`, `wget`, `fetch` in hook scripts
**Condition**: Network calls are clearly for outbound notifications or health checks:
- POST to localhost or internal URLs
- Known webhook services (Slack webhooks, Discord webhooks, etc.)
- Simple GET for health checks
- No `--upload-file`, no user data in the request body

**Why**: Many hooks legitimately send notifications. The risk is data exfiltration, not network access itself. When the call pattern is clearly outbound-notification, the actual risk is LOW.

### Plugin Agent Permission Override (HIGH → LOW, informational)

**Applies to**: `bypassPermissions` on agent files in `agents/*.md` within a plugin
**Condition**: The agent is defined inside a plugin's `agents/` directory (not in `.claude/agents/` or `~/.claude/agents/`)
**Why**: Claude Code silently ignores `permissionMode` in plugin-defined agents. The field has no effect, so it's not a real risk — just a misconfiguration worth noting. Report as LOW with an informational note about the silent ignore behavior.

### Sensitive Env Var Access (LOW → MEDIUM)

**Applies to**: Env var reading in hooks
**Condition**: The hook reads variables with names containing `TOKEN`, `SECRET`, `KEY`, `PASSWORD`, `CREDENTIAL`, or `AUTH`
**Why**: Most env var access is benign configuration. But reading explicitly sensitive variables in a hook (which runs automatically) warrants more attention.

### Worktree Hooks (inform only)

**Applies to**: `WorktreeCreate` and `WorktreeRemove` hooks
**Condition**: Hooks that replace default git worktree behavior
**Why**: These hooks override Claude Code's built-in worktree management. Not inherently risky, but worth noting since they change default isolation behavior. Report as LOW with an informational note.

### Setup/Configuration Pattern (HIGH → MEDIUM)

**Applies to**: Env var references in SKILL.md body
**Condition**: Skill's stated purpose involves configuration, setup, secret management, or environment bootstrapping:
- Skill name or description contains "setup", "config", "secret", "env", "bootstrap"
- The instruction guides users to *set* env vars, not to read and transmit them

**Why**: Configuration skills legitimately reference env var names as documentation. The risk is when instructions direct reading and transmitting env values, not merely naming them.

### API Reference Pattern (MEDIUM → LOW)

**Applies to**: Undeclared outbound URLs in SKILL.md body
**Condition**: Skill's stated purpose involves API documentation, integration, or external service interaction:
- URLs point to documented API endpoints or official documentation sites
- URLs are in code examples, not in behavioral instructions

**Why**: API reference skills naturally contain endpoint URLs. The risk is URLs embedded in behavioral instructions (e.g., "POST data to this URL"), not in reference documentation.

### Encoding Utility Pattern (MEDIUM → LOW)

**Applies to**: Base64 strings in SKILL.md
**Condition**: The skill's purpose involves encoding, serialization, or data transformation:
- Base64 strings appear in code examples or test fixtures
- The skill description references encoding/decoding operations

**Why**: Encoding skills legitimately contain encoded example strings. The risk is base64-encoded instructions or payloads concealed as data, not visible test fixtures.

### Elicitation Hooks (MEDIUM consideration)

**Applies to**: `Elicitation` and `ElicitationResult` hooks
**Condition**: Hooks that intercept MCP server user input requests or responses
**Why**: These can intercept user responses to MCP servers — a potential vector for modifying user intent before it reaches the MCP server. If the hook modifies the response body, flag as MEDIUM.

## Permission Matrix Template

```
Component          | permissionMode     | Tools                    | Hook Type          | Risk
-------------------|--------------------|--------------------------|--------------------|---------
[SKILL] name       | {mode or default}  | {allowed-tools list}     | N/A                | {level}
[AGENT] name       | {mode or default}  | {tools list}             | N/A                | {level}
[HOOK] event        | N/A                | {script commands}        | {command/prompt/agent} | {level}
[MCP] server        | N/A                | {provided tools}         | N/A                | {level}
[LSP] server        | N/A                | {command}                | N/A                | {level}
```

## Findings Format

Each finding should be compact (3-4 lines max):

```
[{SEVERITY}] #{n}: {Title}
> {Component} | {file:line}
{1-2 sentence: what was found + why it matters}
**Fix**: {1 sentence recommendation}
```

When a Context Modifier was applied, append a brief note:

```
[LOW] #3: Destructive command in cleanup script
> [HOOK] PostToolUse | hooks/cleanup.sh:12
Uses `rm -rf /tmp/plugin-visual-*` to clean up temporary clone directories.
**Note**: Severity reduced from MEDIUM — cleanup pattern targeting temp directory.
```

## Overall Risk Determination

The overall risk level is the HIGHEST individual finding **after applying Context Modifiers**:
- Any CRITICAL finding → Overall CRITICAL
- Any HIGH finding (no CRITICAL) → Overall HIGH RISK
- Any MEDIUM finding (no HIGH/CRITICAL) → Overall MEDIUM RISK
- Only LOW findings → Overall LOW RISK

This means a plugin with `rm -rf /tmp/foo` (downgraded to LOW via cleanup pattern) and `Write` tool (LOW) would be Overall LOW RISK — not HIGH or MEDIUM as it would have been without context-aware analysis.
