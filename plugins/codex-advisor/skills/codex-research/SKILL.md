---
name: codex-research
description: "Deep-dive research and analysis using Codex. Use when the user asks \"codex research\", \"codex 리서치\", \"codex 분석\", \"코덱스로 조사\", \"딥다이브\", \"이슈 분석해줘\", wants Codex to investigate a topic, analyze a document, or provide a second opinion on technical questions. NOT for code review (use codex-review) or plan verification (use codex-verify)."
argument-hint: "topic or question | path/to/document.md | resume PROMPT"
---

# Codex Research

Use Codex as a research partner for deep-dive analysis, issue investigation, and technical exploration. Codex investigates independently, then Claude evaluates and synthesizes the findings.

Unlike `/codex-review` (code diffs) or `/codex-verify` (document PASS/FAIL), this skill is open-ended — there's no fixed verdict format. The output is a synthesized analysis combining both models' perspectives.

## Step 0: Setup & Preflight

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Setup, Directory Setup, and Preflight sections.

Check `${CLAUDE_PLUGIN_DATA}/config.json` for saved settings. If missing, run first-time setup.

## Step 1: Determine Research Task

Parse $ARGUMENTS:

| Input | Action |
|-------|--------|
| A question or topic | Research the topic directly |
| Path to a file | Read file, use as research context |
| `resume [PROMPT]` | Resume previous Codex session |
| (no args) | Ask user: "What should I research?" |

## Step 2: Build Research Prompt

Craft a research prompt tailored to the input. The prompt should give Codex clear direction while leaving room for unexpected findings.

```
Write to ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt:

You are a technical researcher conducting a deep investigation.

TASK:
<user's question or topic>

<if document provided>
CONTEXT DOCUMENT:
<document content>
</if>

INSTRUCTIONS:
- Investigate thoroughly. Use web search if helpful.
- Surface non-obvious insights, not just the first answer you find.
- Identify risks, trade-offs, and alternative perspectives.
- Cite sources when possible.
- Be direct about uncertainty — say "I'm not sure" rather than guessing.

Provide a structured analysis with clear sections.
```

Adapt the prompt based on context:
- **Issue investigation**: Focus on root cause analysis, reproduction steps, related issues
- **Technology comparison**: Focus on trade-offs, real-world adoption, gotchas
- **Architecture question**: Focus on patterns, anti-patterns, scale considerations
- **General research**: Focus on breadth first, then depth on interesting findings

## Step 3: Execute

```bash
codex exec "$(cat ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt)" -m <MODEL> -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

Timeout: 300000ms.

### Session Resume

```bash
codex exec resume --last "[follow-up prompt]" -s read-only -c 'model_reasoning_effort="<REASONING>"' --enable web_search_cached 2>${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

## Step 4: Evaluate & Synthesize

Read `${CLAUDE_PLUGIN_ROOT}/references/execution.md` — Peer AI Evaluation section.

This is NOT a rubber-stamp. Claude independently evaluates Codex's research:

1. **Verify claims** — Check facts Codex presents against your own knowledge. Flag anything that looks fabricated.
2. **Fill gaps** — Add perspectives or information Codex missed.
3. **Challenge assumptions** — If Codex's analysis rests on an unstated assumption, call it out.
4. **Synthesize** — Combine both models' findings into a coherent analysis for the user.

Present the synthesis conversationally, not as a rigid template. The format should match the nature of the research — a comparison table for tech comparisons, a timeline for incident investigation, bullet points for quick surveys.

## Step 5: Save & Clean Up

Save to `${CLAUDE_PLUGIN_DATA}/reviews/research-<YYYYMMDD-HHMMSS>.md`. Create `${CLAUDE_PLUGIN_DATA}/reviews/` if it doesn't exist.

Format:

```markdown
# Codex Research -- <date>

## Topic
<what was investigated>

## Codex Findings
<Codex's output, preserved verbatim>

## Claude's Evaluation & Synthesis
<Claude's independent analysis, agreements, disagreements, additional findings>

## Key Takeaways
- <actionable conclusions>
```

```bash
rm -f ${CLAUDE_PLUGIN_DATA}/tmp/codex-advisor-prompt.txt ${CLAUDE_PLUGIN_DATA}/tmp/codex-stderr.txt
```

Inform user: "Resume this session with `/codex-research resume [follow-up]`."

## Gotchas

- **Codex can hallucinate sources and facts.** Always verify claims that seem too convenient or specific. If you can't verify, flag it as unverified.
- **Don't just agree with Codex.** The value of this skill is the cross-model synthesis. If you'd reach the same conclusion without Codex, the research added nothing.
- **Adapt the output format to the question.** A comparison table for "X vs Y", a pros/cons list for "should I use X", a root cause chain for "why does X happen". Don't force every research into the same rigid template.
- **web_search_cached gives Codex web access.** It can find recent information that Claude may not have. Leverage this for questions about current ecosystem state.
- **Never `2>/dev/null`.** Capture stderr for error diagnosis.
