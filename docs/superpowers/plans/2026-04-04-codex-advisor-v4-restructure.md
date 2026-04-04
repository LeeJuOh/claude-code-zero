# codex-advisor v4.0.0 Restructure — Official Wrapper + Evaluation Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure codex-advisor into a wrapper around the Official Codex plugin that adds Claude's independent double-check evaluation to every interaction. Review/adversarial/rescue invoke Official commands via Skill tool. Verify/research (Official에 없는 기능) use a dedicated agent for Codex execution. All skills focus purely on evaluation logic.

**Architecture:** 6 skills + 1 agent + 1 shared evaluation reference. Review/adversarial/rescue skills invoke Official plugin commands (Skill tool), gaining broker/job/lifecycle for free. Verify/research skills use a `codex-exec` agent for `codex exec` calls. Every skill ends with Claude's double-check evaluation. Official plugin is a required dependency.

**Tech Stack:** SKILL.md (Markdown), agents/*.md, evaluation.md (shared reference)

---

## Design Decisions

### Why Official Wrapper?

Official Codex plugin (`codex@openai-codex`) handles job lifecycle, background execution, retry, and 3,200+ lines of Node.js infrastructure. Replicating this independently is fighting a losing battle. Wrapping it and adding evaluation on top is the right positioning.

### What v3 Features Are Intentionally Removed

| v3 Feature | Reason for Removal |
|---|---|
| **Hooks** (post-commit, task-completed, stop-review-gate) | Official plugin has its own review gate (`/codex:setup --enable-review-gate`). Duplicate hook infrastructure adds maintenance burden without unique value. |
| **Config system** (model, reasoning, stopGate in `${CLAUDE_PLUGIN_DATA}/config.json`) | Replaced by `codex-setup` skill that manages `~/.codex/config.toml` directly. This is the canonical config location that ALL Codex commands respect — both Official plugin and direct CLI. |
| **Session resume** (`codex exec resume --last`) | Official `/codex:rescue` handles thread resumption via `--resume` / `--resume-last`. |
| **Focus modes** (security, performance, architecture) | Official `/codex:adversarial-review` accepts free-form `--focus` text. More flexible than our hardcoded modes. |
| **Adversarial JSON schema** (`review-output-schema.json`) | Official uses its own structured output schema internally. We consume its output, not raw Codex output. |

### What v4 Adds Over Official

| Gap in Official | codex-advisor Fills It With |
|---|---|
| No independent evaluation of findings | Adversarial double-check on every result (evaluation.md) |
| No `--model` on review commands | `codex-setup` configures `config.toml` defaults (applies to all commands) |
| No `--effort` on review commands | Same — `codex-setup` sets `model_reasoning_effort` in config.toml |
| No document verification | `codex-verify` skill via codex-exec agent |
| No deep-dive research | `codex-research` skill via codex-exec agent |

---

## Target File Structure

```
plugins/codex-advisor/
├── .claude-plugin/plugin.json
├── README.md
├── agents/
│   └── codex-exec.md                  # NEW: Codex exec agent (verify/research)
├── skills/
│   ├── codex-setup/SKILL.md           # NEW: preflight + dependency check
│   ├── codex-review/SKILL.md          # REWRITE: invoke /codex:review → evaluate
│   ├── codex-adversarial/SKILL.md     # NEW: invoke /codex:adversarial-review → evaluate
│   ├── codex-rescue/SKILL.md          # NEW: invoke /codex:rescue → evaluate
│   ├── codex-verify/SKILL.md          # REWRITE: codex-exec agent → PASS/FAIL evaluate
│   └─��� codex-research/SKILL.md        # REWRITE: codex-exec agent → synthesis evaluate
├── references/
│   ├── evaluation.md                  # NEW: double-check methodology
│   └── gpt-prompting.md              # KEEP: prompt patterns for verify/research
```

## Files to DELETE

```
hooks/hooks.json
hooks/post-commit.sh
hooks/stop-review-gate.sh
hooks/task-completed.sh
references/execution.md
references/adversarial-prompt.md
references/review-output-schema.json
references/stop-review-gate-prompt.md
```

---

## Task 1: Create evaluation.md

**Files:**
- Create: `plugins/codex-advisor/references/evaluation.md`

Shared double-check methodology. Includes Agreement Level (from consult-codex pattern).

- [ ] **Step 1: Write evaluation.md**

```markdown
# Double-Check Evaluation Framework

Shared evaluation methodology for all codex-advisor skills. Every skill reads this after receiving Codex output.

## Peer AI Evaluation

Treat Codex as a peer, not an authority. For each finding:

- **Agree**: Confirm with additional context if useful
- **Disagree**: Explain why with evidence — read the actual code first
- **Nuance**: Add context Codex may have missed

### Rules

- Do NOT blindly agree. Codex can hallucinate file paths, line numbers, and function names.
- Always read the actual code to verify claims about specific files before agreeing or disagreeing.
- If you genuinely disagree, present both perspectives and let the user decide.
- Preserve Codex output verbatim. Claude's evaluation comes AFTER, not instead of.
- Frame disagreements as peer discussion, not correction.

## Self-Bias Awareness

When reviewing code that Claude authored earlier in the session:
- Explicitly acknowledge: "Note: I authored some of this code, so I may have blind spots."
- Be extra honest about Codex's findings. Don't rationalize away valid catches.
- Default to treating Codex findings as valid unless you can prove otherwise with code evidence.

## Agreement Level

After evaluating all findings, report a one-line agreement summary:

| Level | Criteria |
|-------|---------|
| **High** | >80% findings agreed, no critical disagreements |
| **Partial** | 50-80% agreed, or disagreements on non-critical items |
| **Disagreement** | <50% agreed, or disagreement on critical findings |

Include in the summary: `Agreement: High (5/6 findings agreed)`

## Cross-Model Comparison

If Claude already analyzed the same scope earlier in the conversation:

| Finding | Claude | Codex | Agreement |
|---------|--------|-------|-----------|
| [issue] | Found  | Found | Both      |
| [issue] | Missed | Found | Codex only |
| [issue] | Found  | Missed | Claude only |

## No Auto-Fix Rule

After presenting results, **do not automatically fix or modify code**. The user must explicitly request changes.

Correct flow: present findings → wait for user → fix only what they ask for.

## Save Results

Write combined output to `${CLAUDE_PLUGIN_DATA}/reviews/<type>-<YYYYMMDD-HHMMSS>.md`.

Types: `review`, `adversarial`, `rescue`, `verify`, `research`.

Create `${CLAUDE_PLUGIN_DATA}/reviews/` if it doesn't exist: `mkdir -p ${CLAUDE_PLUGIN_DATA}/reviews`

Standard format:

    # Codex <Type> — <date>

    ## Scope
    <what was analyzed>

    ## Codex Output
    <preserved verbatim>

    ## Claude's Evaluation

    ### Agreed
    - [finding]: [additional context]

    ### Disputed
    - [finding]: [why, with evidence]

    ### Additional Findings
    - [things Codex missed]

    ## Summary
    - Agreement: <High|Partial|Disagreement> (N/M findings agreed)
    - Codex findings: N | Agreed: N | Disputed: N | Claude additional: N
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/references/evaluation.md
git commit -m "feat(codex-advisor): add shared double-check evaluation framework

Peer evaluation, self-bias awareness, agreement level, cross-model comparison."
```

---

## Task 2: Create codex-exec Agent

**Files:**
- Create: `plugins/codex-advisor/agents/codex-exec.md`

Dedicated agent for running `codex exec` with structured prompts. Used by verify and research skills (Official has no equivalent commands for these).

- [ ] **Step 1: Create agents directory and write agent**

```bash
mkdir -p plugins/codex-advisor/agents
```

Write `plugins/codex-advisor/agents/codex-exec.md`:

```markdown
---
tools: ["Bash", "Read"]
model: haiku
maxTurns: 3
---

# Codex Exec Agent

Execute a `codex exec` command with a prompt file and return the raw output.

## Instructions

You are a thin execution wrapper. Your only job is to run `codex exec` with the provided prompt and return the output unchanged.

1. Read the prompt file at the path provided in the task description
2. Create stderr capture directory if needed:

```bash
mkdir -p ${CLAUDE_PLUGIN_DATA}/tmp
```

3. Execute:

```bash
codex exec "$(cat PROMPT_FILE_PATH)" -s read-only 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-exec-stderr.txt
```

Timeout: 300000ms (5 minutes).

4. If the command succeeds, return stdout verbatim
5. If the command fails, return the error:
   - Read `${CLAUDE_PLUGIN_DATA}/tmp/codex-exec-stderr.txt` for error details
   - Report exit code and stderr content
6. Clean up: `rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-exec-stderr.txt`

## Rules

- Do NOT interpret, summarize, or evaluate the output
- Do NOT modify the prompt
- Do NOT read any repository files beyond the prompt file
- Return the raw Codex output exactly as received
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/agents/codex-exec.md
git commit -m "feat(codex-advisor): add codex-exec agent

Thin wrapper for codex exec calls, used by verify and research skills."
```

---

## Task 3: Create codex-setup Skill

**Files:**
- Create: `plugins/codex-advisor/skills/codex-setup/SKILL.md`

Preflight check + `~/.codex/config.toml` configuration helper. Official plugin doesn't expose model/effort settings — this skill fills that gap.

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: codex-setup
description: "Check Codex CLI, auth, Official plugin status, and configure defaults (model, reasoning effort). Use when the user says \"codex setup\", \"codex 설정\", \"코덱스 설치\", \"모델 바꿔\", \"코덱스 모델\", or when another codex-advisor skill reports setup issues."
argument-hint: "[--model MODEL] [--effort LEVEL] [--status]"
allowed-tools: ["Bash", "Read"]
---

# Codex Setup & Configuration

Preflight check and `~/.codex/config.toml` configuration helper for codex-advisor.

## Mode Selection

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| `--status` or no args | Run preflight + show current config |
| `--model MODEL` | Set default model in config.toml |
| `--effort LEVEL` | Set reasoning effort in config.toml |
| Combined flags | Apply all settings |

## Preflight Check

### Check Codex CLI

```bash
which codex >/dev/null 2>&1 && codex --version || echo "NOT_INSTALLED"
```

If NOT_INSTALLED: "Codex CLI is not installed. Install: `npm install -g @openai/codex`"

### Check Authentication

```bash
codex exec "echo hello" -s read-only 2>&1 | head -5
```

If auth error: "Authentication required. Run: `codex login`"

### Check Official Codex Plugin

Try invoking `codex:setup` via the Skill tool. If it fails with "unknown skill":
"Official Codex plugin required. Install: `/plugin install codex@openai-codex` then `/reload-plugins`"

If it succeeds, include its output in the status report.

## Configuration Management

Read current config:

```bash
cat ~/.codex/config.toml 2>/dev/null || echo "NO_CONFIG"
```

### Set Model (`--model`)

Valid models: `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.3-codex-spark`, or any model string.

```bash
# Create config if it doesn't exist
mkdir -p ~/.codex
# Update or create the model line
if grep -q '^model' ~/.codex/config.toml 2>/dev/null; then
  sed -i '' 's/^model = .*/model = "NEW_MODEL"/' ~/.codex/config.toml
