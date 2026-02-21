# Security Rules

Detection patterns and risk classification for Claude Code plugin security auditing.

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

Significant concern. Requires understanding before use.

| Pattern | Detection Method | Location |
|---------|-----------------|----------|
| `bypassPermissions` on agent | Grep agent.md frontmatter for `permissionMode: bypassPermissions` | `agents/*.md` |
| Destructive Bash commands | Grep for: `rm -rf`, `rm -f`, `drop table`, `drop database`, `truncate`, `format`, `mkfs` | All files |
| Hook scripts with network | Grep hook scripts for: `curl`, `wget`, `fetch`, `nc`, `ncat`, `ssh` | `hooks/`, scripts |
| Agent hook with broad tool access | Check `agent` type hooks for unrestricted tool scope | `hooks/`, frontmatter `hooks` |
| Dynamic context injection | Grep SKILL.md body for `` !`command` `` pattern with network/destructive commands | `skills/*/SKILL.md` |
| LSP server running untrusted binary | Check `.lsp.json` command field for non-standard binaries | `.lsp.json` |
| Unrestricted file write | Skill/agent with `Write` + `Bash` + no path restrictions | Frontmatter |
| `sudo` usage | Grep for `sudo` in scripts and allowed-tools | All files |

### MEDIUM RISK

Moderate concern. Common in legitimate plugins but worth noting.

| Pattern | Detection Method | Location |
|---------|-----------------|----------|
| Broad Bash patterns | Bash with broad globs: `Bash(git *)`, `Bash(npm *)` | Frontmatter |
| `Write` tool allowed | `Write` in allowed-tools or tools | Frontmatter |
| Env var reading in hooks | Grep hook scripts for `$ENV`, `${`, `process.env`, `os.environ` | Hook scripts |
| External MCP servers | MCP config pointing to non-local servers | `.mcp.json` |
| `acceptEdits` permission mode | Grep for `permissionMode: acceptEdits` | Frontmatter |
| Prompt hook with data exfiltration | Check `prompt` type hooks for instructions that reference user data | `hooks/`, frontmatter `hooks` |
| Inline hooks in frontmatter | Check SKILL.md / agent.md frontmatter for `hooks` field | `skills/*/SKILL.md`, `agents/*.md` |
| Agent memory persistence | Agent with `memory` field storing potentially sensitive data | `agents/*.md` |
| LSP server env var exposure | `.lsp.json` with `env` field exposing variables to LSP process | `.lsp.json` |
| Dynamic context injection | Grep SKILL.md body for `` !`command` `` pattern (benign commands) | `skills/*/SKILL.md` |

### LOW RISK

Minimal concern. Standard safe patterns.

| Pattern | Detection Method | Location |
|---------|-----------------|----------|
| Read-only tools only | Only Read, Glob, Grep in tools | Frontmatter |
| Restricted Bash | Bash with specific safe commands | Frontmatter |
| No hooks, agents, or MCP | No hooks/, agents/, .mcp.json | Directory scan |
| `plan` or `dontAsk` permission | Grep for `permissionMode: plan\|dontAsk` | Frontmatter |

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

Each finding should include:

```
### [{RISK_LEVEL}] Finding Title

- **Component**: [TYPE] component-name
- **Location**: file/path:line
- **Pattern**: What was detected
- **Impact**: What could happen
- **Recommendation**: How to mitigate
```

## Overall Risk Determination

The overall risk level is the HIGHEST individual finding:
- Any CRITICAL finding → Overall CRITICAL
- Any HIGH finding (no CRITICAL) → Overall HIGH RISK
- Any MEDIUM finding (no HIGH/CRITICAL) → Overall MEDIUM RISK
- Only LOW findings → Overall LOW RISK
