---
name: skill-creator-pro
description: >
  Create new skills, modify and improve existing skills, and measure skill performance
  with category-aware design, gotchas-driven development, and progressive disclosure coaching.
  Use when users want to create a skill from scratch, update or optimize an existing skill,
  run evals to test a skill, benchmark skill performance with variance analysis, optimize
  a skill's description for better triggering accuracy, or get guidance on skill architecture
  and design patterns. Also trigger when someone mentions "make a skill", "create a command",
  "skill for X", "improve my skill", "turn this into a skill", or wants to capture a workflow
  as a reusable skill.
---

# Skill Creator Pro

Create, test, measure, and iteratively improve skills using category-aware design, gotchas-driven development, and progressive disclosure coaching.

## How to Use This Skill

The skill creation process has five phases:

1. **Understand** -- Capture intent, identify skill category
2. **Design** -- Draft SKILL.md with gotchas-first approach, structure the folder
3. **Test** -- Run eval prompts, collect baseline + with-skill results
4. **Improve** -- Review feedback, detect patterns, refine
5. **Polish** -- Optimize description, quality gate, package

Figure out where the user is in this process and jump in. Maybe they say "I want to make a skill for X" -- start at phase 1. Maybe they already have a draft -- skip to phase 3. Be flexible.

Pay attention to context cues about the user's technical level. Terms like "evaluation" and "benchmark" are fine for most users, but explain terms like "JSON" or "assertion" briefly if you're unsure. This skill serves people across a wide range of familiarity with coding.

---

## Phase 1: Understand

### Choose Your Entry Path

Most effective skills start small. At Anthropic, "most of ours began as a few lines and a single gotcha, and got better because people kept adding to them as Claude hit new edge cases." Choose the path that fits:

**Path A: Extract** — "Turn this into a skill" / "Make what we just did reusable"

1. Extract from the current conversation: tools used, sequence of steps, corrections made, input/output formats
2. Identify the 1-2 key gotchas that made this workflow non-obvious
3. Write a minimal SKILL.md (instructions + gotchas) — skip ahead to Phase 2
4. Test on the original task first, then expand to variations

**Path B: Greenfield** — "I want to make a skill for X"

Start with one concrete, challenging task. Get Claude to succeed on that single task, then extract the winning approach into a skill. Don't try to design for every scenario upfront — iterate on one task before expanding.

### Capture Intent

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from tests. Skills with subjective outputs (writing style, art direction) often don't. Suggest the appropriate default, but let the user decide.
5. How will we know this skill is working? Use the metrics below to pick what matters most — this feeds directly into eval design in Phase 3.

**Success metrics reference:**

| Type | Metric | How to measure |
|------|--------|----------------|
| Quantitative | Triggers on 90%+ of relevant queries | Run 10-20 test queries, track auto vs manual trigger rate |
| Quantitative | Completes workflow in fewer tool calls | Compare tool call count with-skill vs without-skill |
| Quantitative | 0 failed API/MCP calls per workflow | Monitor MCP server logs for retry rates and error codes |
| Qualitative | Users don't need to prompt about next steps | During testing, note how often you need to redirect or clarify |
| Qualitative | Workflows complete without user correction | Run the same request 3-5 times, compare structural consistency |
| Qualitative | Consistent results across sessions | Can a new user accomplish the task on first try with minimal guidance? |

### Interview and Research

Once intent is captured, proactively dig deeper before writing anything:

- **Edge cases**: What inputs could break this? What happens with empty data, huge files, missing permissions?
- **Input/output formats**: Exact file types, schemas, APIs involved. Ask for example files if available.
- **Dependencies**: What tools, MCPs, or other skills does this need? Check available MCPs -- if useful for research, research in parallel via subagents.
- **Success criteria from question 5**: Turn the user's answer into concrete, testable statements you'll use in Phase 3.

Wait to write test prompts until you've got this part ironed out.

### Identify Approach: Problem-first vs Tool-first

Before choosing a category, clarify the skill's orientation:

- **Problem-first**: "I need to set up a project workspace" -- the skill orchestrates the right tool calls in the right sequence. Users describe outcomes; the skill handles the tools.
- **Tool-first**: "I have Notion MCP connected" -- the skill teaches Claude the optimal workflows and best practices for tools the user already has access to.

Most skills lean one direction. Knowing which helps you choose the right structure and category below.

### Identify Skill Category