else
  echo 'model = "NEW_MODEL"' >> ~/.codex/config.toml
fi
```

### Set Reasoning Effort (`--effort`)

Valid levels: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`.

```bash
if grep -q '^model_reasoning_effort' ~/.codex/config.toml 2>/dev/null; then
  sed -i '' 's/^model_reasoning_effort = .*/model_reasoning_effort = "NEW_EFFORT"/' ~/.codex/config.toml
else
  echo 'model_reasoning_effort = "NEW_EFFORT"' >> ~/.codex/config.toml
fi
```

## Status Report

```markdown
## Codex Setup Status

| Item | Status |
|------|--------|
| Codex CLI | version or NOT_INSTALLED |
| Authentication | OK or FAILED |
| Official Plugin | OK or NOT_INSTALLED (required) |

## Current Configuration (~/.codex/config.toml)

| Setting | Value |
|---------|-------|
| model | <current or "default (not set)"> |
| model_reasoning_effort | <current or "default (not set)"> |
| web_search | <current or "default (not set)"> |

These defaults apply to ALL Codex commands — both Official plugin and direct CLI.
To change: `/codex-setup --model gpt-5.4-mini --effort high`
```

## Gotchas

- **config.toml applies globally.** Changes affect all Codex commands system-wide, not just codex-advisor.
- **Official `/codex:review` ignores `--model` flag.** The only way to change the review model is via config.toml — that's why this skill exists.
- **Don't create config.toml if user only asked for status.** Only write when explicitly setting values.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/skills/codex-setup/SKILL.md
git commit -m "feat(codex-advisor): add codex-setup skill

