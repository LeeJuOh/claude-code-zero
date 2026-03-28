# skill-creator-pro

Create, test, measure, and iteratively improve Claude Code skills with category-aware design, gotchas-driven development, and progressive disclosure coaching.

## What's different from skill-creator

Built on the official [skill-creator](https://github.com/anthropics/claude-code-plugins/tree/main/plugins/skill-creator) (see [update blog post](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)) with additional knowledge from Anthropic's [Lessons from Building Claude Code: How We Use Skills](https://claude.com/blog/skills-best-practices) and [The Complete Guide to Building Skills for Claude](https://claude.com/blog/complete-guide-to-building-skills-for-claude).

**Added in Pro:**
- **9-category system** — Identifies which category your skill fits (Library & API Reference, Product Verification, Data Fetching, Business Automation, Code Scaffolding, Code Quality, CI/CD, Runbooks, Infrastructure Ops) and applies category-specific design and improvement patterns
- **5 implementation patterns** — Sequential Workflow, Multi-MCP Coordination, Iterative Refinement, Context-aware Tool Selection, Domain-specific Intelligence
- **Gotchas-driven design** — Treats gotchas as the highest-ROI content in any skill, with structured guidance on building and maintaining them
- **Problem-first vs Tool-first framing** — Helps choose the right skill structure based on whether users come with a problem or a tool
- **Interview & research step** — Proactive discovery of edge cases, dependencies, and success criteria before writing
- **Eval writing guide** — How to write binary evals that produce reliable scores instead of false confidence
- **Quality gate checklist** — 10-item verification before packaging
- **Official docs consultation** — Fetches current platform spec for frontmatter, hooks, and allowed-tools to avoid outdated patterns
- **Complete frontmatter reference** — All 13 supported fields including `argument-hint`, `model`, `effort`, `agent`, `skills`, `user-invocable`
- **CC version tracking** — Documents which Claude Code version the plugin was written against for easier maintenance

**Retained from skill-creator:**
- Eval system with parallel with-skill / baseline runs
- Benchmarking with pass rate, timing, and token metrics
- Blind A/B comparison via comparator agents
- Description optimization loop with train/test split
- Eval viewer for human review and feedback
- Claude.ai and Cowork environment support

## Skills included

| Skill | Description |
|-------|-------------|
| `skill-creator-pro` | Full skill creation workflow (Understand → Design → Test → Improve → Polish) |
| `auto-optimize` | Autonomous optimization — runs a skill dozens of times, scores with binary evals, mutates the prompt, keeps only improvements |

## Usage

```
/skill-creator-pro I want to make a skill for X
```

Or invoke when you already have a draft:

```
/skill-creator-pro improve this skill @path/to/skill
```

## Compatibility

Written and tested against **Claude Code v2.1.86**.