Before drafting, identify which of 9 categories the skill fits into. This shapes design choices, testing priorities, and improvement patterns. Read `${CLAUDE_SKILL_DIR}/references/skill-categories.md` for the full guide with templates and category-specific advice.

| # | Category | Signature |
|---|----------|-----------|
| 1 | Library & API Reference | Reference snippets + gotchas list |
| 2 | Product Verification | External tool pairing + programmatic assertions |
| 3 | Data Fetching & Analysis | Credential helpers + dashboard IDs + workflows |
| 4 | Business Process Automation | Simple instructions + log-based consistency |
| 5 | Code Scaffolding & Templates | Composable scripts + natural-language requirements |
| 6 | Code Quality & Review | Deterministic scripts + hooks/CI integration |
| 7 | CI/CD & Deployment | Multi-skill composition + error-rate monitoring |
| 8 | Runbooks | Symptom-to-report investigation flows |
| 9 | Infrastructure Operations | Destructive-action guardrails + confirmation gates |

The best skills fit cleanly into one category. Skills that straddle multiple tend to confuse. If a skill spans categories, consider splitting it.

Also identify the skill type:
- **Capability uplift** -- Teaches Claude novel techniques it doesn't know by default. Needs regression detection (does it still work after model updates?).
- **Encoded preference** -- Documents established workflows. Needs workflow fidelity (does it follow the process correctly?).

---

## Phase 2: Design

### Consult Official Docs (When Needed)

Before writing SKILL.md, check if the skill uses platform features where the official spec is the source of truth:

- **Frontmatter fields** (allowed-tools, context, hooks, disable-model-invocation)
- **Hook events and syntax** (PreToolUse, PostToolUse, SessionStart, etc.)
- **allowed-tools patterns** (command-scoped like `Bash(git *)`, tool restrictions)
- **Plugin manifest** (plugin.json schema, settings.json limitations)

For these, fetch the official docs index and the relevant page:

```
WebFetch https://code.claude.com/docs/llms.txt
```

Then fetch the specific page (e.g., `skills.md`, `hooks.md`, `plugins-reference.md`):

```
WebFetch https://code.claude.com/docs/en/<page>
```

Key pages: `skills.md` (frontmatter spec), `hooks.md` + `hooks-guide.md` (hook events/syntax), `plugins-reference.md` (plugin.json schema), `sub-agents.md` (agent restrictions).

Skip this step when: writing skill body content, designing gotchas, structuring folders, or working on evals -- these don't depend on platform spec.

### Write the SKILL.md

Based on the category and intent, write the SKILL.md. Read `${CLAUDE_SKILL_DIR}/references/design-patterns.md` for detailed guidance -- it covers both **implementation patterns** (sequential workflow, multi-MCP coordination, iterative refinement, context-aware tool selection, domain-specific intelligence) and **writing patterns** (gotchas design, progressive disclosure, hooks, composability).

**Core principles:**

1. **Don't state the obvious.** Claude already knows how to code. If your skill just restates things Claude would do anyway, it's wasting context for zero gain. Focus on information that pushes Claude out of its default patterns -- the `frontend-design` skill works because it teaches aesthetic choices Claude wouldn't make on its own, not basic React patterns.

2. **Gotchas section = highest ROI.** This is the single most impactful thing you can put in a skill. Every gotcha prevents Claude from hitting a failure mode that would waste the user's time. Build it from real failure points -- start with 2-3 based on domain knowledge, then grow it as you test. A good gotcha names the problem AND the fix:

   ```markdown
   ## Gotchas
   - Never use `datetime.now()` in tests -- use dependency injection for time
   - The API returns `snake_case` but the SDK expects `camelCase` -- always transform
   - Batch size > 100 silently drops records without error
   ```

3. **Explain the why.** LLMs are smart -- when you explain reasoning, they generalize beyond the specific case you wrote about. "We validate timestamps because the API silently accepts future dates but the downstream system crashes" is far more powerful than "ALWAYS validate timestamps." If you find yourself writing ALWAYS or NEVER in all caps, that's a yellow flag -- reframe with reasoning.

4. **Give flexibility.** Skills get reused across situations you can't predict. If you over-constrain with rigid step sequences, the skill breaks on anything slightly different from your test cases. Give Claude the information it needs but let it adapt to context.

**Key frontmatter fields:**

