# Autoresearch Ecosystem Analysis

> 9 high-star projects from [awesome-autoresearch](https://github.com/alvinunreal/awesome-autoresearch), cloned and analyzed on 2026-03-27.
> Purpose: extract reusable patterns for our plugin development (skill-creator-pro:auto-optimize, harness-engineer, and future autoresearch-flavored plugins).

## Projects Analyzed

### General-purpose Descendants

| # | Project | Stars | Key Pattern |
|---|---------|------:|-------------|
| 1 | [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) | 5,687 | Orchestrator + 87 Domain Skills, 2-loop (inner optimization + outer synthesis) |
| 2 | [HKUDS/ClawTeam](https://github.com/HKUDS/ClawTeam) | 3,770 | CLI-based Agent Swarm, Leader-Worker topology, file-based mailbox |
| 3 | [gepa-ai/gepa](https://github.com/gepa-ai/gepa) | 2,995 | Genetic-Pareto reflective prompt evolution, ICLR 2026 Oral |
| 4 | [davebcn87/pi-autoresearch](https://github.com/davebcn87/pi-autoresearch) | 2,968 | Extension/Skill separation, live dashboard, JSONL state |
| 5 | [uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch) | 2,465 | Single SKILL.md hub, 8-phase autonomous loop protocol |
| 6 | [ShengranHu/ADAS](https://github.com/ShengranHu/ADAS) | 1,546 | Meta-agents invent agent architectures in code, ICLR 2025 |

### Research-agent Systems

| # | Project | Stars | Key Pattern |
|---|---------|------:|-------------|
| 7 | [SakanaAI/AI-Scientist](https://github.com/SakanaAI/AI-Scientist) | 12,760 | Full automatic scientific discovery (idea → experiment → paper → review) |
| 8 | [SamuelSchmidgall/AgentLaboratory](https://github.com/SamuelSchmidgall/AgentLaboratory) | 5,421 | 6 agents (5 specialist + reviewer ensemble), autonomous/co-pilot mode |
| 9 | [HKUDS/AI-Researcher](https://github.com/HKUDS/AI-Researcher) | 4,968 | 7 agents, NeurIPS 2025 Spotlight, Judge Agent 1:1 verification |

Local clones: `references/{AI-Research-SKILLs,ClawTeam,gepa,pi-autoresearch,uditgoenka-autoresearch,ADAS,AI-Scientist,AgentLaboratory,AI-Researcher}/`

---

## Cross-cutting Pattern Analysis

### 1. Self-improvement Loop Structures

| Pattern | Projects | Implementation |
|---------|----------|---------------|
| **Keep-or-Revert** | pi-autoresearch, uditgoenka, AI-Research-SKILLs | Code change → git commit → benchmark → keep if improved, revert otherwise |
| **Reflect-then-Mutate** | GEPA, ADAS | LLM reads execution traces, diagnoses "why it failed", proposes improvement |
| **Generate-then-Select** | AI-Researcher, ADAS | Generate N candidates → evaluate → select best |
| **Ensemble Review** | AI-Scientist, AgentLaboratory | Multiple independent reviews → meta-reviewer aggregation |
| **Inner/Outer Loop** | AI-Research-SKILLs | Inner (fast experiment iteration) + Outer (periodic reflection/synthesis/pivot) |

#### Keep-or-Revert (Karpathy lineage)

The simplest and most widely adopted pattern. Core protocol from uditgoenka:

```
Phase 0: Precondition Check (git state, lock files, hooks)
Phase 1: Review       — git log -20, results.tsv (30s)
Phase 2: Ideate       — strategy selection from git history patterns
Phase 3: Modify       — ONE atomic change (one-sentence test for atomicity)
Phase 4: Commit       — git add + commit BEFORE verification
Phase 5: Verify       — mechanical metric extraction + noise handling
Phase 5.5: Guard      — regression prevention (separate from metric check)
Phase 6: Decide       — keep / discard / crash (git revert preferred over reset)
Phase 7: Log          — TSV: iteration/commit/metric/delta/guard/status/description
Phase 8: Repeat       — unbounded or bounded with summary
```

Key design decisions:
- **Commit before verify**: enables clean `git revert` (preserves failure history for learning)
- **Guard separation**: "did the metric improve?" (Verify) vs "did anything else break?" (Guard)
- **Stuck detection**: 5 consecutive discards → full re-analysis + radical change attempt
- **git revert > git reset --hard**: revert preserves history (learnable), reset deletes it

#### Reflect-then-Mutate (GEPA)

More sophisticated than keep-or-revert. Uses **Actionable Side Information (ASI)** — the textual equivalent of gradients:

```
Select candidate from Pareto front
  → Sample mini-batch from training set
  → Evaluate with trace capture
  → LLM reflects on traces: "why did this fail?"
  → LLM proposes improved instruction
  → Verify on same mini-batch (sum(new) > sum(old)?)
  → If accepted, full validation → update Pareto front
```

Why it works: RL (GRPO) needs 5,000–25,000+ evaluations. GEPA achieves equal or better performance in 100–500 evaluations because reflection provides directional signal, not just scalar reward.

#### Inner/Outer Loop (AI-Research-SKILLs)

```
BOOTSTRAP (once) → INNER LOOP (repeat) ⇄ OUTER LOOP (periodic) → FINALIZE
```

- **Inner Loop**: select highest-priority unverified hypothesis → protocol commit → domain skill execution → sanity check → proxy metric → record
  - Two flavors: **Optimization** (Karpathy-style metric maximization) vs **Discovery** (mechanism verification)
- **Outer Loop**: triggers every 5–10 inner iterations or on pattern/stagnation detection
  - Cluster results → ask WHY → re-survey literature → update `findings.md`
  - Direction decision: **DEEPEN** / **BROADEN** / **PIVOT** / **CONCLUDE**

---

### 2. State Management & Context Survival

| Strategy | Projects | Implementation |
|----------|----------|---------------|
| **Git as Memory** | uditgoenka, pi-autoresearch | git log itself is agent learning memory, structured via commit conventions |
| **JSONL append-only** | pi-autoresearch | Config header + results in one file, survives restarts perfectly |
| **YAML state file** | AI-Research-SKILLs | `research-state.yaml` + `findings.md` for cross-session transfer |
| **Growing Archive** | ADAS, GEPA | Accumulate thought + code + fitness of all prior attempts, provide as full context |
| **Pickle/JSON checkpoint** | AgentLaboratory, AI-Researcher | Agent state serialized, Yes/Resume/No on restart |

#### pi-autoresearch's JSONL Pattern (recommended for our plugins)

```jsonl
{"type":"config","name":"optimize-parser","metric":"parse_time_us","unit":"μs","direction":"lower","branch":"autoresearch/optimize-parser-20260327"}
{"type":"result","iteration":1,"metric":15200,"delta":null,"status":"baseline","commit":"abc123","description":"Initial measurement","asi":{"key":"val"}}
{"type":"result","iteration":2,"metric":14800,"delta":-2.6,"status":"kept","commit":"def456","description":"Simplified tokenizer loop","asi":{"key":"val"}}
```

- Append-only = crash-safe, no corruption risk
- Config header makes file self-describing
- ASI (Actionable Side Information) field preserves learning even after reverts

#### AI-Research-SKILLs' findings.md Pattern

Not a log — a structured narrative that agents read at session start:

```markdown
## Current Understanding
[What we know so far]

## Lessons and Constraints
[What failed and why — prevents repeating mistakes]

## Open Questions
[What to investigate next]
```

---

### 3. Termination Conditions & Guardrails

| Mechanism | Projects | Implementation |
|-----------|----------|---------------|
| **Sentinel strings** | AI-Scientist | Detect "I am done", "ALL_COMPLETED" in LLM output to break loop |
| **Structured output verdict** | AI-Researcher | `"fully_correct": true` JSON output for early termination |
| **Dual limits** | AI-Scientist, uditgoenka | MAX_ITERS (consecutive failures) + MAX_RUNS (total) separated |
| **Confidence scoring** | pi-autoresearch | MAD-based noise floor estimation, ≥2.0x = real improvement |
| **Stuck detection** | uditgoenka | 5 consecutive discards → full re-analysis + radical change |
| **Context exhaustion prediction** | pi-autoresearch | Track tokens per iteration, predict with 1.2x safety margin |
| **Auto-resume with limits** | pi-autoresearch | Agent restart on context limit, max 20 resumes, 5min rate limit |

#### pi-autoresearch's Confidence Scoring (recommended)

```
confidence = |best_improvement| / MAD(all_deltas)
```

- MAD (Median Absolute Deviation) = robust noise floor estimator
- ≥2.0x (green): real improvement above noise
- 1.0–2.0x (yellow): marginal, possibly noise
- <1.0x (red): within noise floor
- Advisory only — never auto-discards based on confidence alone
- Requires ≥3 data points

---

### 4. Architecture Patterns

#### A. Orchestrator + Domain Skill (AI-Research-SKILLs)

The most scalable pattern for plugin ecosystems:

```
autoresearch (orchestrator)
  ├── skill-routing.md (domain → skill mapping)
  ├── agent-continuity.md (persistence mechanism)
  └── invokes domain skills:
       ├── 06-post-training/grpo-rl-training/
       ├── 07-interpretability/saelens-sparse-ae/
       ├── 20-ml-paper-writing/
       └── ... (87 total)
```

Orchestrator never does domain work. "You orchestrate; the domain skills execute."

#### B. Extension + Skill (pi-autoresearch)

Clean separation of domain-agnostic infrastructure from domain knowledge:

- **Extension** (TypeScript, ~2,575 lines): 3 tools (`init_experiment`, `run_experiment`, `log_experiment`) + dashboard + auto-resume. Knows nothing about domains.
- **Skill** (SKILL.md): domain-specific setup, benchmark definitions, loop rules. Interchangeable per use case.

#### C. Single SKILL.md Hub (uditgoenka)

One 31KB SKILL.md routes all 9 subcommands. Detailed protocols in `references/`:

```
SKILL.md (router + summaries)
  └── references/
       ├── autonomous-loop-protocol.md
       ├── core-principles.md
       ├── debug-workflow.md
       ├── fix-workflow.md
       └── ... (11 files)
```

Token-efficient: only loads the specific protocol file needed per invocation.

#### D. Leader-Worker Swarm (ClawTeam)

```
Leader Agent (LLM using clawteam CLI)
  ├── clawteam spawn worker-1 --worktree --prompt "..."
  ├── clawteam spawn worker-2 --worktree --prompt "..."
  └── clawteam board show → cross-pollination → reassign
```

- Each worker gets isolated git worktree + tmux window + unique identity
- File-based mailbox (atomic writes + flock) for inter-agent messaging
- Dead agent detection + automatic task recovery

#### E. Template Encapsulation (AI-Scientist, ADAS)

Pipeline logic is fixed; domain knowledge is swapped via template files:

```
AI-Scientist: prompt.json + seed_ideas.json + experiment.py + template.tex
ADAS: *_prompt.py (initial archive + meta-prompt + anti-pattern catalog)
```

Adding a new domain = adding template files, not modifying the pipeline.

---

### 5. Key Design Insights by Project

#### AI-Research-SKILLs (5,687 stars)

- **`/loop` integration**: autoresearch sets `/loop 20m` as mandatory first action for long-running sessions
- **"Never stop" autonomy**: agent proceeds without human approval; generates HTML/PDF progress reports for async human review
- **findings.md = project memory**: structured narrative updated every outer loop, read at every session start

#### ClawTeam (3,770 stars)

- **CLI-as-coordination-protocol**: no SDK needed — CLI commands ARE the coordination protocol
- **Cross-agent context injection** (`workspace/context.py`): auto-injects other agents' changes, file overlap warnings, upstream diffs into each worker's prompt
- **TOML templates**: declarative team structure (roles, tasks, prompts) → one-command launch

#### GEPA (2,995 stars)

- **Pareto front diversity preservation**: candidates survive if they excel at ANYTHING (instance-level non-domination)
- **ASI reflection prompt structure**: `<curr_param>` + `<side_info>` (input/output/feedback per example) → LLM extracts domain-specific facts + generalizable strategies
- **Mini-batch acceptance test**: quick verify on subsample before expensive full evaluation
- **gskill pipeline**: auto-discovers agent skills → deploys as SKILL.md (55% → 82% resolve rate on Jinja benchmark)

#### pi-autoresearch (2,968 stars)

- **3-tier dashboard**: widget (always visible) → extension dashboard (Ctrl+X) → fullscreen overlay (Ctrl+Shift+X)
- **`autoresearch.ideas.md` backlog**: park promising ideas not pursued now, prune and execute on resume
- **Auto-revert with protection**: `git checkout -- . && git clean -fd` but session files (jsonl, md, sh) are git-added first
- **`METRIC name=value` stdout convention**: standardized communication between benchmark scripts and agent tools

#### uditgoenka/autoresearch (2,465 stars)

- **"EXECUTE IMMEDIATELY" pattern**: command files start with this directive to prevent Claude from asking unnecessary confirmation questions
- **Composite Metric formulas**: each subcommand defines a domain-specific formula (e.g., security = `(owasp_tested/10)*50 + (stride_tested/6)*30 + min(findings, 20)`)
- **Batch AskUserQuestion**: 3–4 questions bundled in one message, more efficient than one-at-a-time
- **7 universal principles**: Constraint=Enabler, Strategy/Tactics separation, Metrics must be mechanical, Verification must be fast, Iteration cost determines behavior, Git is memory, Honest limits

#### ADAS (1,546 stars)

- **"Code IS architecture"**: agent architectures expressed as executable Python functions, not JSON configs
- **Growing Archive as Context**: entire history of thought + code + fitness provided to meta-agent each generation
- **2-Round Reflexion**: mandatory self-critique immediately after generation (round 1: novelty + bugs, round 2: anti-pattern catalog check)
- **"WRONG Implementation examples"**: 9 explicit anti-patterns in prompt — prevents meta-agent from repeating known mistakes

#### AI-Scientist (12,760 stars)

- **Sentinel string convergence**: "I am done" in reflection loops, "ALL_COMPLETED" in experiment loops — simple but effective
- **Aider delegation**: code edits delegated to Aider (AI coding agent) with `edit_format="diff"`, `use_git=False`
- **Dual retry limits**: MAX_ITERS=4 (consecutive failures, resets on success) + MAX_RUNS=5 (total experiments)
- **2-phase Refinement**: pass 1 (error correction) and pass 2 (deduplication/conciseness) have different directives
- **Auto-citation pipeline**: Semantic Scholar API → LLM decides citation placement → bibtex auto-insertion (up to 20 rounds)

#### AgentLaboratory (5,421 stars)

- **Dialogue Loop**: two agents alternate via `DIALOGUE` command, terminates when one issues completion command (`PLAN`, `SUBMIT_CODE`, `INTERPRETATION`)
- **LLM-as-reward-model**: separate LLM scores outputs 0–1 against the plan (not just correctness, but plan-alignment)
- **History expiration**: large context items (arXiv full text) get TTL, auto-removed after N turns
- **Co-pilot mode toggle**: single boolean flag per subtask — "show result → Y/N → inject feedback"
- **Recursive refinement**: reviewer feedback triggers `perform_research()` recursive call from plan formulation stage

#### AI-Researcher (4,968 stars)

- **Judge Agent 1:1 matching**: enumerates each atomic concept from the idea, verifies 1:1 against implementation code
- **Dual model strategy**: `COMPLETION_MODEL` (expensive) for ML Agent code generation, `CHEEP_MODEL` for analysis/review/survey
- **3-option checkpoint**: Yes (use cache) / Resume (continue from cache) / No (fresh run)
- **Section dependency chain**: methodology → related work → experiments → introduction → conclusion → abstract (each references predecessors)

---

## Applicability to Our Plugins

### Tier 1 — Directly Applicable

| Insight | Source | Target Plugin | Action |
|---------|--------|--------------|--------|
| Pareto front + ASI reflection | GEPA | skill-creator-pro:auto-optimize | Replace single-score mutation with Pareto diversity + trace-based reflection |
| 8-phase loop protocol | uditgoenka | Any autonomous loop skill | Adopt as standard loop template (especially Git-as-Memory, Guard separation, Stuck detection) |
| JSONL + Confidence scoring | pi-autoresearch | skill-creator-pro:auto-optimize | JSONL for eval tracking, MAD-based confidence for noise vs real improvement |
| Inner/Outer loop separation | AI-Research-SKILLs | Long-running research skills | Inner (fast iteration) + Outer (periodic reflection/synthesis) |

### Tier 2 — Design Reference

| Insight | Source | Application |
|---------|--------|-------------|
| Growing Archive + anti-pattern catalog | ADAS | gotchas-driven skill design, cumulative learning across mutations |
| Sentinel strings + 2-phase Refinement | AI-Scientist | Loop termination conditions, purpose-separated review passes |
| Orchestrator + Domain Skill separation | AI-Research-SKILLs | Plugin architecture for complex multi-domain workflows |
| Extension/Skill separation | pi-autoresearch | Reusable tool infrastructure vs swappable domain knowledge |

### Tier 3 — Future Extension Reference

| Insight | Source | When Needed |
|---------|--------|-------------|
| Leader-Worker Swarm + file mailbox | ClawTeam | Multi-agent collaboration scenarios |
| Co-pilot mode boolean toggle | AgentLaboratory | Autonomous/interactive mode switching |
| Judge Agent 1:1 verification | AI-Researcher | Validates harness-engineer's principle-level scoring approach |
| Dual model strategy | AI-Researcher | Cost optimization for sub-agent delegation |
| gskill auto-discovery → SKILL.md deployment | GEPA | Automated skill generation pipeline |

---

## Key File Paths (Local Clones)

### General-purpose Descendants

```
references/AI-Research-SKILLs/
  0-autoresearch-skill/SKILL.md                      # Orchestrator skill
  0-autoresearch-skill/references/                    # Loop protocols, routing, continuity

references/ClawTeam/
  clawteam/team/manager.py                           # Swarm coordination
  clawteam/spawn/prompt.py                           # Worker prompt injection
  clawteam/workspace/context.py                      # Cross-agent context

references/gepa/
  src/gepa/core/engine.py                            # Main optimization loop (GEPAEngine)
  src/gepa/proposer/reflective_mutation/             # Reflect-then-mutate implementation
  src/gepa/strategies/instruction_proposal.py        # ASI reflection prompt
  src/gepa/gskill/                                   # Auto-skill discovery

references/pi-autoresearch/
  extensions/pi-autoresearch/index.ts                # Full Extension (~2,575 lines)
  skills/autoresearch-create/SKILL.md                # Session setup + loop rules
  skills/autoresearch-finalize/SKILL.md              # Branch finalization

references/uditgoenka-autoresearch/
  claude-plugin/skills/autoresearch/SKILL.md         # 31KB hub skill
  claude-plugin/skills/autoresearch/references/      # 11 protocol files

references/ADAS/
  _arc/search.py                                     # Meta Agent Search loop
  _arc/arc_prompt.py                                 # Initial archive + anti-patterns
```

### Research-agent Systems

```
references/AI-Scientist/
  launch_scientist.py                                # Main orchestrator
  ai_scientist/generate_ideas.py                     # Idea generation + novelty check
  ai_scientist/perform_experiments.py                # Aider-based experiment execution
  ai_scientist/perform_review.py                     # Ensemble peer review

references/AgentLaboratory/
  ai_lab_repo.py                                     # Workflow orchestrator
  agents.py                                          # 6 agent classes
  mlesolver.py                                       # Code generate-execute-score loop

references/AI-Researcher/
  research_agent/inno/agents/inno_agent/             # 7 specialist agents
  research_agent/run_infer_plan.py                   # ML Agent ↔ Judge Agent loop
  paper_agent/writing.py                             # Section-sequential paper generation
```
