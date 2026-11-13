# Prompt audit — codex-advisor, worktree-plus, skill-creator-pro (2026-10-14)

> Status: report only. No plugin file was changed. Line numbers refer to commit `615fd1a`; open the line again before you edit.
> Method: `/claude-api prompt-audit` (Steps 0-5). The proposed diffs were not kept in this document. To fix a finding, use its Action column.

## Assumptions (Step 0)

- Scope: the three plugin directories only. User-level config was not read.
- Target model: claude-opus-5-5. This is the model that ran the audit. No file pins a model.
- Text that codex-advisor sends to Codex (GPT models) is for a different provider. It is left as it is.
- Group 2 fixes (stale facts, conflicts) are proposals. Confirm each one before you apply it.
- Verification: every Group 2 finding was checked against the repository (paths, commands, script behavior). No behavioral probe was run for the Group 1 rewrites, because no eval suite exercises them.

## Summary

1. **codex-advisor H1 (high):** `references/companion-usage.md:460-467` still tells the main session to read the cited source and to classify False Positive and Uncited itself. The Verifier subagent design removed this role.
2. **codex-advisor H2 (high):** `references/evaluation.md:196-203` uses `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` in a reference file. Plugin variables are not filled in there (gotchas.md). worktree-plus and skill-creator-pro do not have this problem: they use these variables only in SKILL.md.
3. **skill-creator-pro (high):** README:11 still lists an "MCP server" option, but the newer gate at SKILL.md:49 removed it. SKILL.md:316 also uses prose to make thinking longer. On Opus 5.5, only effort controls thinking.
4. **worktree-plus (high):** SKILL.md:162 and :189 describe behavior that the hook script does not have. The `.worktree.log` claim and the `guessRemote=false` claim are both wrong.
5. **Cross-plugin flag:** the codex-advisor and worktree-plus audits both found the same thing. The `allowed-tools` grant ends at the user's next message, so steps that run after the user confirms are not pre-approved. This needs a live test.

Counts per group (each count includes low-confidence flags):

| Plugin | G1 | G2 | G3 | G4 |
|---|---|---|---|---|
| codex-advisor | 4 | 8 | 0 | 1 |
| skill-creator-pro | 18 | 13 | n/a | 0 |
| worktree-plus | 2 | 7 | n/a | n/a |

G1 = dated prompt text. G2 = stale facts and conflicting instruction files. G3 = tool descriptions. G4 = request config.

When you fix a plugin, bump its version in the same commit.

## codex-advisor

### Assumptions (Step 0)

- **Scope:** `plugins/codex-advisor/` only. Model-facing surface = 10 SKILL.md, `agents/verifier.md`, `references/companion-usage.md`, `references/evaluation.md`, and the text hooks emit. `hooks/hooks.json` not read (settings/hook definition). Scripts read only to check that named commands and flags exist. `README.md` is human-facing: checked for stale facts, not audited as prompt.
- **Target model:** `claude-opus-5-5` (the model running this audit; no file pins a model). `agents/verifier.md` has no `model`/`effort` frontmatter, so it inherits the session's.
- **Codex-bound text is out of target.** The XML blocks sent to Codex (`codex-verify` :116-145, `codex-research` :111-131, `codex-rescue` :115-155, goldens in `evals/golden/`) are read by an OpenAI model. The Claude patterns below do not apply to them; they are listed once as a flag.
- **Docs checked** (downloaded, 2026-10-14): `skills.md`, `sub-agents.md`, `plugins-reference.md`, `hooks.md` from code.claude.com.
- **Verification run on a scratch copy with every proposed hunk applied:** `evals/check-prompt-blocks.py` → `prompt blocks OK`; `node --test hooks/tests/verifier-payload.test.mjs` → 13 pass, 0 fail. The new checker rule fails on the current `companion-usage.md` (2 FAIL lines), so it catches the stale text.

### Inventory (Step 1)

