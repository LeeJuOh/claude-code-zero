# skill-creator-pro

> The official skill-creator teaches Claude how to create skills. This plugin teaches it how to create **good** skills.

## Why

Making a skill is easy. Making one that triggers reliably, follows instructions consistently, and improves over time is hard. The official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) provides the eval framework — this plugin layers on design philosophy distilled from Anthropic's production experience:

- [Lessons from Building Claude Code: How We Use Skills](https://x.com/trq212/status/2027463795355095314) — internal lessons from running hundreds of skills
- [The Complete Guide to Building Skills for Claude](https://claude.com/blog/complete-guide-to-building-skills-for-claude) — planning, design, testing, troubleshooting

It adds a 9-category taxonomy, gotchas-driven design, and an autonomous optimization loop inspired by Karpathy's [autoresearch](https://github.com/karpathy/autoresearch).

## Two skills, two speeds

**`/skill-creator-pro`** — for when you're at the keyboard.
Walks you through a 5-phase loop (Understand → Design → Test → Improve → Polish), shows eval diffs in a browser between iterations, and waits for your feedback before changing anything. Use this when the skill is new, the requirements are fuzzy, or you want to stay in the loop.

**`/auto-optimize`** — for when you're not.
Takes a working-ish skill and hill-climbs it. Runs the skill dozens of times, scores every output against binary evals, reads the failures, and mutates the prompt — autonomously, without stopping to ask. Use this when the skill is already 70% good and you want it at 95%.

The first one needs you. The second one needs evals.

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