Preflight check + config.toml configuration helper for model and effort."
```

---

## Task 4: Create codex-review Skill (Official Wrapper)

**Files:**
- Create: `plugins/codex-advisor/skills/codex-review/SKILL.md`

Invokes Official `/codex:review` via Skill tool, then applies evaluation.

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: codex-review
description: "Run Codex code review with Claude's independent double-check. Use when the user asks \"codex review\", \"codex 리뷰\", \"코드 리뷰\", wants Codex to review code changes, diff, branch, or commit. For adversarial review use /codex-adversarial."
argument-hint: "[--uncommitted | --base BRANCH | --commit SHA | FOCUS_TEXT]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Codex Code Review + Double-Check

Invoke the Official Codex plugin's review, then apply Claude's independent evaluation to every finding.

## Step 1: Execute via Official Plugin

Use the Skill tool to invoke `codex:review` with the user's arguments:

```
Skill: codex:review
Args: $ARGUMENTS
```

If $ARGUMENTS is empty, pass no args — Official auto-detects scope (uncommitted or branch).

### If Skill tool fails:

| Error | Action |
|-------|--------|
| "unknown skill" or "not found" | Official plugin not installed → direct to `/codex-setup` |
| Codex CLI error (auth, timeout) | Show error details → suggest `/codex-setup --status` |
| Other error | Show raw error, don't retry silently |

## Step 2: Double-Check

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

For each finding in the Official review output:
1. **Read the actual code** at the file/line Codex mentions
2. **Classify**: Agree / Disagree / Nuance — with evidence
3. If Codex mentions a file or function that doesn't exist, flag as false positive

## Step 3: Report

Present to user:
1. Codex findings (verbatim from Official output)
2. Claude's evaluation per finding
3. Agreement level (High / Partial / Disagreement)
4. Additional findings Claude spotted that Codex missed

## Step 4: Save

Save to `${CLAUDE_PLUGIN_DATA}/reviews/review-<YYYYMMDD-HHMMSS>.md` using format from evaluation.md.

## Gotchas

- **Do not auto-fix.** Present findings, wait for user.
- **Preserve Codex output verbatim.** Evaluation comes after.
- **Official handles scope detection, background, retry.** Our job is evaluation only.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/skills/codex-review/SKILL.md
git commit -m "feat(codex-advisor): add codex-review skill wrapping Official

Invokes /codex:review via Skill tool, adds double-check evaluation."
```

