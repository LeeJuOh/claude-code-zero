# skill-creator-pro

> The official skill-creator teaches Claude how to create skills. This plugin keeps that lean loop and adds a few hard-won ideas for skills that survive contact with real use.

## Why

Making a skill is easy. Making one that triggers when it should, holds up across a thousand different prompts, and doesn't rot the moment the model gets smarter — that's the hard part. Most homegrown skill tooling overcorrects into a heavy framework: forced taxonomies, multi-phase pipelines, rituals you fill in before you've written a line.

skill-creator-pro goes the other way. It *is* Anthropic's official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) — the same warm, flexible coaching loop (draft → test → review with you → improve) and the same eval harness — with only a handful of additions, each one chosen because it changes a decision rather than adds a step:

- **A "is a skill even the right primitive?" gate** before you build, so you don't write a skill when the need really belongs in CLAUDE.md, a hook, or an MCP server.
- **A retire-don't-just-patch review**, because a skill written to paper over a model limitation becomes dead weight once the next model fixes it.
- **A pre-ship platform check** for the silent traps — reserved names, YAML booleans, unquoted colons, name collisions — that pass review and then break loading.

Everything else is the official tool. That's the whole idea: official + a few genuinely good ideas, not a framework to learn.

## Two skills, two speeds

**`/skill-creator-pro`** — for when you're at the keyboard.
Captures intent, drafts a skill, runs your test prompts as parallel baseline-vs-with-skill subagents, and opens an HTML benchmark viewer so you can see — side by side, with variance across runs — where the skill helps and where it doesn't. It waits for your feedback before changing anything, then iterates. A separate description-trigger optimizer tunes the frontmatter so the skill fires when it should and stays quiet when it shouldn't. Use it when the skill is new, the requirements are fuzzy, or you want to stay in the loop.

**`/skill-creator-pro:auto-optimize`** — for when you're not.
Takes a working-ish skill and hill-climbs **output quality** (not trigger accuracy). Runs the skill repeatedly, scores each output against binary evals, reads the failures, and mutates the prompt with reflection-driven mutation and a structured session archive — autonomously, without stopping to ask. Every run goes to a fresh subagent that never sees the evals, and a live dashboard tracks the score. Only you can start it: Claude never launches it on its own, because it edits the skill in place and spends many model calls. Based on Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) methodology. Use it once a skill is already ~70% good and you want to push it higher.

The first one needs you. The second one needs evals.

## Quick Start

```shell
/plugin install skill-creator-pro@claude-code-zero
```

```
/skill-creator-pro I want to make a skill for X
/skill-creator-pro improve this skill @path/to/skill
/skill-creator-pro:auto-optimize @path/to/skill
```

## Commands

| Command | What it does |
|---|---|
| `/skill-creator-pro` | Create or improve a skill with the human-in-the-loop coaching + eval loop, then optimize its description for reliable triggering. |
| `/skill-creator-pro:auto-optimize` | User-started only. Autonomously hill-climb an existing skill's output quality against binary evals. |

## Prerequisites

- **Python 3** — for the eval harness, benchmark viewer, and description optimizer.

## License

MIT. The `skill-creator-pro` skill is derived from Anthropic's skill-creator (Apache-2.0, see `skills/skill-creator-pro/LICENSE.txt`); it differs from upstream in the additions above, the Claude.ai notes moved to `references/claude-ai.md`, and two eval-viewer changes: `generate_review.py` escapes `</script>` in embedded data, and `viewer.html` renders `.html` outputs live in a sandboxed iframe.