| File | Lines | Role |
|---|---|---|
| skills/codex-review/SKILL.md | 249 | model-invocable skill |
| skills/codex-adversarial/SKILL.md | 342 | model-invocable skill |
| skills/codex-rescue/SKILL.md | 424 | model-invocable skill (+ Codex-bound blocks) |
| skills/codex-verify/SKILL.md | 395 | model-invocable skill (+ Codex-bound heredoc) |
| skills/codex-research/SKILL.md | 386 | model-invocable skill (+ Codex-bound heredoc) |
| skills/codex-setup, -status, -result, -cancel, -transfer /SKILL.md | 105/49/50/26/78 | user-only (`disable-model-invocation: true`) |
| agents/verifier.md | 108 | the one subagent (roster of 1) |
| references/companion-usage.md | 467 | shared reference, read on demand |
| references/evaluation.md | 252 | shared rules: Verifier half + main-session half |
| hooks/verifier-payload.mjs | 146 | PreToolUse(Agent) — rewrites the Verifier prompt; emits deny/allow reasons |
| hooks/session-start.mjs | 55 | silent; emits no model-facing text |
| evals/golden/*.txt, evals/check-prompt-blocks.py, evals/evals.json | — | assert prompt text; included where a hunk touches what they check |

### Summary

The plugin is in good shape: the behavioral prose explains its reasons, pressure language is rare, and the main risks are already enforced in code (whitelisting scripts, a hash-checked payload hook, a prompt-block checker). The findings are mostly **Group 2 drift** left over from the 2026-09-20 move to a fresh Verifier subagent.

Highest impact:
1. **`companion-usage.md` §10 still tells the main session to read cited source and classify False Positive / Uncited itself** (2026-04-09 text). That is the exact role the five skills and `evaluation.md` took away from it in 2026-09. The file is the "full shared gotchas list" every skill points to.
2. **`evaluation.md` gives the save command with `${CLAUDE_PLUGIN_ROOT}`/`${CLAUDE_PLUGIN_DATA}`, but it is a reference file opened with Read**, where Claude Code does not fill those in, and the Bash tool does not have them in its environment. The skills say only "save with `codex-report.sh save … review`" and send the model to that file.
3. **The payload hook strips `model` so the author cannot pick a weaker reviewer, but not the per-call `effort` parameter** the Agent tool now accepts (sub-agents.md:421).

Counts: Group 1 — 3 (1 medium move-to-code with no hunk, 2 medium edits) + 1 low. Group 2 — 5 medium/high edits + 3 flags. Group 3 — 0 (skill and agent descriptions are routing text and fit their job). Group 4 — 1 (hook enforcement gap); sub-agent roster check: 1 agent, no redundancy. Codex-bound text: 1 out-of-target flag.

### Findings (ordered by confidence)

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
|---|---|---|---|---|---|---|
| H1 | references/companion-usage.md:460-467 | "**Read source only AFTER Phase 3 completes.** …" / "**In Phase 4, read only what Codex cited.** … classify as \"False Positive (hallucination)\". … classify as \"Uncited — verification deferred\"." | G2 — instruction files contradict each other | All five skills' Execution Contract forbid "Reading source; judging or re-judging any finding yourself" in Phase 4 (e.g. codex-review:25), and evaluation.md:49-55 says the citation script assigns False Positive / Uncited. Blame: these lines are 52d916a4 (2026-04-09); the Verifier wiring is bcd42f9/f497e55 (2026-09-20), so the skills are newer. The checker's `SELF_JUDGE_PHRASES` scan covers only SKILL.md, which is how this survived. | High | rewrite (proposed only) + add a checker rule over the two references (deterministic-first) |
| H2 | references/evaluation.md:196-203; skills Phase 5: codex-review:220,225 · codex-adversarial:307,313 · codex-rescue:392,401 · codex-verify:362,367 · codex-research:345,351 | "`\"${CLAUDE_PLUGIN_ROOT}/scripts/codex-report.sh\" save \"${CLAUDE_PLUGIN_DATA}\" <type> <<'CODEX_REPORT_END'`" ; skills: "save with `codex-report.sh save … review` using the standard format in `references/evaluation.md`" | G2 — volatile specifics / contradicts `docs/reference/gotchas.md` "Plugin variables in the Bash tool" | plugins-reference.md "Where each variable resolves": variables are filled in only in "Skill, command, and agent content", and "aren't present in the environment of commands Claude runs through the Bash tool". A reference opened with Read is neither. The skills hold the only filled-in copy of the paths, so the command belongs there. | High | rewrite (proposed only): full save command in each skill's Phase 5; evaluation.md points to it |
| M1 | hooks/verifier-payload.mjs:11-12, :130 | "`model` removed (the author must not pick a weaker reviewer), other fields kept" / `const { model: _dropped, ...kept } = toolInput;` | G4 / 1d unenforced instruction — enforce in code | sub-agents.md:421: "When you ask Claude to run a non-fork subagent at a specific effort level, it can also pass an `effort` parameter for that invocation" (v2.1.292+). `effort: "low"` passes through the hook, so the stated guarantee has a gap. | Medium | rewrite code + test (`hooks/tests/verifier-payload.test.mjs`) |
| M2 | skills/codex-verify/SKILL.md:303-304 vs :14-15 | :303 "you never formed an opinion about this document, and this phase keeps it that way" vs :14 "if you drafted the document in this session, a blind payload cannot erase that memory" | G2 — contradiction (same file) | Both lines are f497e55 (2026-09-20). The opening is the accurate one: the session may have drafted the document. The Phase 4 sentence asserts a fact the skill itself says may be false. | Medium | rewrite |
| M3 | codex-review:151 · codex-adversarial:237 · codex-rescue:308 · codex-verify:15 · codex-research:14 · agents/verifier.md:15 | "(ADR 0012)" | G2 — history narrative; gotchas.md "Installed plugin isolation" | `docs/adr/0012-…` is in the repo, not in the plugin, so an installed copy points at a file the model cannot open. Each sentence already states the reason in full. (Code comments in hooks/ and scripts/ are developer-facing; left alone.) | Medium | remove the parenthetical |
| M4 | references/evaluation.md:127-185 (*Reporting*) | "Everything here is counting and transcription." + PASS/FAIL rules 1-5, agreement thresholds (>80% / 50–80% / <50%), id-matching → `contract-violation` | 1b — arithmetic rubric the model must compute; repo rule "Deterministic first" | The main session matches ids, counts, and applies a 5-rule PASS/FAIL table by hand. That is code's job, and a miscount changes a verify verdict. | Medium | move to code. **No hunk:** the verdicts arrive as Agent reply text, so a `codex-task.sh tally` step first needs a way to get them into a file. Needs a design decision. |
| M5 | references/companion-usage.md:258, :295 | "Never blame the user." / "- Blame the user" | 1c/1e — prohibition with no provenance | Prohibits a failure the target model does not show; no reason or incident attached. The neighboring "Never retry silently / swallow errors" have a reason (§6 categorization) and stay. | Medium | remove |
| M6 | skills/codex-rescue/SKILL.md:23 | "**Critical:** do NOT explore the repo before Codex runs." | 1a — pressure language | The reason follows in the same paragraph, and the rule is stated again in the contract table (:34) and Gotchas (:421). The marker adds volume, not information; on current models it pushes toward over-application. | Medium | rewrite to "Do not explore the repo before Codex runs." |
| F1 | references/companion-usage.md:202-204; same claim in codex-review:119-121, codex-adversarial:206-208, companion-usage.md:444-445; asserted by check-prompt-blocks.py:242-243 | "a background command that finishes starts a new turn, and the skill's `allowed-tools` grant clears at a new turn (skills.md)" | G2 — volatile claim vs cited source | skills.md:407/600 says the grant "clears when you send your next message", not at any new turn. Also, Verifier subagents run in the background by default in interactive sessions (sub-agents.md:906-907), so if the claim were true, every Phase 5 `codex-report.sh` call after the Verifiers return would also prompt. Either the claim or Phase 4/5 is wrong. Needs a live test. | Medium | flag — test whether a background-completion turn keeps the grant, then fix the claim or Phase 5 |
| F2 | references/companion-usage.md:342-350 vs codex-review:82-88 (and the other skills' Parsed blocks) | §7: "print exactly one line: `Parsed: … (meta-instructions: \"don't analyze first\")`" vs skill: "`(meta: \"don't analyze first\" obeyed)`" and "apply-codex-config.py output first, Parsed line second" | G2 — two formats for one line | Blame cannot order them (skill lines from 2026-03-23 and 2026-04-14; §7 from 2026-04-09). The skill version is the one the skills use; you decide which format wins. | Medium | flag |
| F3 | codex-verify:172, codex-research:161 | "Remember the literal `RUN_DIR`, `PROMPT_FILE`, and `USER_DOC` paths." | G2 — undefined name | No script prints `USER_DOC=`; it means the document path the user gave. The model can infer it, so the cost is small. | Low | flag |
| F4 | references/companion-usage.md:136 | "This is the single most important thing to understand about the companion." | 1a — inflated emphasis (idiom only) | Reference prose; low impact. | Low | flag |
| F5 | README.md:27-31, :39, :131 | "**What v4.3 does instead:** … Launches long-running reviews in the background … Uses the official `status --wait` wait mechanism" | out of prompt surface (human doc) | Reviews now detach via `codex-task.sh review` + `review-wait`, not `status --wait`. Fix in the README during the Document step. | Low | flag |
| X1 | codex-verify:116-145, codex-research:111-131, codex-rescue:115-155, evals/golden/* | Codex-bound blocks ("You are a brutally honest technical reviewer", "Investigate thoroughly", `<autonomy_policy>`) | out of target (read by Codex, not Claude) | Their source notes are dated 2026-09-11 against OpenAI's guides. Per AGENTS.md, re-check them against `learn.chatgpt.com/docs/llms.txt` in a separate pass. | — | flag |

Keep-list notes: the Execution Contract tables, the hypothesis-exclusion sections, the "Not `fork`" lines and the "follow-up message" rule are load-bearing (their reasons are stated, and `check-prompt-blocks.py` asserts several). The repeated Phase 3/4/5 text across review/adversarial/rescue/verify/research is working redundancy, so no consolidation is proposed. "Launch at most 10 at a time … session cap is 20" matches sub-agents.md:1053.


## skill-creator-pro

### Assumptions (Step 0)

- **Scope:** `plugins/skill-creator-pro/` only. Not prompt surface (skipped): `LICENSE.txt`, `eval-viewer/viewer.html`, `assets/eval_review.html`, `__pycache__`. Scripts were read only to verify commands/flags that SKILL.md names, and to audit the prompt text that `improve_description.py` and `run_eval.py` send to `claude -p` (that text is Claude-bound and in scope). No file outside the plugin was edited; `docs/reference/gotchas.md` was read for conflicts only.
- **Target model:** `claude-opus-5-5` (the model running this audit; no skill, agent, or script pins its own model — the scripts pass the session model through `--model`).
- **Provenance:** the plugin is a fork of `anthropics/skills` → `skills/skill-creator` (compared against `references/anthropics-skills` @ `683bc88`, 2026-10-05). Upstream text: most of `skill-creator-pro/SKILL.md`, all three agents, `schemas.md`, `claude-ai.md`, and every script. Local additions: SKILL.md:49 (primitive gate, 2026-10-08), :145, :169, :310 (2nd half), :333-339, :426-433, and the whole `auto-optimize` skill (adapted from Karpathy's autoresearch). Findings in upstream text would have to be carried as fork patches.
- No non-Anthropic provider markers.

### Summary

The three highest-impact items: (1) SKILL.md:316 steers thinking depth in prose ("your thinking time is not the blocker; take your time and really mull things over") — on Opus 5.5 effort is the only thinking control, so this is dead pressure text; (2) the skill teaches "explain the why, avoid all-caps MUSTs" but its own example (SKILL.md:126 `ALWAYS use this exact template`), its Cowork section (:459, all-caps), and `auto-optimize` (STOP / IMPORTANT / Do NOT ×4) model the opposite register — and models copy examples harder than they follow advice; (3) three stale facts the repository itself contradicts: README:11 still advertises an "MCP server" branch the newer SKILL.md:49 gate dropped, `schemas.md:221` puts benchmark.json under `benchmarks/<timestamp>/` while SKILL.md and `aggregate_benchmark.py` put it in `iteration-N/`, and `improve_description.py:200` says `--verbose` prints "thinking" that no code path produces.

Counts: **Group 1** — 14 high/medium + 4 low flags. **Group 2** — 4 high/medium + 9 low flags. **Group 3** (tool descriptions) — not applicable (no `tools` arrays; both frontmatter descriptions are routing text and read fine). **Group 4** — 0 (the two `claude -p` call sites carry no thinking/sampling/prefill/beta fossils; sub-agent roster grader / comparator / analyzer has no redundant pair).

### Inventory (Step 1)

- `skills/skill-creator-pro/SKILL.md` (495 lines) — main skill, routing description in frontmatter
- `skills/skill-creator-pro/agents/grader.md`, `comparator.md`, `analyzer.md` — sub-agent briefs (read by spawned subagents)
- `skills/skill-creator-pro/references/schemas.md`, `references/claude-ai.md`
- `skills/skill-creator-pro/scripts/improve_description.py` — builds the description-rewrite prompt sent via `claude -p` (L79-142, L164-173)
- `skills/skill-creator-pro/scripts/run_eval.py` — writes a temporary command file into `<project>/.claude/commands/` and runs `claude -p <query>` (L53-78)
- Other scripts (`run_loop.py`, `aggregate_benchmark.py`, `generate_review.py`, `package_skill.py`, `quick_validate.py`, `generate_report.py`, `utils.py`) — read for flag/behavior verification only
- `skills/auto-optimize/SKILL.md` (304 lines), `references/reflection-guide.md`, `references/changelog-template.md`; `scripts/render_dashboard.py` (verification only)
- `README.md`, `.claude-plugin/plugin.json` (descriptions)

All commands and flags named in SKILL.md were verified against argparse: `aggregate_benchmark --skill-name` ✓, `generate_review --skill-name/--benchmark/--previous-workspace/--static` ✓, `run_loop --eval-set/--skill-path/--model/--max-iterations/--verbose` ✓, 60/40 split (`--holdout 0.4`) ✓, 3 runs/query ✓, best-by-test-score (run_loop.py:216-219) ✓. All `${CLAUDE_SKILL_DIR}/…` paths exist.

### Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
|---|---|---|---|---|---|---|
| 1 | `README.md:11` vs `skills/skill-creator-pro/SKILL.md:49` | README: "so you don't write a skill when the need really belongs in CLAUDE.md, a hook, **or an MCP server**." SKILL.md: "Knowledge … belongs in CLAUDE.md; behavior … belongs in a hook … If the honest answer is one of the first two" | G2 — instruction/doc files contradict | `git blame`: SKILL.md:49 is newer (5a67f5e, 2026-10-08) than README:11 (29d2849, 2026-06-03); the gate no longer has an MCP branch, so the README lists a feature the skill does not have (AGENTS.md: README lists exactly the current features). | High | `rewrite` README to match SKILL.md (proposed only) |
| 2 | `references/schemas.md:221` | "Output from Benchmark mode. Located at `benchmarks/<timestamp>/benchmark.json`." | G2 — volatile specifics (stale path) | SKILL.md:239-241 runs `aggregate_benchmark <workspace>/iteration-N` and `aggregate_benchmark.py` defaults output to `<benchmark_dir>/benchmark.json`, i.e. `<workspace>/iteration-N/benchmark.json`. "Benchmark mode" is a mode SKILL.md no longer defines (upstream fossil). | High | `rewrite` (proposed only) |
| 3 | `scripts/improve_description.py:200` | `help="Print thinking to stderr"` | G2 — volatile specifics (stale fact) | The flag prints the current description, score and new description (L216-230); the `claude -p --output-format text` path returns no thinking. Leftover from the removed SDK path (comment at L161). The model reads this when it runs `--help`. | High | `rewrite` (proposed only) |
| 4 | `skills/skill-creator-pro/SKILL.md:316` | "This task is pretty important (we are trying to create billions a year in economic value here!) and your thinking time is not the blocker; take your time and really mull things over." | G1b — prose that steers thinking depth; G1a pressure | On Opus 5.5 thinking is always on and `effort` is the only depth control; prose like this cannot change depth and only adds pressure register. The live part (draft, then reread) is kept. | High | `rewrite` |
| 5 | `skills/skill-creator-pro/SKILL.md:459` | "For whatever reason, the Cowork setup seems to disincline Claude from generating the eval viewer … Sorry in advance but I'm gonna go all caps here: GENERATE THE EVAL VIEWER *BEFORE* evaluating inputs yourself. You want to get them in front of the human ASAP!" | G1a pressure; G1d model-version workaround | Written against an older model's observed skip; current models follow a once-stated instruction and over-apply shouted ones. The rule has a live purpose (human sees outputs before Claude revises), so restate it once with the reason. | Medium | `rewrite` |
| 6 | `skills/skill-creator-pro/SKILL.md:126` | "ALWAYS use this exact template:" (inside the "Defining output formats" example) | G1c example over-indexing; G1a | Examples are the strongest signal; this one teaches the skill author to write the all-caps MUST that the same file calls a "yellow flag" (L143, L312). Skills drafted from it inherit the register. | Medium | `rewrite` |
| 7 | `skills/skill-creator-pro/SKILL.md:173` | "This section is one continuous sequence — don't stop partway through." | G1a — "Do not stop early" | Current models are proactive by default; the real point is *where* the first pause is (after the viewer opens), which the sentence does not say. | Medium | `rewrite` |
| 8 | `skills/skill-creator-pro/SKILL.md:34` | "If you haven't heard (and how could you, it's only very recently that it started), there's a trend now where …" | G1d / G2 time-relative phrasing | Relative to an old training cutoff; "only very recently" is false for later models and implies a phantom earlier state. The audience context it carries is load-bearing — keep that. | Medium | `rewrite` |
| 9 | `skills/skill-creator-pro/SKILL.md:491` | "- Package the final skill and return it to the user." | G1c — duplicated rule that disagrees | L435-437 packages only when the `present_files` tool exists ("If you don't, skip this step"); in Claude Code it never exists, so the recap orders a step the body forbids. Keep-list 10 protects the recap, not the disagreement. | Medium | `rewrite` |
| 10 | `skills/skill-creator-pro/SKILL.md:493` | "Please add steps to your TodoList, if you have such a thing, to make sure you don't forget." | G1a "don't forget"/hedge; G1c strategy coaching | Current models track multi-step work with their task tools unprompted; the line adds nothing legal or measurable. | Medium | `remove` |
| 11 | `skills/auto-optimize/SKILL.md:39` | "**STOP. Do not run any experiments until the fields below are confirmed with the user. Ask for any missing fields before proceeding.**" | G1a — shouted constraint without reason | The gate is real (the loop edits the skill in place and spends paid calls — keep-list 3), but the reason lives only in the frontmatter. State it once, plainly, with the reason. The skill itself lists "ALL CAPS directives" as a bad mutation (L214). | Medium | `rewrite` |
| 12 | `skills/auto-optimize/SKILL.md:62` | "Do NOT skip this. You need to understand both the skill AND what makes skills work before you can improve it." | G1a; G1c "plan before acting" | Step 1 is already the reading step; current models read before editing. | Medium | `remove` |
| 13 | `skills/auto-optimize/SKILL.md:116` | "**IMPORTANT:** Do not proceed to the experiment loop until the user confirms the eval criteria." | G1a — multiple IMPORTANT markers | Second of several shouted gates in one file; markers stop carrying information. Plain statement keeps the gate. | Medium | `rewrite` |
| 14 | `skills/auto-optimize/SKILL.md:171` | "**IMPORTANT:** After establishing baseline, confirm the score with the user before proceeding." | G1a | Same as #13. | Medium | `rewrite` |
| 15 | `agents/comparator.md:64-66` | "2. **Calculate dimension totals**: Content score, Structure score / 3. **Calculate overall score**: Average of dimension scores, scaled to 1-10" | G1b — arithmetic the model must compute | Averages and scaling belong in code; the model owns the 1-5 judgments. No script consumes `comparison.json` (grep), so a one-line `python3 -c` at write time is enough. | Medium | `rewrite` |
| 16 | `agents/grader.md:218-221` | "- **Be objective** … - **Be specific** … - **Be thorough** … - **Be consistent** …" | G1c — padding / generic virtues, duplicated rules | Restate trained defaults; "Be specific" and "Be thorough" repeat Step 3.3 and Steps 1-2. The two real rules ("Explain failures", "No partial credit") stay. | Medium | `remove` |
| 17 | `references/schemas.md:228` | `"executor_model": "claude-sonnet-4-20250514",` | G2 pinned model name; G1c example over-indexing | A previous-generation, date-suffixed ID in the example a model copies when writing benchmark.json by hand (SKILL.md:241 points there); `aggregate_benchmark.py:267` writes the placeholder `"<model-name>"`. | Medium | `rewrite` |
| 18 | `agents/analyzer.md:21-89` | "### Step 1: Read Comparison Result … ### Step 8: Write Analysis Results" | G1c — step choreography for a judgment task | Steps 1-3 restate the inputs list as "read X"; Steps 4-7 enumerate what to judge. The output schema already pins the deliverable; describe the goal and the evidence bar instead. | Medium | `rewrite` |
| 19 | `skills/skill-creator-pro/SKILL.md:69` | "Note: currently Claude has a tendency to "undertrigger" skills … please make the skill descriptions a little bit "pushy"." | G3 trigger text / G1d "currently" | Trigger text may carry calibrated urgency (skills do under-trigger), so no edit; but "currently" dates it, and the plugin already has a trigger eval (`run_loop`) that should set the level instead of a blanket rule. | Low | `flag` |
| 20 | `skills/skill-creator-pro/SKILL.md:173` | "Do NOT use `/skill-test` or any other testing skill." | G2 volatile specifics | No `/skill-test` exists in the repo; it may belong to another environment (installed tool → not contradicted by absence). | Low | `flag` |
| 21 | `skills/skill-creator-pro/SKILL.md:169` | "`claude plugin eval` (Claude Code v2.1.269+)" | G2 version pin | External tool version; cannot be checked from the repo. | Low | `flag` |
| 22 | `SKILL.md:433` vs `improve_description.py:132,155,163`, `quick_validate.py:82` | SKILL.md: "Don't trust a memorized number — fetch the current limit"; scripts hardcode `1024` | G2 | The scripts follow the open Agent Skills spec limit; not contradicted by the repo, but the two files take opposite stances on a hardcoded limit. | Low | `flag` |
| 23 | `scripts/quick_validate.py:42` | `ALLOWED_PROPERTIES = {'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'}` | G2 / deterministic check | Rejects Claude Code-only fields (`disable-model-invocation`, which this plugin's own `auto-optimize` uses; `when_to_use`, `argument-hint`, …). Packaging runs only with `present_files` (Claude.ai), where the open spec applies, so this is probably intended. | Low | `flag` |
| 24 | `references/schemas.md:9` vs `SKILL.md:88`, gotchas "Eval artifacts" | "Located at `evals/evals.json` within the skill directory." / "Never write output, config, or a workspace inside the skill folder" | G2 possible conflict | Test definitions ship with every install of the skill. Whether definitions count as "eval artifacts" is a user decision. | Low | `flag` |
| 25 | `SKILL.md:387` vs gotchas "Persistent data paths" | "Write to a temp file (e.g., `/tmp/eval_review_<skill-name>.html`)" | G2 | gotchas says temp files go in `${CLAUDE_PLUGIN_DATA}`; its stated concern is the user's CWD, which `/tmp` is not. | Low | `flag` |
| 26 | `scripts/run_eval.py:53-68` | writes `<project_root>/.claude/commands/<name>-skill-<id>.md` | gotchas "rather than the CWD (the user's project)" | Needed for `claude -p` discovery and deleted afterwards; out of prompt scope. | Low | `flag` |
| 27 | `skills/auto-optimize/SKILL.md:224-256` | "dropped by 2+ passes … less than 5% absolute … 3 / 5 / 8 consecutive discards" | G1b arithmetic rubric; AGENTS.md deterministic-first | Keep/discard and stuck counters are computable from `results.json`; a script could decide them. Has a judgment escape hatch ("unless the overall gain clearly outweighs"), so not a clean move. | Low | `flag` |
| 28 | `skills/auto-optimize/references/reflection-guide.md:108` | "(models weight earlier content more)" | G1d unverified behavior claim | No source; may be a fossil. | Low | `flag` |
| 29 | `agents/grader.md:101` | "### Step 8: Read Executor Metrics and Timing" (after "Step 7: Write Grading Results") | G1c step order | Data that must be in the output is read after the output is written. Not a documented row; fix by moving it before Step 7. | Low | `flag` |
| 30 | `SKILL.md:449`, `references/claude-ai.md:3` | "In Claude.ai there are no subagents" | G2 platform claim | Cannot be checked from the repo; platform facts like this go stale. | Low | `flag` |
| 31 | `references/schemas.md:41` | "Tracks version progression in Improve mode. Located at workspace root." | G2 | SKILL.md never mentions `history.json` or an "Improve mode" (upstream fossil). | Low | `flag` |

Not a finding: `agents/analyzer.md:7` typo "unblids" (spelling only, upstream).


## worktree-plus

**Scope:** `plugins/worktree-plus/` only. **Target model:** `claude-opus-5-5` (the model running this audit; the skill pins no model).
**Version:** 3.2.2 (marketplace.json). Last SKILL.md edit: 7da7ef1 (2026-10-09).

### 1. Inventory

| File | Lines | Role |
|---|---|---|
| `skills/worktree-setup/SKILL.md` | 190 | Main prompt surface. `disable-model-invocation: true` (user-invoked only, since 41490a5) |
| `hooks/scripts/setup-check.sh` | 153 | SessionStart hook. Emits `additionalContext` to the model (lines 94, 146) |
| `hooks/scripts/worktree-create.sh` | 226 | WorktreeCreate hook. Read to verify SKILL/README claims; stderr text reaches the user |
| `hooks/scripts/worktree-remove.sh` | 114 | WorktreeRemove hook. Read to verify claims |
| `README.md` | 120 | User doc, not loaded into model context. Checked for stale facts only |
| `.claude-plugin/plugin.json` | 7 | Manifest description |
| `hooks/hooks.json` | — | Existence checked only, not read |

Group 3 (tool descriptions): not applicable. Group 4 (request config): not applicable — no API request code.

### Summary

The surface is in good shape: most rules carry their reason, prohibitions are scoped, and the file was corrected twice in September (ebbdffa, 6ad0cdd). The highest-impact findings are two **stale facts the hook code contradicts** — the `.worktree.log` "lists every entry" claim (SKILL.md:162) and "pure HEAD branch creation" when `guessRemote=false` (SKILL.md:189) — and one **command that falls outside the skill's own `allowed-tools`** (`cat` at SKILL.md:86).

Counts: Group 1 — 2 (1 medium, 1 flag). Group 2 — 7 (2 high, 3 medium, 2 low flag). Group 3 — n/a. Group 4 — n/a.

### 2. Findings

| # | Location | Evidence | Pattern | Why obsolete | Confidence | Action |
|---|---|---|---|---|---|---|
| F1 | `skills/worktree-setup/SKILL.md:162` | "the next worktree's `.worktree.log` lists every entry as `copied:`, `linked:`, or `skipped (not found):`." | G2 Volatile specifics (claim the repo contradicts) | `worktree-create.sh:171,180,211` skip silently when the destination already exists (no `else`, no log line), and `:176,185,216` log `FAILED:`. A git-tracked path, or a path in both files (SKILL.md:171 says so itself), gets no line. A user told to check "every entry" will read a missing line as a bug. | High | rewrite (proposed only) |
| F2 | `skills/worktree-setup/SKILL.md:189` | "Setting it explicitly to `false` disables auto-tracking of remote branches — user gets pure HEAD branch creation." | G2 Volatile specifics | `worktree-create.sh:132-137`: with tracking off, the new branch starts from `worktreeplus.baseBranch`, which falls back to `HEAD` only when unset. With `baseBranch=develop`, the claim is wrong. The rest of the bullet repeats the table at SKILL.md:24. | High | rewrite (proposed only) |
| F3 | `skills/worktree-setup/SKILL.md:83-87` | `ls  "${CLAUDE_PLUGIN_DATA}/migrated-envvars"` / `cat "${CLAUDE_PLUGIN_DATA}/migrated-envvars"` | G2 Instruction vs. its own contract (`allowed-tools`, gotchas.md "Skill allowed-tools") | Frontmatter pre-approves `Bash(ls *)` and `Read`, not `cat`, so this step raises a permission prompt the skill did not intend. `Read` alone answers both questions (exists? what's in it?). `${CLAUDE_PLUGIN_DATA}` is fine here: gotchas.md says skill content gets the inline substitution. | Medium | rewrite (proposed only) |
| F4 | `skills/worktree-setup/SKILL.md:28` | "Always start by showing what's active. Run:" | G1a Pressure language / near-duplicate rule | SKILL.md:15 already gives the scoped rule ("If the user's ask is vague… show the current settings first") with a reason. The unconditional "Always" on line 28 competes with it; current models follow it literally, so an include/link request would also open with a settings dump. | Medium | rewrite |
| F5 | `skills/worktree-setup/SKILL.md:188` | "**`--global` writes go to `~/.gitconfig`.** If the user wants truly project-scoped, use `--local` (writes to `.git/config`). Local overrides global." | G2 Verbose SKILL.md explaining what the model knows | General git knowledge; SKILL.md:45 already covers the scope choice the user makes. Also not exact: global config can live at `~/.config/git/config`. | Medium | remove (proposed only) |
| F6 | `skills/worktree-setup/SKILL.md:190` | "**`branchPrefix` is literal (no auto-separator).** Different from the pre-v3 env var which inserted `-` automatically. The migration adds the `-` for you when converting, but fresh writes don't." | G1d Migration-relative phrasing + G2 Time-sensitive duplicate | "Literal" is already stated at SKILL.md:74 (with the ask-the-user rule); the migration `-` rule already lives at SKILL.md:94, its correct home. This bullet restates both as a diff against pre-v3 behavior. | Medium | remove (proposed only) |
| F7 | `skills/worktree-setup/SKILL.md:168-182` and `hooks/scripts/worktree-create.sh:171,180,211` | "Match on the normalized path…", "Check the file ends with a newline before appending.", "If the path already sits in the *other* file, say so…", "test each existing entry against disk" | G1d Unenforced instructions (AGENTS.md "Deterministic first") | Four checkable rules live only in prose: normalize + dedupe, trailing newline, cross-file duplicate, dead entries. A small script (or a hook log line `skipped (exists): X` for the silent skip) would make them deterministic and also remove the root of F1. The fix is code, not prompt text. | Medium | flag (code change, outside this diff) |
| F8 | `skills/worktree-setup/SKILL.md:4` | "…Use when the user asks to set up or configure worktree-plus, view or change worktree settings, reset the plugin config, or decide which gitignored files…" | G2 Trigger text on a skill that cannot be routed | With `disable-model-invocation: true`, the description is "not in context" (official `skills.md` invocation table), so the "Use when…" clause routes nothing. It is harmless and still shows in the `/` menu. Manual-only is deliberate (41490a5), so the decision is yours: keep as menu text, or trim. | Low | flag |
| F9 | `skills/worktree-setup/SKILL.md:107` | "`Write`/`Edit` sit outside this skill's `allowed-tools` on purpose, so a permission prompt fires too" | G2 Volatile specifics | Whether a prompt fires depends on the user's permission mode and `permissions.allow` (gotchas.md: allow is additive; official `skills.md`: "Your permission settings still govern"). Under acceptEdits/auto mode it does not fire. The line already calls it a backstop, so impact is small. | Low | flag |

### Out of scope — noticed, not prompt cruft

- `setup-check.sh:94-95` and `:146-148`: on a first run that both injects hooks and migrates env vars, the script prints **two** JSON objects to stdout. That may break hook-output parsing. Code bug, not prompt text.
- `setup-check.sh:93`: `IFS=', '` joins with the first char only, so the message reads "updated WorktreeCreate,updated WorktreeRemove" (visible in this session's SessionStart context). Cosmetic.
- Official `skills.md`: the `allowed-tools` grant "clears when you send your next message". The skill's confirm-then-write flows (Change a setting: "Ask scope before writing"; include/link: scan → confirm → write) run the write on a later turn, so `git config` there is no longer pre-approved. Worth knowing; no prompt edit needed. gotchas.md does not record this yet.