---

## Task 5: Create codex-adversarial Skill (Official Wrapper)

**Files:**
- Create: `plugins/codex-advisor/skills/codex-adversarial/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: codex-adversarial
description: "Run Codex adversarial review with Claude's double-check. Actively tries to break confidence in the change. Use when the user asks \"adversarial review\", \"적대적 리뷰\", \"코드 공격\", wants thorough security/correctness challenge."
argument-hint: "[--uncommitted | --base BRANCH | --commit SHA] [FOCUS_TEXT]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Codex Adversarial Review + Double-Check

Invoke the Official Codex plugin's adversarial review, then apply Claude's critical evaluation. Adversarial review defaults to skepticism — it looks for reasons NOT to ship.

## Step 1: Execute via Official Plugin

Use the Skill tool to invoke `codex:adversarial-review` with the user's arguments:

```
Skill: codex:adversarial-review
Args: $ARGUMENTS
```

### If Skill tool fails:

| Error | Action |
|-------|--------|
| "unknown skill" or "not found" | Official plugin not installed → direct to `/codex-setup` |
| Codex CLI error (auth, timeout) | Show error details → suggest `/codex-setup --status` |
| Other error | Show raw error, don't retry silently |

## Step 2: Double-Check

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

Adversarial findings are intentionally skeptical. For each finding:
1. **Read the actual code** at the file/line mentioned
2. **Verify the attack scenario** — is the failure mode realistic?
3. **Classify**: Agree / Disagree / Nuance
4. Check that file paths and line numbers actually exist — adversarial prompts hallucinate more

Be especially rigorous here. Adversarial review produces more false positives by design.

## Step 3: Report

Present to user:
1. Codex adversarial findings (verbatim)
2. Claude's evaluation per finding, with realistic risk assessment
3. Agreement level
4. Findings that are genuine concerns vs noise

## Step 4: Save

Save to `${CLAUDE_PLUGIN_DATA}/reviews/adversarial-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- **Expect more false positives than regular review.** That's by design.
- **Do not auto-fix.** Present findings, wait for user.
- **Validate every file path.** Adversarial prompts are prone to hallucinating paths.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/skills/codex-adversarial/SKILL.md
git commit -m "feat(codex-advisor): add codex-adversarial skill wrapping Official

Invokes /codex:adversarial-review, adds skeptical double-check evaluation."
```

---

## Task 6: Create codex-rescue Skill (Official Wrapper)

**Files:**
- Create: `plugins/codex-advisor/skills/codex-rescue/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: codex-rescue
description: "Delegate an implementation task to Codex via Official plugin, then Claude reviews the result. Use when the user asks \"codex rescue\", \"codex 위임\", \"코덱스한테 시켜\", \"codex fix\", wants Codex to implement, investigate, or fix something."
argument-hint: "task description [--background] [--write] [--model MODEL] [--effort LEVEL]"
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Codex Task Delegation + Double-Check

