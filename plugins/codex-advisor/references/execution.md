# Codex Execution Patterns

Shared execution patterns for all codex-advisor skills.

## Setup (First Run)

On first invocation, check if `${CLAUDE_PLUGIN_DATA}/config.json` exists.

**If missing (first run):**

1. Read `~/.codex/config.toml` to extract default model and reasoning effort
2. Present defaults to user via AskUserQuestion:
   ```
   Codex 설정을 확인합니다:
     모델: <detected or "default">
     추론: <detected or "high">
   이대로 사용할까요? (변경하려면 알려주세요)
   ```
3. Save confirmed values to `${CLAUDE_PLUGIN_DATA}/config.json`:
   ```json
   { "model": "gpt-5.4", "reasoning": "high" }
   ```

**If exists (subsequent runs):** Read saved config, proceed directly.

**Override:** User can pass `-m <model>` or `--reasoning <level>` as arguments to override for a single run. `--reset-config` deletes config.json and re-runs setup.

## Preflight

```bash
which codex >/dev/null 2>&1 || echo "NOT_FOUND"
```

If NOT_FOUND: "Codex CLI required. Install: `npm install -g @openai/codex`"

## Command Flags

### For `codex review` (built-in review subcommand)

```bash
codex review [SCOPE_FLAGS] -c 'model="<MODEL>"' -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

Omit `-c 'model="..."'` if model is `"default"`.

**`codex review` restricted flags — these are NOT accepted:**
- `-m` / `--model` — use `-c 'model="..."'` instead
- `-s` / `--sandbox` — has its own sandbox defaults
- `--json` — not supported

### For `codex exec` (custom prompt execution)

```bash
codex exec "$(cat tmp/codex-advisor-prompt.txt)" -m <MODEL> -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

### Flag comparison

| Flag | `codex review` | `codex exec` |
|------|:-:|:-:|
| `-m <MODEL>` | **NO** — use `-c 'model="..."'` | YES |
| `-s read-only` | **NO** — own sandbox | YES |
| `-c 'key="val"'` | YES | YES |
| `--enable <feature>` | YES | YES |
| `2>tmp/codex-stderr.txt` | YES | YES |

## Prompt Passing

Write prompts to a temp file to avoid shell quoting issues:

```bash
# 1. Write prompt using the Write tool -> tmp/codex-advisor-prompt.txt
# 2. Execute with codex exec
# 3. Clean up after evaluation:
rm -f tmp/codex-advisor-prompt.txt tmp/codex-stderr.txt
```

Timeout: 300000ms (5 minutes) for all codex commands.

## Background Execution

When running codex commands in background (Bash with `run_in_background`), stdout may appear empty in the task output notification. This is normal — codex writes its results to stdout which the background task manager may not fully capture.

**Recovery pattern:**
1. If task output is empty, check stderr file first: `cat tmp/codex-stderr.txt 2>/dev/null`
2. If stderr shows the actual review output (codex sometimes writes results to stderr), use that
3. If both are empty, re-run the command in foreground

**Recommendation:** Prefer foreground execution (without `run_in_background`) for codex commands. The 5-minute timeout is sufficient for most reviews. Only use background execution if you need to do other work in parallel.

## Error Handling

After execution, if exit code is non-zero, check stderr:

```bash
cat tmp/codex-stderr.txt 2>/dev/null
```

| Pattern in stderr | Diagnosis | Action |
|-------------------|-----------|--------|
| "model not supported" / "model is not supported" | Auth type mismatch | Retry without `-m`, explain auth method difference |
| "not authenticated" / "auth" | No valid auth | Suggest `codex login` |
| "command not found" | Codex not installed | Suggest install |
| Exit 124 or 137 | Timeout | Report timeout, offer retry |
| Empty stdout + no stderr error | No findings or silent failure | Report: "Codex returned no output" |

**Fail-open principle:** On any error, report to user and continue. Never block or loop on errors.

**Timeout is NOT failure.** Exit codes 124/137 mean the CLI was killed by timer, not that Codex found nothing.

## Peer AI Evaluation

After reading Codex's output, provide Claude's independent assessment. Treat Codex as a peer, not an authority.

### For each finding:
- **Agree**: Confirm with additional context if useful
- **Disagree**: Explain why with evidence — read the actual code first
- **Nuance**: Add context Codex may have missed

### Rules:
- Do NOT blindly agree. Codex can hallucinate file paths and line numbers.
- Always read the actual code to verify claims about specific files.
- If you genuinely disagree, present both perspectives and let the user decide.
- Preserve Codex output verbatim. Claude's synthesis comes AFTER, not instead of.
- Frame disagreements as peer discussion: "A different perspective..." not "Codex is wrong."

## Cross-Model Comparison

If Claude already analyzed the same scope earlier in the conversation, add a comparison:

```markdown
## Cross-Model Comparison
| Finding | Claude | Codex | Agreement |
|---------|--------|-------|-----------|
| [issue] | Found  | Found | Both      |
| [issue] | Missed | Found | Codex only |
| [issue] | Found  | Missed | Claude only |

Agreement rate: X% (N/M unique findings overlap)
```

## Session Resume

After any `codex exec` invocation, inform the user:
> "Resume this Codex session: `/codex-review resume [follow-up]` or `/codex-verify resume [follow-up]`"

Resume syntax:
```bash
codex exec resume --last "[follow-up prompt]" -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>tmp/codex-stderr.txt
```

`--last` resumes the most recent session. Config flags (model, reasoning) are inherited from the original session — do not re-apply them on resume.

## Save Results

Write combined output to `codex-reviews/<type>-<YYYYMMDD-HHMMSS>.md`:

```markdown
# Codex <Type> -- <date>

## Scope
<what was analyzed, target paths, model, reasoning>

## Codex Findings
<Codex's output, preserved verbatim>

## Claude's Evaluation

### Agreed
- [finding]: [additional context]

### Disputed
- [finding]: [why, with evidence]

### Additional Findings
- [things Codex missed]

## Summary
- Total Codex findings: N
- Agreed: N | Disputed: N | Additional by Claude: N
```

Create `codex-reviews/` directory if it doesn't exist.
