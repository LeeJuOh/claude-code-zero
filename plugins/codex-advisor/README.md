# codex-advisor

> **Get Codex's second opinion on your code, plans, and research — and actually trust it.** Claude independently fact-checks every Codex finding before you act, so hallucinated citations never slip through.

## Why

Codex is powerful, but calling it from inside Claude Code has sharp edges
that bite you at exactly the wrong moment.

**Example — what used to happen in v4.0.1:**

```
/codex-advisor:codex-review --base develop, don't pre-analyze the code yourself — just send the review prompt and double-check Codex's result
```

That single line triggered four failures in a row:

1. The trailing `,` was forwarded to `git rev-parse develop,` — unknown revision.
2. The free-text meta-instruction (`don't pre-analyze...`) was shoved into Codex's argument parser as focus text, which the built-in reviewer rejects.
3. The review ran in the foreground and hit Bash's 5-minute per-call timeout, so the wrapper got SIGKILLed mid-flight.
4. Claude improvised a manual polling loop with a wrong job ID, burned 28 minutes, and never ran the double-check.

The frustrating part is that everything the user wrote was reasonable —
they said "review against develop, don't pre-analyze, just send the
prompt and double-check". All four failures were wrapper bugs.

**What v4.3 does instead:**

- Parses the input with LM intelligence first: drops the trailing comma, attempts to obey the meta-instruction ("don't pre-analyze"), and runs a clean `review --base develop`.
- Launches long-running reviews in the background so Bash's 5-minute timeout never kills them.
- Uses the official `status --wait` wait mechanism instead of improvised polling.
- Classifies Codex's findings as Agreed, Disputed, Nuanced, False Positive (hallucinated file/function), or Uncited — without reading your code until Codex returns.

## What you get

- **A second opinion you can trust** — Codex reviews your code, verifies your plans, or researches for you; Claude then independently fact-checks what Codex returns. You get the cross-model check *and* a guardrail against Codex's confident hallucinations.
- **Five-way finding classification** on every review — Agreed, Disputed, Nuanced, False Positive, Uncited. Catches hallucinated file:line citations before you act on them.
- **Blind-payload independence** — for `codex-review` / `codex-adversarial`, Claude doesn't read the cited files until after Codex returns. For `codex-verify` / `codex-research`, the document is piped to Codex directly and never enters Claude's context.
- **Background-resilient** — long jobs survive Bash's 5-minute timeout via background launch + `status --wait`. `/codex-result <job-id>` fetches the stored output even after the session that started it is gone.
- **Self-bias guardrail** on `codex-verify` — if Claude authored the document under review, extra honesty constraints are applied.
- **Every call persists** to `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<timestamp>.md`. Failures save to `<type>-<timestamp>-failed.md` with a categorized error.
- **10 skills**, works with the Official Codex plugin hidden — `/codex-result`, `/codex-status`, `/codex-cancel`, `/codex-transfer` call the companion script directly.

## Install

```shell
/plugin install codex-advisor@claude-code-zero
```

## Quick Start

```shell
# 1. Install the Official Codex plugin — required (provides companion.mjs)
/plugin install codex@openai-codex
/codex:setup                          # one-time auth + Codex CLI check

# 2. Install codex-advisor
/plugin install codex-advisor@claude-code-zero

# 3. (optional) Hide the Official plugin's /codex:* slash menu so only our
#    /codex-* commands are visible. The companion script stays on disk and
#    we keep calling it directly.
/plugin disable codex@openai-codex

# 4. Configure defaults (optional — every skill can also override on the fly)
/codex-setup --model gpt-5.5 --effort high

# 5. Use
/codex-review                          # review + double-check
/codex-adversarial check auth flow     # skeptical review with focus text
/codex-rescue implement rate limiter   # delegate a task + review the diff
/codex-verify docs/plan.md             # plan review + PASS/FAIL verdict
/codex-research GraphQL vs tRPC 2026   # deep-dive + cross-model synthesis
/codex-status                          # who's running, what's stored
/codex-result <job-id>                 # fetch final output of a job
/codex-cancel <job-id>                 # stop a runaway task
/codex-transfer                        # hand this whole session off to Codex
```

## Commands

| Command | Description |
|---------|-------------|
| `/codex-setup` | Preflight (CLI, auth, Official plugin) + `config.toml` editor |
| `/codex-review` | Code review + double-check |
| `/codex-adversarial` | Adversarial (skeptical) review + focus text |
| `/codex-rescue` | Task delegation (structured, preview-approved prompt) + diff review |
| `/codex-verify` | Document/plan verification, PASS/FAIL verdict |
| `/codex-research` | Deep-dive research, cross-model synthesis |
| `/codex-status` | Active + recent Codex jobs plus saved reports |
| `/codex-result` | Final stored output of a completed job |
| `/codex-cancel` | Cancel an active background job |
| `/codex-transfer` | Move the current session into a resumable Codex thread |

