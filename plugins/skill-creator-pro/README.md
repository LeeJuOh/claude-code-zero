# skill-creator-pro

> Create a skill and compare what an agent produces with and without it.

## Why

A skill can load for the right request and still give poor instructions. It can also work well when called by name but never get picked from its description. Those problems need different tests.

The description optimizer checks which requests select the skill. The task evaluations run the same prompts with and without it so you can compare the actual work. The plugin builds on [Anthropic's skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator). It also helps you decide when to use a hook instead, when to retire a skill, and what to check before publishing it.

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

MIT. The `skill-creator-pro` skill is derived from Anthropic's skill-creator (Apache-2.0, see `skills/skill-creator-pro/LICENSE.txt`).