Hand off a task to Codex via the Official plugin's rescue command. When Codex finishes, Claude reviews what was done.

## Step 1: Snapshot Before

Record current state so we can diff after Codex runs:

```bash
git diff --stat
git stash list | head -1
```

## Step 2: Execute via Official Plugin

Use the Skill tool to invoke `codex:rescue` with the user's arguments:

```
Skill: codex:rescue
Args: $ARGUMENTS
```

Pass through flags that Official supports: `--background`, `--write`, `--model`, `--effort`, `--resume`, `--resume-last`.

### If Skill tool fails:

| Error | Action |
|-------|--------|
| "unknown skill" or "not found" | Official plugin not installed → direct to `/codex-setup` |
| Codex CLI error (auth, timeout) | Show error details → suggest `/codex-setup --status` |
| Other error | Show raw error, don't retry silently |

## Step 3: Double-Check

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

### If Codex made code changes:

1. **Check what changed**:
```bash
git diff
git diff --stat
```

2. **Review each changed file** — read the actual code
3. **Evaluate**:
   - Are the changes correct?
   - Any bugs introduced?
   - Any files modified that shouldn't have been?
   - Does it actually solve the task?
   - Any unintended side effects?

4. **Report**:
```markdown
## Codex Implementation Review

### Changes Made
<git diff --stat>

### Evaluation
- [file]: [assessment]

### Agreement: <High|Partial|Disagreement>
### Verdict
<appropriate / has issues>
```

### If Codex returned investigation results (read-only):

Apply standard Peer AI Evaluation from evaluation.md.

## Step 4: Save

Save to `${CLAUDE_PLUGIN_DATA}/reviews/rescue-<YYYYMMDD-HHMMSS>.md`.

## Gotchas

- **Do not auto-accept Codex changes.** Review first, present to user.
- **Check for unintended side effects** — Codex might modify files outside scope.
- **If background**, user can check status via `/codex:status` (Official command).
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/skills/codex-rescue/SKILL.md
git commit -m "feat(codex-advisor): add codex-rescue skill wrapping Official

Invokes /codex:rescue, adds implementation review double-check."
```

---

## Task 7: Rewrite codex-verify Skill (Agent-based)

**Files:**
- Create: `plugins/codex-advisor/skills/codex-verify/SKILL.md`

Uses `codex-exec` agent for execution (Official has no verify command).

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: codex-verify
description: "Verify a plan or document using Codex as independent reviewer with Claude's double-check for PASS/FAIL verdict. Use when the user asks \"codex 검수\", \"검수해줘\", \"verify this plan\", \"codex double-check\", \"플랜 검수\"."
argument-hint: "path/to/document.md"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Write", "Agent"]
---

# Codex Document Verification + Double-Check

Use Codex as an independent reviewer to verify plans, specs, and documents. Codex reviews via the codex-exec agent, Claude evaluates, produces a PASS/FAIL verdict.

For code review, use `/codex-review`. For research, use `/codex-research`.

## Step 1: Determine Input

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| Path to a file | Read file content |
| (no args) | Ask user: "What document should I verify?" |

## Step 2: Build Verification Prompt

Read `${CLAUDE_PLUGIN_ROOT}/references/gpt-prompting.md` for XML tag structure.

Write the verification prompt to `${CLAUDE_PLUGIN_DATA}/tmp/codex-verify-prompt.txt`:

```
<task>
You are a brutally honest technical reviewer. Review the following document for material issues that would cause implementation failure.
Focus areas:
- Logical gaps and unstated assumptions
- Missing error handling or edge cases
- Overcomplexity (is there a simpler approach?)
- Feasibility risks (what could go wrong?)
- Missing dependencies or sequencing issues
- Internal contradictions or ambiguous requirements
</task>

<compact_output_contract>
Return a structured verdict:
1. PASS or FAIL (with clear reasons)
2. Blocking issues (P1) — must fix before proceeding
3. Recommendations (P2) — non-blocking improvements
Be direct. No compliments. Just the problems.
</compact_output_contract>

<grounding_rules>
Ground every finding in the document text.
Do not speculate about issues not evidenced in the document.
</grounding_rules>

<completeness_contract>
Review the entire document before finalizing.
Check for interactions between sections that may create contradictions.
</completeness_contract>