| Field | Description |
|-------|-------------|
| `name` | kebab-case, matches folder name |
| `description` | Trigger condition -- see Phase 5 for optimization |
| `argument-hint` | Hint shown during autocomplete (e.g., `[issue-number]`) |
| `allowed-tools` | Restrict tools (e.g., `Read, Grep, Bash(git *)`) |
| `model` | Model override when this skill is active |
| `effort` | Effort level override (`low`, `medium`, `high`) |
| `context` | `fork` to run in isolated subagent |
| `agent` | Subagent type when `context: fork` is set (e.g., `Explore`, `Plan`) |
| `hooks` | On-demand hooks active during skill execution |
| `disable-model-invocation` | `true` = manual-only (user invokes with `/name`) |
| `paths` | YAML list of globs — skill only triggers for matching file paths (e.g., `["src/**/*.ts"]`) |
| `skills` | List of skill names to auto-load when subagents execute this skill |
| `user-invocable` | `false` = hidden from `/` menu, Claude-only background knowledge |
| `shell` | Shell interpreter for inline shell execution blocks: `bash` (default) or `powershell` |

**String substitutions** available in SKILL.md body:

| Variable | Resolves to |
|----------|-------------|
| `$ARGUMENTS` | Text the user typed after the slash command (e.g., `/my-skill fix the login bug` → `fix the login bug`) |
| `$ARGUMENTS[N]` | Nth individual argument (0-indexed). E.g., `/my-skill foo bar` → `$ARGUMENTS[0]` = `foo` |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's folder — use to reference bundled files (`${CLAUDE_SKILL_DIR}/references/api.md`) |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin root directory — use for hook script paths |
| `${CLAUDE_PLUGIN_DATA}` | Persistent data directory that survives plugin upgrades — use for config, logs, databases |
| `${CLAUDE_SESSION_ID}` | Current session ID — use for per-session tracking or logging |

`${CLAUDE_SKILL_DIR}` is the most important for skill authors. Use it whenever your SKILL.md body tells Claude to read a bundled file — it resolves correctly regardless of where the plugin is installed.

### Structure the Folder

A skill is a folder, not just a markdown file. Think of the entire file system as context engineering and progressive disclosure.

**Three levels of context loading:**
- **Level 1** -- YAML frontmatter: Always in context (~100 words). Decides triggering.
- **Level 2** -- SKILL.md body: Loaded when triggered (<500 lines ideal).
- **Level 3** -- Bundled files: Loaded as needed (unlimited).

```
skill-name/
SKILL.md           # Instructions and navigation (required)
scripts/           # Executable code for deterministic tasks
references/        # Docs loaded into context as needed
assets/            # Templates, icons, fonts for output
bin/               # Executables invocable as bare commands from Bash tool
```

**When to use each:**
- `scripts/` -- Helper functions, validation scripts, data fetchers. If during testing all subagents independently write a similar script, bundle it here.
- `references/` -- API docs, detailed specifications. Split by variant for multi-framework support (e.g., `references/aws.md`, `references/gcp.md`).
- `assets/` -- Output templates, image files. If the output is a markdown file, include a template.
- `bin/` -- Standalone executables that the Bash tool can invoke by name without a full path. Useful for CLI wrappers, data processors, or any tool the skill needs to call repeatedly. Must have execute permission and shebang lines.

Reference files from SKILL.md using `${CLAUDE_SKILL_DIR}` with when-to-read guidance:
```markdown
## Additional Resources
- For API details: read `${CLAUDE_SKILL_DIR}/references/api.md`
- For output template: copy `${CLAUDE_SKILL_DIR}/assets/report-template.md`
```

Using `${CLAUDE_SKILL_DIR}` ensures paths resolve correctly regardless of where the plugin is installed. Relative markdown links (`[text](references/api.md)`) also work for Read tool access, but `${CLAUDE_SKILL_DIR}` is more reliable across different invocation contexts.

### Setup Pattern (Optional)

Some skills need user-specific context (Slack channel, API key, project name). Use lazy initialization:

1. Store config in `${CLAUDE_PLUGIN_DATA}/config.json` (persists across upgrades)
2. On first invocation, detect missing config and prompt the user via `AskUserQuestion`
3. Save responses so subsequent invocations skip setup

### On-Demand Hooks (Optional)

Skills can register hooks that activate only during the skill's session. Use these for opinionated guardrails you don't want always-on:

- `/careful` -- Block `rm -rf`, `DROP TABLE`, force-push via PreToolUse matcher
- `/freeze` -- Block Edit/Write outside a specific directory during debugging

Consider adding hooks when the skill touches production data, involves destructive operations, or needs directory boundaries.

