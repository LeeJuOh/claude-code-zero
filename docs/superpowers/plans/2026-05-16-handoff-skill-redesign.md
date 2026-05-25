# PRD: Handoff Skill Redesign

## Problem Statement

현재 `toolbox/skills/handoff` 스킬은 7개 고정 섹션으로 인수인계서를 생성하지만, 실제 사용에서 에이전트가 자체적으로 더 풍부한 구조(Decisions Made, Issues & Solutions, Session Metrics 등)를 추가하고 있다. SKILL.md 지시가 실제 필요를 못 따라가고 있으며, "기존 핸드오프를 업데이트하라"는 지시가 에이전트를 혼란시켜 끼워넣기를 유발한다.

5개 참조 스킬(mattpocock, get-shit-done, gastown, claude-code-tips, arscontexta) 비교분석 결과, 현재 스킬에 결정 기록(Decisions Made), 블로커(Blockers), 아티팩트 중복 방지 원칙, 설정 가능한 저장 경로가 누락되어 있다.

## Solution

handoff 스킬을 범용 인수인계서 생성기로 재설계한다. 핵심 설계 원칙:

1. **증류, 복사 아님** — 세션의 노이즈(삽질, 탈선)를 걸러내고 유효한 컨텍스트만 구조화. 다음 세션이 현재 세션보다 더 나은 컨텍스트로 시작.
2. **아티팩트 있으면 포인터, 없으면 자기완결** — 이미 파일로 존재하는 내용은 경로만 참조.
3. **필수 코어 + 에이전트 재량** — 핵심 섹션은 강제, 상황별 추가 섹션은 에이전트 판단.
4. **Rewrite, update 아님** — 기존 핸드오프를 끼워넣기로 수정하지 않고, 이전 + 현재를 합쳐 처음부터 새로 증류.

## User Stories

1. As a developer ending a session, I want to create a handoff so that the next session can continue my work without re-discovering context.
2. As a developer starting a new session, I want the handoff to have a First Action so that I can begin immediately without reading the entire document.
3. As a developer, I want decisions and their rationale recorded so that the next session doesn't re-debate settled questions.
4. As a developer, I want blockers listed so that the next session knows what must be resolved before proceeding.
5. As a developer, I want failed approaches documented so that the next session doesn't repeat them.
6. As a developer, I want existing artifacts (PRDs, ADRs, plans) referenced by path, not duplicated, so that the handoff stays current and lean.
7. As a developer working on parallel topics, I want handoffs stored per-topic so that they don't collide.
8. As a developer, I want the handoff path configurable per project so that it fits my project's directory convention.
9. As a developer providing a topic name, I want that name used in the filename so that I can find it easily.
10. As a developer not providing a topic name, I want the agent to infer it from session context so that I don't have to think about naming.
11. As a developer continuing the same topic across sessions, I want the old handoff replaced, not accumulated, so that only the latest state exists.
12. As a developer, I want critical constraints emphasized with ⚠️ in the What Didn't Work section so that the next agent doesn't skip them.
13. As a developer, I want optional sections (Infrastructure State, Issues & Solutions) added when relevant so that the handoff adapts to context.
14. As a developer, I want the handoff to mention uncommitted changes so that the next session knows about dirty state.
15. As a developer, I want YAML frontmatter (topic, date) so that the skill can programmatically match handoffs by topic.
16. As a developer, I want the skill to scan existing handoffs before creating a new one so that same-topic continuations reuse the topic name.
17. As a developer first using the skill in a project, I want to be asked for my preferred handoff directory so that the path is remembered for future invocations.

## Implementation Decisions

### Section Structure

**Always-present sections (ordered for immediate resumption):**

| # | Section | Purpose |
|---|---------|---------|
| 1 | Goal | What we're trying to accomplish |
| 2 | First Action | Single most immediate action when resuming — actionable without reading anything else. Include skill recommendation if applicable. |
| 3 | Context | Mental state when pausing — what you were thinking, the plan, the "vibe" |
| 4 | Current Progress | What's done so far. Include uncommitted changes if any. |