## Transfer vs rescue

Easy to conflate — they're opposites. **Rescue** is a subcontractor: Codex does one task, Claude reads the diff, Claude keeps the wheel. **Transfer** is emigration: the whole conversation moves to Codex (`codex resume <id>`) and Claude's part in it ends — there's no diff to review because nothing comes back.

## Model & effort

**Every skill accepts `--model <slug>` and `--effort <level>`.** They route through `scripts/apply-codex-config.py` and update `~/.codex/config.toml` before the Codex CLI runs. Two reasons:

1. **`--effort` is not a registered review/adversarial flag.** The companion's `handleReviewCommand` accepts `--base`, `--scope`, `--model`, `--cwd` only (`codex-companion.mjs:714`). Passing `--effort` directly would become silent prompt corruption. Only the `model_reasoning_effort` key in `config.toml` reaches the review code path.
2. **Consistency + persistence.** `--model` IS honored as a flag in companion 1.0.4+ (`lib/codex.mjs:1010-1015`), but routing it through `config.toml` keeps every codex-advisor skill identical and lets the value carry into the next session without re-typing.

Examples:

```shell
/codex-review --base main --model gpt-5.5
/codex-adversarial --effort xhigh focus on SQL injection
/codex-rescue --model spark implement the rate limiter
/codex-setup --model gpt-5.5 --effort high    # or set defaults once
```

Common slugs (your actual availability depends on subscription tier):
`gpt-5.5` (default `xhigh`), `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex`, `gpt-5.2`, `spark` → expands to `gpt-5.3-codex-spark`.

Efforts: `minimal` / `low` / `medium` / `high` / `xhigh` (the Codex `model_reasoning_effort` set; `none` is `plan_mode_reasoning_effort`-only). Per-model support varies — as of Codex CLI 0.125, every published `gpt-5.x` slug supports `[low, medium, high, xhigh]`. The script saves unknown values but surfaces both an effort-set warning and a model-specific support warning. Codex CLI rejects at runtime if the combination is unsupported.

**The change is global and persistent.** config.toml is read by every Codex invocation — Official plugin, direct CLI, every codex-advisor skill — until you change it again. The skill tells you before/after whenever it mutates.

## How a call is translated

You can type anything — English, Korean, flags, meta-instructions, emoji, typos.
Every skill does the same four things in order:

1. **Analyze** — parse your input into clean companion flags. Drop junk, obey meta-instructions addressed to Claude, reject unknown flags with a clarifying question instead of silently forwarding them.
2. **Draft review** — for prompt-passing skills (rescue, research, verify, adversarial), show the exact prompt or command that will be sent to Codex and wait for your approval before proceeding. Skip with `--no-preview`.
3. **Invoke** — run the Official Codex plugin's companion in the background, so long jobs don't die on Bash's 5-minute timeout.
4. **Double-check** — once Codex returns, read only the files and lines it cited. Classify each finding (Agreed / Disputed / Nuanced / False Positive / Uncited).
5. **Report** — present findings with the classification, save to `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<timestamp>.md`. Failed runs are saved to `<type>-<timestamp>-failed.md` with the categorized error.

The key discipline: **Claude never reads your source code before Codex runs.** That's what keeps the double-check independent. For document skills (verify / research), the document itself is streamed into Codex via a file pipe so it never enters Claude's context either.

`/codex-transfer` is the one exception to this five-step shape — it stops after Invoke. Once the session hands off to Codex, there's nothing left in Claude's hands to double-check or report on.

## Prerequisites

- [Official Codex plugin](https://github.com/openai/codex-plugin-cc) (`codex@openai-codex`) **v1.0.4+** — **install required**. Earlier versions had a different review handler; codex-advisor's flag-routing assumes the v1.0.4+ companion contract, tested through 1.0.5. Disabling is optional (see Quick Start); the companion script is always called directly via `scripts/resolve-companion.sh`, so disable just hides the Official `/codex:*` menu. `/codex-transfer` specifically needs **v1.0.5+** — the `transfer` subcommand doesn't exist before that. Disabling the Official plugin doesn't break `/codex-transfer` either: codex-advisor ships its own SessionStart hook (`hooks/session-start.mjs`) that fills in the transcript-path env var the Official plugin's own hook would otherwise provide.
- [OpenAI Codex CLI](https://github.com/openai/codex) — installed and authenticated (`/codex-setup` verifies both). Tested against Codex CLI 0.125.

## License

MIT