**Hook types:** `command` (run a shell script), `prompt` (inject a model prompt), `http` (POST JSON to a URL), or `agent` (spawn a subagent). HTTP hooks are useful for integrations that don't need shell access.

**Conditional filtering:** Hooks support an `if` field using permission rule syntax (e.g., `Bash(git *)`) to narrow when they fire, reducing overhead from process spawning. Compound commands (`ls && git push`) and env-var-prefixed commands (`FOO=bar git push`) are matched correctly since v2.1.89.

**Permission decisions:** PreToolUse hooks can return `allow`, `deny`, or `defer`. The `defer` decision (v2.1.89+) pauses headless sessions at the tool call — useful for human-in-the-loop gates in `-p` pipelines, resumed with `-p --resume`.

**Hook output limit:** Hook output exceeding 50K characters is saved to disk with a file path + preview instead of being injected directly into context. Design hooks to produce concise output; if your hook generates large results (e.g., lint reports), consider writing to a file and returning just the path.

**`preventContinuation:true`:** For prompt-type hooks on non-Stop events, this flag stops the model from continuing after the hook fires (v2.1.92 restored semantics).

**Available events:** `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `SubagentStop`, `StopFailure`, `SessionEnd`, `SubagentStart`, `UserPromptSubmit`, `PreCompact`, `PostCompact`, `Notification`, `PermissionRequest`, `PermissionDenied`, `Setup`, `ConfigChange`, `CwdChanged`, `FileChanged`, `TaskCreated`, `TeammateIdle`, `TaskCompleted`, `InstructionsLoaded`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove`. Verify syntax against official docs (`hooks.md`, `hooks-guide.md`) -- hook events and types evolve across releases.

Notable event: `PermissionDenied` (v2.1.89+) fires after auto mode classifier denials — return `{retry: true}` to let the model retry. Useful for skills that need graceful recovery from permission blocks.

### Memory & Data Persistence (Optional)

For skills that benefit from history (standup posts, recurring reports):
- Use `${CLAUDE_PLUGIN_DATA}` for stable storage that survives upgrades
- Simple: append-only log files, JSON files
- Advanced: SQLite databases
- Reference previous outputs to detect what changed since last run

### Gotchas

- **Don't use other testing skills during Phase 3.** `/skill-test` or similar skills will conflict with this skill's eval workflow. Run evals using the steps in Phase 3 directly.
- **Snapshot before improving.** Always `cp -r` the skill before making changes in Phase 4. Without a snapshot, you can't run a meaningful baseline comparison — the "before" is gone.
- **Kill the eval viewer.** The viewer process stays alive after review. If you forget `kill $VIEWER_PID`, subsequent launches may fail on port conflicts or you'll accumulate zombie processes.
- **Don't over-design upfront.** The biggest time sink is spending 30 minutes on a perfect SKILL.md that turns out to need rewriting after the first eval. Write the minimum, test, then improve.
- **Inline shell may be disabled.** Users can set `disableSkillShellExecution: true` in settings.json (v2.1.91+), which blocks all inline shell execution in skills. If your skill relies on inline shell, document it as a requirement and provide a fallback that uses the Bash tool directly.

---

## Phase 3: Test

### Write Test Cases

After drafting, create 2-3 realistic test prompts -- the kind of thing a real user would actually say. Share with the user for approval before running.

Save to `evals/evals.json`. Don't write assertions yet -- you'll draft them while runs are in progress. See `${CLAUDE_SKILL_DIR}/references/schemas.md` for the full schema.

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's realistic task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

### Run and Evaluate Test Cases

This section is one continuous sequence -- don't stop partway through. Do NOT use `/skill-test` or any other testing skill.

Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Organize by iteration (`iteration-1/`, `iteration-2/`, etc.) with each test case getting a descriptive directory name.

**Step 1: Spawn all runs in the same turn**

For each test case, spawn two subagents simultaneously -- one with the skill, one without. Launch everything at once so it all finishes around the same time.

- **Creating a new skill**: baseline = no skill at all
- **Improving an existing skill**: baseline = the old version (snapshot first with `cp -r`)

Write `eval_metadata.json` for each test case with `eval_id`, `eval_name`, `prompt`, and `assertions` (empty for now).

**Step 2: Draft assertions while runs are in progress**

