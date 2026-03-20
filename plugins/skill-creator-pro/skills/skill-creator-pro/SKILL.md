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

### Capture Intent

Start by understanding the user's intent. If the current conversation already contains a workflow to capture (e.g., "turn this into a skill"), extract context from the conversation history -- tools used, sequence of steps, corrections made, input/output formats observed. The user may need to fill gaps, and should confirm before proceeding.

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation, fixed workflow steps) benefit from tests. Skills with subjective outputs (writing style, art direction) often don't. Suggest the appropriate default, but let the user decide.

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

### Write the SKILL.md

Based on the category and intent, write the SKILL.md. Read `${CLAUDE_SKILL_DIR}/references/design-patterns.md` for detailed guidance.

**Core principles:**

1. **Don't state the obvious.** Claude knows a lot about coding. Focus on information that pushes Claude out of its default patterns. A `frontend-design` skill should focus on aesthetic choices beyond Claude's defaults, not basic React patterns.

2. **Gotchas section = highest ROI.** Build it from common failure points Claude encounters. Start with at least 2-3 gotchas based on domain knowledge. Update as you test.

   ```markdown
   ## Gotchas
   - Never use `datetime.now()` in tests -- use dependency injection for time
   - The API returns `snake_case` but the SDK expects `camelCase` -- always transform
   - Batch size > 100 silently drops records without error
   ```

3. **Explain the why.** LLMs are smart. When given good reasoning, they generalize beyond rote instructions. Instead of "ALWAYS use format X", explain why format X matters. If you find yourself writing ALWAYS or NEVER in all caps, that's a yellow flag -- reframe with reasoning.

4. **Give flexibility.** Skills are reused across many situations. Give Claude the information it needs but let it adapt. Avoid over-constraining with rigid step sequences when the model could make better context-dependent choices.

**Key frontmatter fields:**

| Field | Description |
|-------|-------------|
| `name` | kebab-case, matches folder name |
| `description` | Trigger condition -- see Phase 5 for optimization |
| `allowed-tools` | Restrict tools (e.g., `Read, Grep, Bash(git *)`) |
| `context` | `fork` to run in isolated subagent |
| `hooks` | On-demand hooks active during skill execution |
| `disable-model-invocation` | `true` = manual-only (user invokes with `/name`) |

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
```

**When to use each:**
- `scripts/` -- Helper functions, validation scripts, data fetchers. If during testing all subagents independently write a similar script, bundle it here.
- `references/` -- API docs, detailed specifications. Split by variant for multi-framework support (e.g., `references/aws.md`, `references/gcp.md`).
- `assets/` -- Output templates, image files. If the output is a markdown file, include a template.

Reference files from SKILL.md with when-to-read guidance:
```markdown
## Additional Resources
- For API details: see [references/api.md](references/api.md)
- For output template: copy [assets/report-template.md](assets/report-template.md)
```

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

### Memory & Data Persistence (Optional)

For skills that benefit from history (standup posts, recurring reports):
- Use `${CLAUDE_PLUGIN_DATA}` for stable storage that survives upgrades
- Simple: append-only log files, JSON files
- Advanced: SQLite databases
- Reference previous outputs to detect what changed since last run

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

Don't just wait. Draft quantitative assertions with descriptive names. Good assertions are objectively verifiable and read clearly in the benchmark viewer.

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

---

## Phase 5: Polish

### Description Optimization

The description field is the primary triggering mechanism. It's not a summary -- it's a trigger condition written for the model. Write it to be slightly "pushy" to combat undertriggering.

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
- [ ] Gotchas section exists with at least 2-3 entries
- [ ] SKILL.md under 500 lines
- [ ] Reference files linked with when-to-read guidance
- [ ] Scripts have execute permission and shebang lines
- [ ] Persistent data uses `${CLAUDE_PLUGIN_DATA}`, not skill directory
- [ ] Tested triggering on obvious + paraphrased requests
- [ ] Tested NOT triggering on related-but-different requests

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
| `agents/grader.md` | Evaluate assertions against outputs |
| `agents/comparator.md` | Blind A/B comparison between two outputs |
| `agents/analyzer.md` | Analyze benchmark patterns and comparison results |

## Environment Notes

**Cowork / headless:** Use `--static <output_path>` for eval viewer. Feedback downloads as `feedback.json`.

**Claude.ai:** No subagents -- run test cases inline, one at a time. Skip baselines and benchmarking. Focus on qualitative feedback. Description optimization requires `claude` CLI -- skip if unavailable.
