# Lessons from Building Claude Code: How We Use Skills

> **Source:** Anthropic internal engineering post (X article by @trq212, 2025)
> **Purpose:** Skill 설계·분류·배포 시 참고하는 실전 가이드. Anthropic 내부에서 수백 개 스킬을 운영하며 얻은 교훈 정리.

---

## Table of Contents

1. [Skills Are Folders, Not Just Markdown](#skills-are-folders-not-just-markdown)
2. [Skill Categories (9 Types)](#skill-categories-9-types)
3. [Tips for Making Skills](#tips-for-making-skills)
4. [Distributing Skills](#distributing-skills)
5. [Measuring Skills](#measuring-skills)

---

## Skills Are Folders, Not Just Markdown

Common misconception: skills = "just markdown files." In practice, the most powerful skills leverage their **folder structure** — scripts, assets, data files, reference docs — that the agent can discover, explore, and manipulate at runtime.

Configuration options include registering **dynamic hooks** that activate only during the skill's session.

---

## Skill Categories (9 Types)

Best skills fit **one** category cleanly. Skills that straddle multiple categories tend to confuse.

### 1. Library & API Reference

How to correctly use a library, CLI, or SDK. Internal or external.

- Include a folder of **reference code snippets**
- Include a **list of gotchas** Claude should avoid

**Examples:** `billing-lib`, `internal-platform-cli`, `frontend-design`

### 2. Product Verification

How to test/verify that code is working. Often paired with external tools (Playwright, tmux, etc.).

- Have Claude **record a video** of its output for review
- Enforce **programmatic assertions** on state at each step
- Include **scripts** in the skill folder

**Examples:** `signup-flow-driver`, `checkout-verifier`, `tmux-cli-driver`

> **Worth investing heavily** — having an engineer spend a week making verification skills excellent pays off.

### 3. Data Fetching & Analysis

Connect to data and monitoring stacks. Include libraries, credentials helpers, dashboard IDs, common workflows.

**Examples:** `funnel-query`, `cohort-compare`, `grafana`

### 4. Business Process & Team Automation

Automate repetitive workflows into one command. Often simple instructions but complex dependencies on other skills/MCPs.

- **Save previous results in log files** — helps the model stay consistent and reflect on prior executions

**Examples:** `standup-post`, `create-<ticket-system>-ticket`, `weekly-recap`

### 5. Code Scaffolding & Templates

Generate framework boilerplate. Combine with composable scripts. Especially useful when scaffolding has **natural-language requirements** that pure code can't cover.

**Examples:** `new-<framework>-workflow`, `new-migration`, `create-app`

### 6. Code Quality & Review

Enforce org-specific code quality and review standards. Can include deterministic scripts. Consider running via **hooks** or **GitHub Actions**.

**Examples:** `adversarial-review`, `code-style`, `testing-practices`

### 7. CI/CD & Deployment

Fetch, push, deploy code. May reference other skills to collect data.

**Examples:** `babysit-pr`, `deploy-<service>`, `cherry-pick-prod`

### 8. Runbooks

Take a symptom (Slack thread, alert, error signature) → multi-tool investigation → structured report.

**Examples:** `<service>-debugging`, `oncall-runner`, `log-correlator`

### 9. Infrastructure Operations

Routine maintenance and operational procedures. May involve destructive actions — benefit from guardrails.

**Examples:** `<resource>-orphans`, `dependency-management`, `cost-investigation`

---

## Tips for Making Skills

### Don't State the Obvious

Claude already knows a lot about coding. Focus on information that **pushes Claude out of its normal way of thinking**. Example: the `frontend-design` skill was built to improve Claude's design taste, avoiding cliché patterns like Inter font and purple gradients.

### Build a Gotchas Section

**Highest-signal content** in any skill. Build from common failure points Claude encounters. Update over time as new edge cases appear.

### Use the File System & Progressive Disclosure

The entire folder is context engineering. Tell Claude what files are in your skill, and it reads them at appropriate times.

| Technique | Example |
|-----------|---------|
| Split detailed API docs | `references/api.md` |
| Output templates | `assets/template.md` |
| Reference code | `references/*.py` |
| Helper scripts | `scripts/fetch_data.py` |

### Avoid Railroading Claude

Skills are reusable — avoid being too specific. Give Claude the **information** it needs but the **flexibility** to adapt. Don't over-constrain behavior.

### Think Through the Setup

Some skills need user-specific context (e.g., which Slack channel, API key, team name).

**Pattern:**
1. Store setup info in a `config.json` inside `${CLAUDE_PLUGIN_DATA}` (persistent across upgrades).
2. On first invocation, detect missing config and prompt the user via `AskUserQuestion` with structured, multiple-choice options.
3. Save responses to `config.json` so subsequent invocations skip setup.

This "lazy init" pattern avoids forcing setup before the user even knows if they want the skill.

### The Description Field Is for the Model

When a session starts, Claude scans every skill's `description` to decide relevance. The description is **not a summary** — it's a **trigger condition**. Write it to answer: "when should Claude invoke this skill?"

### Memory & Storing Data

Skills can maintain state across invocations:

- Simple: append-only text log, JSON files
- Advanced: SQLite database

**Important:** Data in the skill directory may be deleted on upgrade. Use `${CLAUDE_PLUGIN_DATA}` for stable, persistent storage. Resolves to `~/.claude/plugins/data/{id}/` where `{id}` is the plugin identifier with non-alphanumeric chars replaced by `-`.

**Example:** `standup-post` keeps `standups.log` so Claude reads its own history and detects what changed since yesterday.

### Store Scripts & Generate Code

Give Claude **reusable scripts and libraries** so it spends turns on **composition**, not reconstructing boilerplate.

```
# Example: data science skill with helper functions
# scripts/analytics.py
def fetch_events(start, end, event_types): ...
def compute_retention(cohort_date, window_days): ...
def format_report(title, sections): ...
```

Claude generates scripts on the fly to compose these functions for prompts like "What happened on Tuesday?"

### On-Demand Hooks

Skills can register hooks that activate **only when the skill is called** and last for the session duration.

**Examples:**
- `/careful` — blocks `rm -rf`, `DROP TABLE`, force-push, `kubectl delete` via PreToolUse matcher on Bash. Only activate when touching prod.
- `/freeze` — blocks Edit/Write outside a specific directory. Useful when debugging to prevent accidental "fixes."

---

## Distributing Skills

### Two Distribution Methods

| Method | Best for | Trade-off |
|--------|----------|-----------|
| Check into repo (`./.claude/skills`) | Small teams, few repos | Every skill adds to model context |
| Plugin marketplace | Scaling orgs | Users choose what to install |

### Managing a Marketplace

- No centralized team decides — find useful skills **organically**
- New skills start in a **sandbox folder** on GitHub, promoted via Slack
- Once a skill gains traction, the owner submits a PR to the marketplace
- **Curation before release is important** — easy to create bad or redundant skills
- Quality gates: review descriptions (trigger accuracy), check for category overlap with existing skills, verify gotchas section exists

### Composing Skills

Dependency management is not natively built into marketplaces yet. Reference other skills **by name** — Claude will invoke them if installed.

---

## Measuring Skills

Use a **PreToolUse hook** to log skill usage. This enables:

- Finding popular skills
- Detecting skills that **under-trigger** compared to expectations
- Data-driven skill improvement

---

## Tooling

### Skill Creator

Anthropic provides a **Skill Creator** tool (`/skill-creator`) that helps bootstrap new skills. It generates the folder structure, SKILL.md frontmatter, and initial gotchas section based on a description of what the skill should do. Useful for getting the skeleton right before adding domain-specific content.

---

## Key Takeaways

1. **Start small** — most skills began as a few lines and a single gotcha, then grew as edge cases appeared.
2. **Categorize cleanly** — skills that fit one type are easier to maintain and discover.
3. **Gotchas section = highest ROI** — capture every failure mode Claude encounters.
4. **Folder structure = context engineering** — use progressive disclosure, not one giant markdown file.
5. **Description = trigger** — write for the model, not for humans.
6. **Persist data safely** — use `${CLAUDE_PLUGIN_DATA}`, not the skill directory.
7. **Curate before publishing** — bad/redundant skills add noise.
