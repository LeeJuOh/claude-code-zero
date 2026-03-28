# skill-creator-pro

> The official skill-creator teaches Claude how to create skills. This plugin teaches it how to create **good** skills.

## Why

Making a skill is easy. Making one that triggers reliably, follows instructions consistently, and improves over time is hard. The official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) provides the eval framework — this plugin layers on design philosophy distilled from Anthropic's production experience:

- [Lessons from Building Claude Code: How We Use Skills](https://x.com/trq212/status/2027463795355095314) — internal lessons from running hundreds of skills
- [The Complete Guide to Building Skills for Claude](https://claude.com/blog/complete-guide-to-building-skills-for-claude) — planning, design, testing, troubleshooting

It adds a 9-category taxonomy, gotchas-driven design, and an autonomous optimization loop inspired by Karpathy's [autoresearch](https://github.com/karpathy/autoresearch).

## Features

| Skill | Description |
|-------|-------------|
| `skill-creator-pro` | Full creation workflow: Understand → Design → Test → Improve → Polish |
| `auto-optimize` | Autonomous optimization — run repeatedly, score with binary evals, mutate the prompt, keep improvements |

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