<document>
{{DOCUMENT_CONTENT}}
</document>
```

Create directory if needed: `mkdir -p ${CLAUDE_PLUGIN_DATA}/tmp`

## Step 3: Execute via Agent

Dispatch the `codex-exec` agent with the prompt file path:

```
Agent: codex-advisor:codex-exec
Prompt: "Execute codex exec with prompt at ${CLAUDE_PLUGIN_DATA}/tmp/codex-verify-prompt.txt"
```

## Step 4: Double-Check with Verdict

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md` — Peer AI Evaluation and Self-Bias Awareness.

Since Claude may have authored the document, be **extra honest**. For each finding:
- **Valid catch**: "Codex caught this. I missed it during planning."
- **Already considered**: "I considered this — here's why: [reason]"
- **False positive**: "This is a false positive because [evidence]"

### Produce Verdict

```markdown
## Verification Result: PASS / FAIL

### Blocking Issues (P1 — must fix before proceeding)
- [issue]: [why it's blocking]

### Recommendations (P2 — non-blocking)
- [suggestion]: [why it would be better]

### False Positives
- [finding]: [why it's not a real issue]

### Agreement: <High|Partial|Disagreement> (N/M findings)
```

**FAIL** if any P1 issue exists. **PASS** if only P2 or none.

## Step 5: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/verify-<YYYYMMDD-HHMMSS>.md`.

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-verify-prompt.txt
```

## Gotchas

- **Claude has bias reviewing its own work.** Be extra honest.
- **For code review, redirect to `/codex-review`.**
- **PASS doesn't mean perfect.** Always note recommendations.
- **Do not auto-fix.** Present verdict, wait for user.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/skills/codex-verify/SKILL.md
git commit -m "feat(codex-advisor): rewrite codex-verify with agent-based execution

Uses codex-exec agent, adds agreement level, simplified structure."
```

---

## Task 8: Rewrite codex-research Skill (Agent-based)

