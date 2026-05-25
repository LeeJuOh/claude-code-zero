# skill-creator-pro

> The official skill-creator teaches Claude how to create skills. This plugin teaches it how to create **good** skills.

## Why

Making a skill is easy. Making one that triggers reliably, follows instructions consistently, and improves over time is hard. The official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) provides the eval framework — this plugin layers on design philosophy distilled from Anthropic's production experience:

- [Lessons from Building Claude Code: How We Use Skills](https://x.com/trq212/status/2027463795355095314) — internal lessons from running hundreds of skills
- [The Complete Guide to Building Skills for Claude](https://claude.com/blog/complete-guide-to-building-skills-for-claude) — planning, design, testing, troubleshooting

It adds a 9-category taxonomy, gotchas-driven design, and an autonomous optimization loop inspired by Karpathy's [autoresearch](https://github.com/karpathy/autoresearch).

## Two skills, two speeds

**`/skill-creator-pro`** — for when you're at the keyboard.
Walks you through a 5-phase loop (Understand → Design → Test → Improve → Polish). Phase 5 also runs an independent **description-trigger optimizer** that runs should-trigger / should-not-trigger queries against candidate descriptions and returns the `best_description`. An HTML benchmark viewer shows parallel baseline-vs-with-skill eval diffs between iterations, and it waits for your feedback before changing anything. Use this when the skill is new, the requirements are fuzzy, or you want to stay in the loop.

**`/auto-optimize`** — for when you're not.
Takes a working-ish skill and hill-climbs **output quality** (not trigger accuracy). Runs the skill dozens of times in parallel baseline-vs-with-skill subagent pairs, uses grader / analyzer / comparator sub-agents to score every output against binary evals, reads the failures, runs reflection-driven mutation with stuck detection and a structured changelog, and mutates the prompt — autonomously, without stopping to ask. Use this when the skill is already 70% good and you want to push it higher.

The first one needs you. The second one needs evals.

## What ships

- **9-category taxonomy** and 6 reference docs — `skill-categories`, `design-patterns`, `platform-reference`, `schemas`, `troubleshooting-guide`, `eval-writing-guide`
- **Sub-agents** — grader, analyzer, comparator (parallel baseline/with-skill evaluation)
- **Scripts** — `run_loop.py` (description optimizer), `aggregate_benchmark.py` (HTML viewer), `package_skill.py`, and six more
- **Quality gate** — YAML validation, built-in slash-command collision check, 500-line / 5000-word body budget, platform v2.1.x compat checks
- **Artifacts** — HTML benchmark viewer, `benchmark.json`, `feedback.json`

## Prerequisites

- **Python 3** (for description optimizer and benchmark scripts)

## Install

```shell
/plugin install skill-creator-pro@claude-code-zero
```

## Usage

```
/skill-creator-pro I want to make a skill for X
/skill-creator-pro improve this skill @path/to/skill
/auto-optimize @path/to/skill
```

## License

MIT
