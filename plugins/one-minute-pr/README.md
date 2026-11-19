# one-minute-pr

> Give reviewers a short PR or MR description with the reason for the change and evidence from the work.

## Why

Agent-written pull requests and merge requests were so long that I struggled to find what I needed to review. I built `one-minute-pr` to keep the description short and show why the change matters, what it affects, and how it was checked.

The body includes the scope and a way to undo the change. When verification evidence is missing, the skill says so. Hugo's examples show what evidence can look like in practice, from a screenshot of a UI change to the output of a real run. [What My Pull Requests Look Like Now](https://hugorcd.com/writing/what-my-pull-requests-look-like-now)

## Quick Start

Commit your work, then ask the agent to open a PR.

```
open a PR for this branch
```

The skill pushes the branch, writes the body, checks it, and posts it with your forge CLI, such as `gh` or `glab`. Without a forge CLI, it still pushes the branch and prints the body.

## Install

| Agent | Install | Call |
|---|---|---|
| Claude Code | `/plugin marketplace add LeeJuOh/claude-code-zero`, then `/plugin install one-minute-pr@claude-code-zero` | `/one-minute-pr` or ask for a PR |
| Codex | `codex plugin marketplace add LeeJuOh/claude-code-zero`, then `codex plugin add one-minute-pr@claude-code-zero` | `$one-minute-pr` or ask for a PR |
| Antigravity | `agy plugin install https://github.com/LeeJuOh/claude-code-zero/tree/main/plugins/one-minute-pr` | `/one-minute-pr` or ask for a PR |
| Any agent (skills CLI) | `npx skills add LeeJuOh/claude-code-zero --skill one-minute-pr` | Ask for a PR |

Requires git and Node.js 18 or later.

## What the body looks like

| Section | Content |
|---|---|
| Why | The problem and the approach, in one to three sentences |
| What changed | The changed contracts, data structures, settings, or flows, as a focused `diff`, a full code example tagged with its language, or a flow diagram |
| Scope | What the change covers and what it leaves out. Always present |
| Tradeoffs | Rejected alternatives a reviewer would ask about |
| Blast Radius | What the change touches, the fact that makes it safe or risky, and how far that was checked |
| Rollback | How to undo the change. Always present |
| Verification | One to three real runs and their output |

For a changed flow, the skill reuses a matching diagram. For a new diagram it honors a tool you or the repo specify when the PR can display its output. Otherwise it writes Mermaid or a plain-text diagram. No diagram plugin or setup is required. For UI changes it uses existing screenshots with matching framing, or a short recording when motion matters. It can link an existing interactive demo.

The skill drops a section with nothing to say, but keeps Scope and Rollback. Before it posts, a bundled script checks the body. The check fails on a wrong section order, a missing Scope or Rollback, an HTML comment, long dashes, curly quotes, and mid-sentence colons outside code. The body stays near 40 lines. When there is more, the skill asks whether it goes in a folded PR comment or a document you link. When you run the skill again on the same PR, it rewrites that comment too, or deletes it if nothing overflows. It finds the comment by its fixed first line, `More details (one-minute-pr)`, and leaves every other comment alone.

The skill does not commit for you, does not run tests or take screenshots to make new evidence, and does not follow the repo's PR template.