**Conditional sections (include only when there's meaningful content — omit if empty):**

| # | Section | Purpose |
|---|---------|---------|
| 5 | Decisions Made | Key decisions + rationale. Prevents re-debate. |
| 6 | What Worked | Successful approaches |
| 7 | What Didn't Work | Failed approaches with ⚠️ emphasis on critical constraints |
| 8 | Blockers | What must be resolved before proceeding (lightweight, no type classification) |
| 9 | Next Steps | Remaining action items after First Action |

**Agent discretion sections (add when relevant):**
- Infrastructure State (running servers, env)
- Issues & Solutions (detailed issue breakdown)
- Session Metrics (tokens, duration)
- Previous vs current session separation
- Any other context-specific sections

### Storage Strategy

- **Path**: Configurable per project via `${CLAUDE_PLUGIN_DATA}/config.json`, keyed by CWD. First invocation in a new project prompts via AskUserQuestion (no default — user must specify). Saved for all subsequent invocations.
- **Filename**: `YYYY-MM-DD-<topic>.md`. Topic from user argument or agent inference. If inference fails, ask via AskUserQuestion.
- **YAML frontmatter**: `topic` and `date` fields. (`date` duplicates filename prefix intentionally for grep-based search convenience.)
- **Existing file handling**: Scan handoff directory (flat only, no recursive) for same-topic files by frontmatter `topic` match. Same date → overwrite in place. Different date → write new file first, then delete old file. Never delete before successful write.
- **Scan scope**: Flat files in configured handoff directory only. Existing nested-directory handoffs (legacy pattern) are not scanned and will naturally phase out as new flat files replace them.

### Key Principles (embedded in SKILL.md instructions)

- Distill, don't copy — filter session noise, keep only useful context
- Reference existing artifacts by path, don't duplicate content
- Rewrite from scratch, never update/append to existing handoff
- First Action must be actionable without reading other sections

### Gotchas

1. **Don't copy session dialogue** — Distill. The handoff should be shorter and more structured than the conversation that produced it.
2. **Don't duplicate artifacts** — If a PRD, ADR, plan, commit, or diff already captures the information, reference it by path. Duplicating creates staleness risk.
3. **Don't update existing handoff** — When a same-topic handoff exists, read it for context, then overwrite (same date) or write-new-then-delete-old (different date). Never insert into or append to an existing document. Never delete before a successful write.
4. **First Action must stand alone** — A fresh agent should be able to execute First Action without reading Goal, Context, or any other section.
5. **Don't include session noise** — Failed experiments, tangential discussions, and corrections belong in What Didn't Work (if they inform the next session) or nowhere. The handoff is a curated brief, not a session log.
6. **Scan before creating** — Always check the handoff directory for existing handoffs. If current work is a continuation of an existing topic, reuse that topic name.
7. **Don't guess the topic** — If `$ARGUMENTS` is empty and session context doesn't clearly suggest a topic, ask the user via AskUserQuestion. Never fall back to generic names like "untitled" or "session".

### Config Schema

```json
{
  "/Users/ljo/Desktop/project/zero-code/claude-code-zero": {
    "handoff_path": "docs/handoff"
  },
  "/Users/ljo/Desktop/project/other-repo": {
    "handoff_path": "handoffs"
  }
}
```

Stored at `${CLAUDE_PLUGIN_DATA}/config.json`, keyed by CWD. On first `/handoff` invocation in an unknown project, prompt via AskUserQuestion for the handoff directory path. No default value — user must specify.

### Frontmatter Schema

```yaml
---
topic: <kebab-case-topic-name>
date: YYYY-MM-DD
---
```

### Arguments

- `$ARGUMENTS`: Optional. Treated as topic name. If provided, used for filename and frontmatter topic. If not provided, agent infers from session context. If inference fails, prompt via AskUserQuestion.
- `argument-hint`: `[topic]`

## Testing Decisions

This is a subjective-output skill (generated markdown quality). Programmatic assertions are limited. Testing approach:

- **Manual eval**: Run `/handoff` in 3 different scenarios (post-coding, post-grill-with-docs, mid-work pause). Compare output quality against current skill's output.
- **Structural assertions**: Verify 4 always-present sections exist. Verify conditional sections appear only when non-empty. Verify YAML frontmatter present. Verify no content duplication from existing artifacts.
- **Gotchas regression**: Intentionally test each gotcha scenario (e.g., existing handoff present → should rewrite not update).

Tests for:
- Section completeness (4 always-present + conditional only when content exists)
- Frontmatter correctness
- Config setup flow (first invocation AskUserQuestion)
- Same-topic detection and replacement
- Artifact reference vs duplication

## Out of Scope

- **SessionStart hook auto-prime** — Deferred. Requires knowing which handoff to read, which is non-trivial with multiple topics.
- **`/handoff-resume` pair skill** — Not needed. The handoff document itself provides context; the `/handoff` skill handles cleanup on next invocation.
- **`/handoff clean` subcommand** — Deferred. Completed-work handoff residue is minor.
- **Machine-readable dual format (JSON)** — gsd's HANDOFF.json approach is overkill for our use case. YAML frontmatter provides sufficient machine-parseability.
- **Blocking constraints with checkboxes/severity** — Lightweight ⚠️ emphasis in What Didn't Work is sufficient. Full checkbox gates are for automated resume systems.
- **Multi-agent handoff** — gastown's agent-to-agent messaging is a different problem domain.

## Further Notes

### Comparison Analysis Sources

This redesign synthesized insights from 5 reference implementations:
- **mattpocock/skills/handoff** — Artifact dedup principle, skill chain pointer model
- **get-shit-done/pause-work** — Decisions Made, Blocking Constraints, dual format, context detection
- **gastown/handoff** — SessionStart hook auto-prime (deferred), mail-based messaging
- **claude-code-tips/handoff** — Baseline simplicity
- **arscontexta methodology** — Cognitive offloading theory, stigmergy, "agent doesn't remember — it reads"

### Skill Category

Category 4 (Business Process & Team Automation), encoded preference type. The skill documents an established handoff workflow rather than teaching novel techniques.

### Migration

The current SKILL.md will be completely rewritten. No backward compatibility needed — the skill has `disable-model-invocation: true` and is manual-only. Existing handoff files in `docs/handoff/` remain valid; they just won't have the new frontmatter until recreated.

### Version

`1.14.2 → 1.15.0` in `marketplace.json` (new features, no breaking interface change — the skill name and invocation pattern remain the same).
