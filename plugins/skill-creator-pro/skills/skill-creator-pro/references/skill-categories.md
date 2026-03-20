# Skill Categories Guide

9 categories of skills, with design guidance, templates, and improvement patterns for each.

## Table of Contents

1. [Library & API Reference](#1-library--api-reference)
2. [Product Verification](#2-product-verification)
3. [Data Fetching & Analysis](#3-data-fetching--analysis)
4. [Business Process & Team Automation](#4-business-process--team-automation)
5. [Code Scaffolding & Templates](#5-code-scaffolding--templates)
6. [Code Quality & Review](#6-code-quality--review)
7. [CI/CD & Deployment](#7-cicd--deployment)
8. [Runbooks](#8-runbooks)
9. [Infrastructure Operations](#9-infrastructure-operations)

---

## 1. Library & API Reference

Skills that explain how to correctly use a library, CLI, or SDK. Both internal libraries and common libraries that Claude sometimes struggles with.

**Signature elements:**
- Folder of reference code snippets in `references/`
- Prominent gotchas section covering edge cases and footguns
- Code examples showing correct vs incorrect usage

**Examples:** `billing-lib`, `internal-platform-cli`, `frontend-design`

**Template:**
```markdown
## Usage Patterns
[Common usage patterns with code examples]

## Gotchas
- [Edge case 1 with explanation]
- [Footgun 1 with workaround]

## API Reference
See [references/api.md](references/api.md) for complete function signatures.
```

**Improvement patterns:**
- Add gotchas as Claude hits new edge cases during testing
- Include "before/after" code examples showing common mistakes
- Focus on information that pushes Claude out of its default patterns
- The `frontend-design` skill was built by iterating on Claude's design taste, avoiding cliche patterns like Inter font and purple gradients

---

## 2. Product Verification

Skills that describe how to test or verify code is working. Often paired with external tools like Playwright, tmux, Selenium, etc.

**Signature elements:**
- Scripts for driving external verification tools
- Programmatic assertions on state at each step
- Video/screenshot capture of test output

**Examples:** `signup-flow-driver`, `checkout-verifier`, `tmux-cli-driver`

**Template:**
```markdown
## Verification Steps
1. [Setup step with tool initialization]
2. [Action step with expected state]
3. [Assertion step with programmatic check]

## Scripts
- `scripts/verify.sh` -- Run verification and capture results
- `scripts/assert_state.py` -- Check state at each step

## Gotchas
- [Timing issue with async operations]
- [State cleanup between test runs]
```

**Improvement patterns:**
- Worth investing heavily -- an engineer spending a week on verification skills pays dividends
- Have Claude record a video of its output so you can see exactly what it tested
- Enforce programmatic assertions rather than visual checks
- Include scripts for state setup and teardown

---

## 3. Data Fetching & Analysis

Skills that connect to data and monitoring stacks. Include libraries to fetch data, credential helpers, dashboard IDs, and common workflows.

**Signature elements:**
- Helper functions in `scripts/` for data fetching
- Specific table names, dashboard IDs, query patterns
- Common analysis workflows documented

**Examples:** `funnel-query`, `cohort-compare`, `grafana`

**Template:**
```markdown
## Data Sources
[Table names, dashboard UIDs, cluster identifiers]

## Common Workflows
### [Workflow 1: e.g., Funnel Analysis]
[Step-by-step with specific query patterns]

## Helper Functions
See `scripts/analytics.py` for reusable functions:
- `fetch_events(start, end, event_types)` -- Query event source
- `compute_retention(cohort_date, window_days)` -- Calculate retention
```

**Improvement patterns:**
- Give Claude reusable scripts and libraries so it spends turns on composition, not reconstructing boilerplate
- Include specific datasource UIDs, cluster names, and problem-to-dashboard lookup tables
- Claude can generate scripts on the fly to compose helper functions

---

## 4. Business Process & Team Automation

Skills that automate repetitive workflows into one command. Usually simple instructions but may have complex dependencies on other skills or MCPs.

**Signature elements:**
- Save previous results in log files for consistency
- Reference other skills by name for composition
- Config.json for user-specific settings (Slack channel, etc.)

**Examples:** `standup-post`, `create-jira-ticket`, `weekly-recap`

**Template:**
```markdown
## Workflow
1. [Gather data from sources]
2. [Process and format]
3. [Output or post]

## Configuration
On first run, check `${CLAUDE_PLUGIN_DATA}/config.json` for:
- [Required setting 1]
- [Required setting 2]
If missing, ask the user.

## History
Previous outputs are in `${CLAUDE_PLUGIN_DATA}/history.log`.
Reference for delta-only reporting.
```

**Improvement patterns:**
- Saving previous results in log files helps the model stay consistent and reflect on prior executions
- For standup-post: keep `standups.log` so Claude reads its own history and detects what changed
- Use `${CLAUDE_PLUGIN_DATA}` for persistent storage that survives upgrades

---

## 5. Code Scaffolding & Templates

Skills that generate framework boilerplate. Combine with composable scripts. Especially useful when scaffolding has natural-language requirements that pure code can't cover.

**Signature elements:**
- Template files in `assets/`
- Composable scripts in `scripts/`
- Configuration for framework-specific patterns

**Examples:** `new-service-workflow`, `new-migration`, `create-app`

**Template:**
```markdown
## Scaffolding Steps
1. [Create directory structure]
2. [Generate from template]
3. [Wire up configuration]

## Templates
- `assets/service-template/` -- Base service template
- `assets/migration-template.sql` -- Migration file template

## Customization Points
[Where and how to customize the generated code]

## Gotchas
- [Common misconfiguration]
- [Framework-specific pitfall]
```

**Improvement patterns:**
- Include template files that Claude copies and customizes, rather than generating from scratch
- Use composable scripts that can be combined for different scaffolding needs
- Document framework-specific gotchas that Claude wouldn't know by default

---

## 6. Code Quality & Review

Skills that enforce org-specific code quality and review standards. Can include deterministic scripts for maximum robustness. Consider running via hooks or GitHub Actions.

**Signature elements:**
- Deterministic scripts for linting/validation
- On-demand hooks for enforcement
- Subagent patterns for adversarial review

**Examples:** `adversarial-review`, `code-style`, `testing-practices`

**Template:**
```markdown
## Review Criteria
[What to check, with specific examples of good vs bad]

## Automated Checks
Run `scripts/check_quality.sh` for deterministic validation.

## Review Process
1. [First pass: automated checks]
2. [Second pass: pattern review]
3. [Third pass: architecture concerns]

## Gotchas
- [Style that Claude does not follow by default]
- [Common false positive from linters]
```

**Improvement patterns:**
- `adversarial-review` spawns a fresh-eyes subagent to critique, implements fixes, iterates until findings degrade to nitpicks
- Use deterministic scripts for checks that can be automated -- code is more reliable than language instructions
- Consider adding on-demand hooks that run automatically (e.g., lint after every Edit/Write)

---

## 7. CI/CD & Deployment

Skills that help fetch, push, and deploy code. May reference other skills to collect data.

**Signature elements:**
- Multi-skill composition (data gathering + deployment)
- Error-rate comparison and auto-rollback
- Merge conflict resolution workflows

**Examples:** `babysit-pr`, `deploy-service`, `cherry-pick-prod`

**Template:**
```markdown
## Deployment Steps
1. [Pre-flight checks]
2. [Build and test]
3. [Deploy with gradual rollout]
4. [Monitor and verify]
5. [Rollback if needed]

## Monitoring
[Error-rate thresholds and comparison queries]

## Gotchas
- [CI flakiness patterns]
- [Merge conflict resolution approach]
```

**Improvement patterns:**
- `babysit-pr` monitors a PR, retries flaky CI, resolves merge conflicts, enables auto-merge
- `deploy-service` includes smoke test, gradual traffic rollout, error-rate comparison, auto-rollback
- Use worktree isolation for cherry-pick operations

---

## 8. Runbooks

Skills that take a symptom (Slack thread, alert, error signature), walk through a multi-tool investigation, and produce a structured report.

**Signature elements:**
- Symptom-to-tool mapping
- Query patterns for common issues
- Structured report output template

**Examples:** `service-debugging`, `oncall-runner`, `log-correlator`

**Template:**
```markdown
## Symptom Map
| Symptom | Investigation Tools | Common Causes |
|---------|-------------------|---------------|
| [Symptom 1] | [Tool list] | [Cause list] |

## Investigation Steps
1. [Gather context from alert/thread]
2. [Check the usual suspects]
3. [Deep dive if needed]

## Report Template
See `assets/report-template.md` for the output format.

## Gotchas
- [False positive patterns]
- [Correlated but unrelated alerts]
```

**Improvement patterns:**
- Map symptoms to specific tools and query patterns for your highest-traffic services
- Given a request ID, pull matching logs from every system that might have touched it
- Include specific dashboard links and query templates

---

## 9. Infrastructure Operations

Skills that perform routine maintenance and operational procedures. Some involve destructive actions that benefit from guardrails.

**Signature elements:**
- Confirmation gates before destructive actions
- Soak periods between steps
- On-demand hooks for safety

**Examples:** `resource-orphans`, `dependency-management`, `cost-investigation`

**Template:**
```markdown
## Procedure
1. [Discovery step]
2. [Report findings to user]
3. [Wait for confirmation]
4. [Execute with guardrails]
5. [Verify completion]

## Safety
- Always confirm before destructive actions
- Use `--dry-run` where available
- Log all operations to `${CLAUDE_PLUGIN_DATA}/ops.log`

## On-Demand Hooks
This skill registers a PreToolUse hook that blocks:
- `rm -rf` on production paths
- `kubectl delete` without `--dry-run`
```

**Improvement patterns:**
- Find orphaned resources, post to Slack, wait for soak period, then confirm with user before cleanup
- Include specific bucket names, query patterns for cost investigation
- Use on-demand hooks for safety guardrails that would be annoying always-on

---

## Choosing Between Categories

If your skill seems to span categories, ask:
- What is the **primary** action? (e.g., a skill that reviews code AND deploys is primarily Code Quality or CI/CD?)
- Can you **split** it? Two focused skills are better than one confused one.
- Which category's **improvement patterns** feel most relevant?

Skills that fit cleanly into one category are easier to maintain, discover, and improve.
