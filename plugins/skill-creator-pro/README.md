# skill-creator-pro

The official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) teaches Claude how to create skills. This plugin teaches it how to create **good** skills.

## Philosophy

Built on skill-creator's eval framework ([blog post](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)), with design philosophy distilled from two Anthropic sources:

- [Lessons from Building Claude Code: How We Use Skills](https://x.com/trq212/status/2027463795355095314) — Anthropic's internal lessons from running hundreds of skills in production
- [The Complete Guide to Building Skills for Claude](https://claude.com/blog/complete-guide-to-building-skills-for-claude) — Official guide covering planning, design, testing, and troubleshooting

The core insight from these sources: knowing how to make a skill is easy, knowing how to make one that **triggers reliably, follows instructions consistently, and improves over time** is hard. This plugin embeds that knowledge into the creation flow.

## What it adds to skill-creator

- **9-category taxonomy** — Categorize your skill (Library & API, Product Verification, Runbooks, etc.) to apply category-specific design and improvement patterns
- **Gotchas-driven design** — Treats gotchas as the highest-ROI content; guides building them from real failure points
- **Start Small + Extract** — Two entry paths: build from scratch with one task first, or extract a skill from an existing conversation
- **Success metrics** — Quantitative (trigger rate, tool calls, API errors) and qualitative (user corrections, cross-session consistency) measurement framework
- **Troubleshooting guide** — 5 symptom-based diagnosis flows for common skill failures (doesn't trigger, instructions not followed, etc.)
- **Auto-optimize** — Inspired by Andrej Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) methodology. Autonomous optimization loop: run repeatedly, score with binary evals, reflect on failures to diagnose root causes, mutate the prompt, keep only improvements

Retained from skill-creator: parallel eval runs with baselines, benchmarking, blind A/B comparison, description optimization loop, eval viewer.

## Skills

| Skill | Description |
|-------|-------------|
| `skill-creator-pro` | Understand → Design → Test → Improve → Polish |
| `auto-optimize` | Autonomous optimization with reflection-driven mutation |

## Usage

```
/skill-creator-pro I want to make a skill for X
/skill-creator-pro improve this skill @path/to/skill
```

## Compatibility

Written and tested against **Claude Code v2.1.86**.