Don't just wait. Draft quantitative assertions with descriptive names. Good assertions are binary (pass/fail), objectively verifiable, and read clearly in the benchmark viewer. See `${CLAUDE_SKILL_DIR}/references/eval-writing-guide.md` for how to write good assertions.

Subjective skills (writing style, design quality) are better evaluated qualitatively -- don't force assertions onto things that need human judgment.

Update `eval_metadata.json` and `evals/evals.json` with the assertions.

**Step 3: Capture timing data as runs complete**

When each subagent completes, immediately save `total_tokens` and `duration_ms` to `timing.json`. This data comes through task notifications and isn't persisted elsewhere.

**Step 4: Grade, aggregate, and launch the viewer**

1. **Grade each run** -- Spawn grader (read `${CLAUDE_SKILL_DIR}/agents/grader.md`). Save to `grading.json`. The expectations array must use fields `text`, `passed`, and `evidence`. For programmatically checkable assertions, write and run a script rather than eyeballing it.

2. **Aggregate** -- Run from `${CLAUDE_SKILL_DIR}`:
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```

3. **Analyst pass** -- Surface patterns the aggregate stats might hide. See `${CLAUDE_SKILL_DIR}/agents/analyzer.md`.

4. **Launch viewer**:
   ```bash
   nohup python ${CLAUDE_SKILL_DIR}/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   For iteration 2+: add `--previous-workspace <workspace>/iteration-<N-1>`.
   For headless/cowork: use `--static <output_path>` for standalone HTML.

5. Tell the user the results are in their browser and to come back when done reviewing.

**Step 5: Read feedback**

Read `feedback.json`. Empty feedback = user thought it was fine. Focus improvements on specific complaints. Kill the viewer when done: `kill $VIEWER_PID 2>/dev/null`

---

## Phase 4: Improve

### How to Think About Improvements

Read the transcripts, not just final outputs. Then:

1. **Generalize from feedback.** We're creating skills used across many prompts, but iterating on a few examples for speed. Rather than fiddly overfitty changes, understand the underlying principle and fix broadly. If a stubborn issue persists, try different metaphors or patterns -- it's cheap to experiment.

2. **Keep the prompt lean.** Remove instructions not pulling their weight. If the skill makes the model waste time on unproductive steps, cut those parts.

3. **Explain the why.** Frame instructions around reasoning, not commands. "We validate timestamps because the API silently accepts future dates but the downstream system crashes" beats "ALWAYS validate timestamps."

4. **Detect repeated work.** If all subagents independently wrote similar helper scripts, bundle that script in `scripts/`. Write once, reference from SKILL.md.

5. **Consider hooks.** If the model strays outside intended boundaries, add an on-demand hook. Code is deterministic; language interpretation isn't.

6. **Category-specific improvements.** Consult `${CLAUDE_SKILL_DIR}/references/skill-categories.md` for improvement patterns by category.

### The Iteration Loop

1. Apply improvements to the skill
2. Rerun all test cases in a new `iteration-<N+1>/` directory, including baselines
3. Launch viewer with `--previous-workspace` pointing at previous iteration
4. Wait for user review
5. Read feedback, improve again, repeat

Keep going until the user is happy, feedback is all empty, or progress plateaus.

### Blind Comparison (Advanced)

For rigorous A/B comparison, read `${CLAUDE_SKILL_DIR}/agents/comparator.md` and `${CLAUDE_SKILL_DIR}/agents/analyzer.md`. Give two outputs to an independent agent without revealing which is which. Optional -- the human review loop is usually sufficient.

### Autonomous Optimization (Advanced)

If the user wants hands-off optimization instead of the manual review loop above, suggest `/auto-optimize`. It runs the skill dozens of times, scores outputs with binary evals, mutates the prompt, and keeps only improvements -- all autonomously. Best for skills that already work but need to go from 70% to 95%+.

---

## Phase 5: Polish

### Description Optimization

The description field is the primary triggering mechanism. It's not a summary -- it's a trigger condition written for the model. Write it to be slightly "pushy" to combat undertriggering.

**Display cap:** The `/skills` listing truncates descriptions to 250 characters. The full description is still used for triggering, but front-load the most important trigger phrases so they're visible in the menu.

**Step 1: Generate 20 trigger eval queries**

Mix of should-trigger (8-10) and should-not-trigger (8-10). Queries must be realistic with specific details -- file paths, personal context, typos, casual speech. For should-not-trigger, focus on near-misses that share keywords but actually need something different.

**Step 2: Review with user** using `${CLAUDE_SKILL_DIR}/assets/eval_review.html` template.