**Files:**
- Create: `plugins/codex-advisor/skills/codex-research/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: codex-research
description: "Deep-dive research using Codex with Claude's cross-model synthesis. Use when the user asks \"codex research\", \"codex 리서치\", \"codex 분석\", \"코덱스로 조사\", \"딥다이브\", \"이슈 분석해줘\". NOT for code review or plan verification."
argument-hint: "topic or question | path/to/document.md"
allowed-tools: ["Bash", "Read", "Grep", "Glob", "Write", "Agent"]
---

# Codex Research + Cross-Model Synthesis

Use Codex for deep-dive research via the codex-exec agent. Claude evaluates, verifies claims, fills gaps, and synthesizes a combined analysis.

## Step 1: Determine Research Task

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| A question or topic | Research directly |
| Path to a file | Read file, use as context |
| (no args) | Ask user: "What should I research?" |

## Step 2: Build Research Prompt

Read `${CLAUDE_PLUGIN_ROOT}/references/gpt-prompting.md` for XML tag structure.

Adapt `<task>` to context:
- Issue investigation → "root cause analysis, reproduction steps"
- Technology comparison → "trade-offs, real-world adoption, gotchas"
- Architecture → "patterns, anti-patterns, scale"
- General → "breadth first, then depth on interesting findings"

Write to `${CLAUDE_PLUGIN_DATA}/tmp/codex-research-prompt.txt`:

```
<task>
You are a technical researcher conducting a deep investigation.
Topic: {{USER_QUESTION_OR_TOPIC}}
{{#if DOCUMENT}}Context document is provided below.{{/if}}
Investigate thoroughly. Use web search if helpful.
Surface non-obvious insights, not just the first answer.
</task>

<compact_output_contract>
Structured analysis with clear sections.
Separate: observed facts, reasoned inferences, open questions.
Identify risks, trade-offs, alternative perspectives.
</compact_output_contract>

<research_mode>
Breadth first, then depth where evidence changes the recommendation.
</research_mode>

<citation_rules>
Cite sources. Prefer primary. Say "I'm not sure" rather than guessing.
</citation_rules>

<grounding_rules>
Ground claims in evidence. Label hypotheses clearly.
</grounding_rules>

{{#if DOCUMENT}}
<context_document>
{{DOCUMENT_CONTENT}}
</context_document>
{{/if}}
```

Create directory if needed: `mkdir -p ${CLAUDE_PLUGIN_DATA}/tmp`

## Step 3: Execute via Agent

Dispatch the `codex-exec` agent:

```
Agent: codex-advisor:codex-exec
Prompt: "Execute codex exec with prompt at ${CLAUDE_PLUGIN_DATA}/tmp/codex-research-prompt.txt"
```

## Step 4: Double-Check & Synthesize

Read `${CLAUDE_PLUGIN_ROOT}/references/evaluation.md`.

1. **Verify claims** — Check facts against own knowledge. Flag fabrications.
2. **Fill gaps** — Add perspectives Codex missed.
3. **Challenge assumptions** — Call out unstated assumptions.
4. **Synthesize** — Combine findings into coherent analysis.

Adapt output format to question:
- Comparison → table
- Pros/cons → list
- Root cause → chain
- Survey → categorized bullets

## Step 5: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>.md`:

```markdown
# Codex Research — <date>

## Topic
<what was investigated>

## Codex Findings
<verbatim>

## Claude's Evaluation & Synthesis
<independent analysis>

## Agreement: <High|Partial|Disagreement>

## Key Takeaways
- <actionable conclusions>
```

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-research-prompt.txt
```

## Gotchas

- **Codex can hallucinate sources and facts.** Verify specific claims.
- **Value is in synthesis.** If Claude reaches same conclusion alone, Codex added nothing.
- **Do not auto-fix.** Present findings, wait for user.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/skills/codex-research/SKILL.md
git commit -m "feat(codex-advisor): rewrite codex-research with agent-based execution

Uses codex-exec agent, adds agreement level, focused on synthesis."
```

---

## Task 9: Delete Old Infrastructure

**Files:**
- Delete: `plugins/codex-advisor/hooks/` (entire directory)
- Delete: `plugins/codex-advisor/references/execution.md`
- Delete: `plugins/codex-advisor/references/adversarial-prompt.md`
- Delete: `plugins/codex-advisor/references/review-output-schema.json`
- Delete: `plugins/codex-advisor/references/stop-review-gate-prompt.md`

Note: Old skill SKILL.md files (codex-review, codex-verify, codex-research) have already been overwritten by Tasks 4, 7, 8.

- [ ] **Step 1: Delete files**

```bash
rm -rf plugins/codex-advisor/hooks
rm -f plugins/codex-advisor/references/execution.md
rm -f plugins/codex-advisor/references/adversarial-prompt.md
rm -f plugins/codex-advisor/references/review-output-schema.json
rm -f plugins/codex-advisor/references/stop-review-gate-prompt.md
```

- [ ] **Step 2: Verify deleted**

```bash
ls plugins/codex-advisor/hooks 2>&1        # Should: No such file or directory
ls plugins/codex-advisor/references/       # Should: only evaluation.md, gpt-prompting.md
```

- [ ] **Step 3: Commit**

```bash
git add plugins/codex-advisor/hooks/hooks.json plugins/codex-advisor/hooks/post-commit.sh plugins/codex-advisor/hooks/stop-review-gate.sh plugins/codex-advisor/hooks/task-completed.sh plugins/codex-advisor/references/execution.md plugins/codex-advisor/references/adversarial-prompt.md plugins/codex-advisor/references/review-output-schema.json plugins/codex-advisor/references/stop-review-gate-prompt.md
git commit -m "refactor(codex-advisor): delete old v3 infrastructure

Remove hooks, shell scripts, and obsolete references.
See Design Decisions in plan for removal rationale."
```

---

## Task 10: Update Plugin Metadata

**Files:**
- Modify: `plugins/codex-advisor/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Update plugin.json**

```json
{
  "name": "codex-advisor",
  "description": "Double-check layer for the Official Codex plugin — wraps every Codex interaction with Claude's independent critical evaluation. Review, adversarial, rescue, verify, research.",
  "author": { "name": "LeeJuOh" },
  "license": "MIT",
  "keywords": ["codex", "double-check", "cross-model", "evaluation", "review", "verification", "research"]
}
```

- [ ] **Step 2: Update marketplace.json codex-advisor entry**

Change version `3.0.0` → `4.0.0` and update description:

```json
{
  "name": "codex-advisor",
  "source": "./plugins/codex-advisor",
  "version": "4.0.0",
  "description": "Double-check layer for the Official Codex plugin — wraps every Codex interaction with Claude's independent critical evaluation. Review, adversarial, rescue, verify, research."
}
```

- [ ] **Step 3: Commit**

```bash
git add plugins/codex-advisor/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore(codex-advisor): bump to v4.0.0, update metadata

Breaking: Official plugin required, hooks removed, architecture changed."
```

---

## Task 11: Rewrite README

**Files:**
- Modify: `plugins/codex-advisor/README.md`

- [ ] **Step 1: Write README**

```markdown
# codex-advisor

> Every Codex result gets a second opinion — Claude independently evaluates each finding before you act on it.

## Why

Codex reviews your code and returns findings. But findings include false positives, hallucinated file paths, and missed context. Accepting them uncritically defeats the purpose of a second opinion.

codex-advisor wraps the Official Codex plugin — same review, adversarial, and rescue commands, but every result passes through Claude's independent evaluation. Each finding gets classified as Agreed, Disputed, or Nuanced, backed by evidence from the actual code.

## Quick Start

```shell
# 1. Install Official Codex plugin (required)
/plugin install codex@openai-codex
/codex:setup

# 2. Install codex-advisor
/plugin install codex-advisor@claude-code-zero

# 3. Configure defaults (optional)
/codex-setup --model gpt-5.4-mini --effort high

# 4. Use
/codex-review                          # review + double-check
/codex-verify docs/plan.md            # verify + PASS/FAIL
```

## Commands

| Command | Wraps | Description |
|---------|-------|-------------|
| `/codex-setup` | `/codex:setup` | Preflight check + model/effort config via config.toml |
| `/codex-review` | `/codex:review` | Code review + double-check |
| `/codex-adversarial` | `/codex:adversarial-review` | Adversarial review + skeptical evaluation |
| `/codex-rescue` | `/codex:rescue` | Task delegation + implementation review |
| `/codex-verify` | — | Document/plan verification, PASS/FAIL verdict |
| `/codex-research` | — | Deep-dive research, cross-model synthesis |

## How It Works

```
You → codex-advisor skill → Official plugin executes → Codex result
                                                          ↓
                                              Claude double-check
                                                          ↓
                                              Evaluated result → You
```

- **review, adversarial, rescue**: invoke Official plugin commands, then evaluate
- **verify, research**: run `codex exec` via dedicated agent (Official doesn't have these), then evaluate

## Prerequisites

- [Official Codex plugin](https://github.com/openai/codex-plugin-cc) (`codex@openai-codex`) — **required**
- [OpenAI Codex CLI](https://github.com/openai/codex) — installed and authenticated

## Breaking Changes from v3

- **Official Codex plugin is now required.** v3 called `codex` CLI directly; v4 wraps Official plugin commands.
- **Hooks removed.** Post-commit review suggestion, task-completed verification, stop-review-gate — all removed. Official plugin provides its own review gate (`/codex:setup --enable-review-gate`).
- **Config system changed.** v3 used `${CLAUDE_PLUGIN_DATA}/config.json`; v4 manages `~/.codex/config.toml` via `/codex-setup`.
- **New commands.** `/codex-adversarial` and `/codex-rescue` are new. v3's adversarial mode was part of `/codex-review`.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add plugins/codex-advisor/README.md
git commit -m "docs(codex-advisor): rewrite README for v4 Official wrapper positioning"
```

---

## Task 12: Validate & Clean Up

- [ ] **Step 1: Remove empty directories**

```bash
find plugins/codex-advisor -type d -empty -delete 2>/dev/null
```

- [ ] **Step 2: Verify final structure**

```bash
find plugins/codex-advisor -type f | sort
```

Expected:
```
plugins/codex-advisor/.claude-plugin/plugin.json
plugins/codex-advisor/README.md
plugins/codex-advisor/agents/codex-exec.md
plugins/codex-advisor/references/evaluation.md
plugins/codex-advisor/references/gpt-prompting.md
plugins/codex-advisor/skills/codex-adversarial/SKILL.md
plugins/codex-advisor/skills/codex-rescue/SKILL.md
plugins/codex-advisor/skills/codex-research/SKILL.md
plugins/codex-advisor/skills/codex-review/SKILL.md
plugins/codex-advisor/skills/codex-setup/SKILL.md
plugins/codex-advisor/skills/codex-verify/SKILL.md
```

- [ ] **Step 3: Check references exist**

```bash
grep -r 'CLAUDE_PLUGIN_ROOT' plugins/codex-advisor/skills/ | grep -oP 'references/\S+' | sort -u
```

Expected: `references/evaluation.md` and `references/gpt-prompting.md` — both exist.

- [ ] **Step 4: Run plugin validation**

```bash
unset CLAUDECODE && claude plugin validate .
```

Expected: passes with no errors.

- [ ] **Step 5: Final commit if needed**

```bash
git status plugins/codex-advisor/
# Only commit if there are uncommitted changes
```
