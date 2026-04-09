# codex-advisor

> Every Codex result gets a second opinion — Claude independently evaluates each finding before you act on it.

## Why

Codex is powerful, but calling it from inside Claude Code has sharp edges
that bite you at exactly the wrong moment.

**Example — what used to happen in v4.0.1:**

```
/codex-advisor:codex-review --base develop, 절대 너가 먼저 코드 분석하지말고 그냥 리뷰 프롬프트만 보내고 코덱스 결과 더블체크해
```

That single line triggered four failures in a row:

1. The trailing `,` was forwarded to `git rev-parse develop,` — unknown revision.
2. The Korean meta-instruction `절대 너가...` was shoved into Codex's argument parser as a focus text, which the built-in reviewer rejects.
3. The review ran in the foreground and hit Bash's 5-minute per-call timeout, so the wrapper got SIGKILLed mid-flight.
4. Claude improvised a manual polling loop with a wrong job ID, burned 28 minutes, and never ran the double-check.

The frustrating part is that everything the user wrote was reasonable —
they said "review against develop, don't pre-analyze, just send the
prompt and double-check". All four failures were wrapper bugs.

**What v4.1 does instead:**

- Parses the input with LM intelligence first: drops the trailing comma, obeys the meta-instruction ("don't pre-analyze"), and runs a clean `review --base develop`.
- Launches long-running reviews in the background so Bash's 5-minute timeout never kills them.
- Uses the official `status --wait` wait mechanism instead of improvised polling.
- Classifies Codex's findings as Agreed, Disputed, Nuanced, False Positive (hallucinated file/function), or Uncited — without reading your code until Codex returns.

## Quick Start

```shell
# 1. Install the Official Codex plugin (required)
/plugin install codex@openai-codex
/codex:setup

# 2. Install codex-advisor
/plugin install codex-advisor@claude-code-zero

# 3. Configure defaults (optional)
/codex-setup --model gpt-5.4-mini --effort high

# 4. Use
/codex-review                          # review + double-check
/codex-adversarial check auth flow     # skeptical review with focus text
/codex-rescue implement rate limiter   # delegate a task + review the diff
/codex-verify docs/plan.md             # plan review + PASS/FAIL verdict
/codex-research GraphQL vs tRPC 2026   # deep-dive + cross-model synthesis
```

## Commands

| Command | Description |
|---------|-------------|
| `/codex-setup` | Preflight check + model/effort config via config.toml |
| `/codex-review` | Code review + double-check, flags `--base` / `--scope` |
| `/codex-adversarial` | Adversarial review + focus text + skeptical evaluation |
| `/codex-rescue` | Task delegation + implementation review |
| `/codex-verify` | Document/plan verification, PASS/FAIL verdict |
| `/codex-research` | Deep-dive research, cross-model synthesis |

## How a call is translated

You can type anything — English, Korean, flags, meta-instructions, emoji, typos.
Every skill does the same four things in order:

1. **Analyze** — parse your input into clean companion flags. Drop junk, obey meta-instructions addressed to Claude, reject unknown flags with a clarifying question instead of silently forwarding them.
2. **Invoke** — run the Official Codex plugin's companion in the background, so long jobs don't die on Bash's 5-minute timeout.
3. **Double-check** — once Codex returns, read only the files and lines it cited. Classify each finding (Agreed / Disputed / Nuanced / False Positive / Uncited).
4. **Report** — present findings with the classification, save to `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<timestamp>.md`. Failed runs are saved to `<type>-<timestamp>-failed.md` with the categorized error.

The key discipline: **Claude never reads your source code before Codex runs.** That's what keeps the double-check independent. For document skills (verify / research), the document itself is streamed into Codex via a file pipe so it never enters Claude's context either.

## Prerequisites

- [Official Codex plugin](https://github.com/openai/codex-plugin-cc) (`codex@openai-codex`) — **required**
- [OpenAI Codex CLI](https://github.com/openai/codex) — installed and authenticated

## License

MIT