**Step 3: Run optimization loop** from `${CLAUDE_SKILL_DIR}`:
```bash
python -m scripts.run_loop \
  --eval-set <path-to-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

**Step 4: Apply `best_description`** from the JSON output to the skill's SKILL.md frontmatter.

### Quality Gate

Before packaging, verify:
- [ ] Skill fits cleanly into one category
- [ ] Description includes WHAT and WHEN (trigger conditions)
- [ ] No XML angle brackets (`<` `>`) in frontmatter
- [ ] No bare numbers for `name` or `description` (wrap in quotes: `name: "3000"`)
- [ ] No colons in `description` without quoting (YAML parses `description: Triggers: X, Y` incorrectly — use quotes)
- [ ] No YAML sequence syntax in `argument-hint` (e.g., `[topic: foo | bar]` — use a plain string)
- [ ] Skill name does not contain "claude" or "anthropic" (reserved, will be rejected)
- [ ] No README.md inside the skill folder (all documentation goes in SKILL.md or references/)
- [ ] Gotchas section exists with at least 2-3 entries
- [ ] SKILL.md under 500 lines / 5,000 words (body budget scales to ~2% of context window)
- [ ] Reference files linked with when-to-read guidance
- [ ] Scripts have execute permission and shebang lines
- [ ] Persistent data uses `${CLAUDE_PLUGIN_DATA}`, not skill directory
- [ ] Tested triggering on obvious + paraphrased requests
- [ ] Tested NOT triggering on related-but-different requests
- [ ] `claude plugin validate .` passes (checks frontmatter schema and hooks.json)

### Troubleshooting

For common issues during skill development (doesn't trigger, triggers too often, instructions not followed, large context, frontmatter errors), read `${CLAUDE_SKILL_DIR}/references/troubleshooting-guide.md`.

If `claude plugin validate .` fails or the issue isn't covered in the troubleshooting guide:

1. Fetch `https://code.claude.com/docs/llms.txt` to get the docs index
2. Identify the relevant page (e.g., `skills.md` for frontmatter errors, `hooks.md` for hook failures, `plugins-reference.md` for manifest issues)
3. Fetch that page and compare your skill against the current spec

The bundled references in this skill cover design principles and eval methodology, but **platform spec** (what fields exist, what syntax is valid) lives in the official docs and may have changed since these references were written.

### Package

```bash
python ${CLAUDE_SKILL_DIR}/scripts/package_skill.py <path/to/skill-folder>
```

---

## Reference Files

| File | Purpose |
|------|---------|
| `references/skill-categories.md` | 9 categories with templates, examples, and improvement patterns |
| `references/design-patterns.md` | Gotchas patterns, progressive disclosure, hooks, setup, composability |
| `references/schemas.md` | JSON schemas for evals, grading, benchmark, comparison |
| `references/troubleshooting-guide.md` | 5 symptoms: doesn't trigger, triggers too often, instructions not followed, large context, frontmatter errors |
| `agents/grader.md` | Evaluate assertions against outputs |
| `agents/comparator.md` | Blind A/B comparison between two outputs |
| `agents/analyzer.md` | Analyze benchmark patterns and comparison results |

**Official docs (external):** `https://code.claude.com/docs/llms.txt` → index of all pages. Fetch when working with platform features (frontmatter, hooks, allowed-tools, plugin manifest). Key pages: `skills.md`, `hooks.md`, `hooks-guide.md`, `plugins-reference.md`, `sub-agents.md`.

## Environment Notes

**Cowork / headless:** Use `--static <output_path>` for eval viewer. Feedback downloads as `feedback.json`.

**Claude.ai:** No subagents -- run test cases inline, one at a time. Skip baselines and benchmarking. Focus on qualitative feedback. Description optimization requires `claude` CLI -- skip if unavailable.

## Compatibility

Written and tested against **Claude Code v2.1.92**. Key platform features used: `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_DATA}`, `${CLAUDE_SESSION_ID}`, `effort` frontmatter, `skills` frontmatter, `paths` frontmatter, HTTP hooks, conditional `if` on hooks, `context: fork`, plugin `bin/` executables (v2.1.91+), `PermissionDenied` hook event (v2.1.89+), `defer` hook decision (v2.1.89+), `disableSkillShellExecution` setting (v2.1.91+). If something breaks after a Claude Code update, fetch `https://code.claude.com/docs/llms.txt` and check the relevant page for spec changes.
