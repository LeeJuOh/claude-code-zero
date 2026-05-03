# skill-creator-pro 검수 + 개선안

**날짜**: 2026-05-03
**대상**: `plugins/skill-creator-pro/` v1.8.1
**트리거**: Claude Code 릴리즈 노트 v2.1.113 ~ v2.1.126 분석 요청
**검수 기준**: 플러그인 철학 — "trigger reliably / follow instructions consistently / improve over time"

---

## 1. 검수 범위 + 한계

### 한 것
- 릴리즈 노트 v2.1.113~126 전 항목 1차 매핑
- 공식 `https://code.claude.com/docs/en/skills.md` WebFetch 대조
- 공식 `https://code.claude.com/docs/en/hooks.md` WebFetch 대조
- plugin 파일 grep 기반 사실 오류 스윕
- 다음 plugin 파일 정독:
  - `SKILL.md` (skill-creator-pro)
  - `references/platform-reference.md`
  - `references/design-patterns.md`
  - `references/troubleshooting-guide.md`
  - `references/skill-categories.md`
  - `references/eval-writing-guide.md`

### 아직 안 한 것 (검수 누락 위험)
- 공식 docs **`plugins-reference.md`** 미확인 — plugin.json/marketplace.json 매니페스트 필드. skill-creator-pro가 다른 플러그인 만드는 가이드 → 영향 가능
- 공식 docs **`sub-agents.md`** 미확인 — agent frontmatter (`disallowedTools` 진짜 위치, `permissionMode`)
- 공식 docs **`hooks-guide.md`** 미확인 — hook 설정 상세, `hookSpecificOutput.updatedToolOutput` 정확한 스키마 검증
- 공식 docs **`env-vars.md`** 미확인 — `${CLAUDE_PLUGIN_ROOT/DATA/SKILL_DIR}` 정확성 확인
- plugin 파일 미정독:
  - `references/schemas.md` (eval/grading/benchmark JSON 스키마)
  - `agents/grader.md`, `comparator.md`, `analyzer.md`
  - `scripts/quick_validate.py` ← **frontmatter 검증 로직, 공식 스펙과 안 맞을 가능성 큼** (description 1024 검증 등)
  - `scripts/package_skill.py`, `run_loop.py`, `improve_description.py`
  - `assets/eval_review.html`, `eval-viewer/`
  - `auto-optimize/SKILL.md`

→ 작업 전 위 영역 추가 sweep 권장.

---

## 2. 공식 docs 대비 사실 오류 (기존 plugin)

### 2.1 description / body budget 수치 4건

| 항목 | 현재 | 공식 docs | 위치 |
|---|---|---|---|
| description 길이 | `~1024 chars` | **1,536** (description+`when_to_use` 합산 cap) | `design-patterns.md:562`, `SKILL.md:351`, `SKILL.md:385`(Quality Gate) |
| body budget % | `~2% of context window` | **1%** | `design-patterns.md:564`, `troubleshooting-guide.md:129`, `SKILL.md:385` |
| body budget fallback | `16,000 chars` (200K 환경 ~4K) | **8,000 chars** | 동일 |
| 환경변수 | 미언급 | `SLASH_COMMAND_TOOL_CHAR_BUDGET`로 상향 가능 | 없음 |

**합산 cap 강조 필요**: `when_to_use` 추가하면 budget 늘어나는 것처럼 오해 가능 → 같은 1,536 안에서 분할.

### 2.2 frontmatter 누락 필드

| 필드 | 공식 정의 | 영향 |
|---|---|---|
| `name` 길이 제한 | 64자 max (`platform-reference.md:13` 미언급) | 명령 충실성 |
| `when_to_use` | 트리거 분리용. description과 합산 1,536 cap | 트리거 신뢰성 |
| `arguments` | named positional (`arguments: [issue, branch]` → `$issue`/`$branch`) | 명령 |

### 2.3 frontmatter 부정확 진술

| 위치 | 현재 | 공식 |
|---|---|---|
| `platform-reference.md:13` `name` | "matches folder name" (강제) | "if omitted, uses directory name" (선택) |
| `platform-reference.md:24` `paths` | "YAML list of globs" | comma-separated string **또는** YAML list 둘 다 허용 |
| `platform-reference.md:19` `effort` 옵션 | `low/medium/high` | `low/medium/high/`**`xhigh`**`/`**`max`** |
| `platform-reference.md:43` `${CLAUDE_EFFORT}` 값 | `low/medium/high` | 동일 5종 |

### 2.4 substitution 누락

| 항목 | 공식 정의 |
|---|---|
| `$N` 단축 | `$ARGUMENTS[N]`의 단축형. `$0` = 첫 인자 |
| `$name` named arg | frontmatter `arguments`로 선언한 named positional 참조 |
| Shell-style quoting 동작 | `/skill "hello world" foo` → `$0`=`hello world`, `$1`=`foo` |

### 2.5 hook events 누락 3건

`platform-reference.md:92` Available Events 목록에 빠진 것:
- `UserPromptExpansion` — 슬래시 명령 확장 시
- `PostToolBatch` — 병렬 tool call 배치 완료 시
- `PostToolUseFailure` — tool 실패 후 (`StopFailure`와 별개)

### 2.6 핵심 발견 — Skill content lifecycle 미문서화

공식 `skills.md` "Skill content lifecycle" 섹션:

> Auto-compaction carries invoked skills forward within a token budget. Claude Code re-attaches the most recent invocation of each skill **after the summary, keeping the first 5,000 tokens of each. Re-attached skills share a combined budget of 25,000 tokens.** Older skills can be dropped entirely after compaction if you have invoked many in one session.

**왜 중요**:
- "스킬이 첫 응답 후 영향력 잃은 것 같다" 증상의 진짜 원인
- "follow instructions consistently" 철학 직결
- 워크어라운드: compaction 후 스킬 재호출

**위치 권고**: `design-patterns.md` Progressive Disclosure 섹션 + `troubleshooting-guide.md` Instructions Not Followed 섹션

### 2.7 기타 누락

- `Skill(name)` permission 룰 syntax — `Skill(name)` exact / `Skill(name *)` prefix
- `disable-model-invocation` 효과 보강 — subagent preload 차단 포함
- inject dynamic context (`` !`cmd` ``) `design-patterns` 미명시 (SKILL.md만 부분 언급)

---

## 3. 릴리즈 노트 v2.1.113~126 신규 기능 (채택 결정)

### 3.1 채택 (액션 있음, 철학 정렬)

| 변경 | 출처 | 위치 | 기여 축 |
|---|---|---|---|
| `${CLAUDE_EFFORT}` substitution (값 5종) | v2.1.120 | platform-reference 치환 표 | 명령 |
| Hooks `mcp_tool` 5번째 타입 | v2.1.118 | platform-reference + design-patterns Hook Types | 명령 |
| PostToolUse `updatedToolOutput` 전 도구 | v2.1.121 | platform-reference PostToolUse 섹션 | 명령 |
| PostToolUse 입력 `duration_ms` | v2.1.119 | platform-reference PostToolUse 섹션 | 개선 (측정) |
| OTel `claude_code.skill_activated` + `invocation_trigger` | v2.1.126 | design-patterns Measuring Skills | **개선 — 핵심**. under-trigger 정확 진단 |
| MCP `alwaysLoad` 옵션 | v2.1.121 | design-patterns MCP Server Considerations | 명령 (조건부) |
| 호환성 도장 v2.1.112 → v2.1.126 | — | SKILL.md, platform-reference.md | 정합성 |

### 3.2 제외 (액션 없음 = 트리비아 / skill-creator-pro 범위 밖)

| 변경 | 출처 | 제외 사유 |
|---|---|---|
| 자동압축 직전 스킬 재실행 버그 수정 | v2.1.119 | 버그 수정. 가이드 무영향 |
| `context: fork` deferred tools 사용 가능 수정 | v2.1.126 | 버그 수정. 신규 패턴 아님 |
| `effort` 디폴트 high (Pro/Max + Opus/Sonnet 4.6) | v2.1.117 | 디폴트 변경. 스킬 작성 가이드 무영향 |
| Opus 4.7 1M context 계산 수정 | v2.1.117 | 버그 수정. body budget 표현은 그대로 유효 |
| `claude plugin tag` 릴리즈 태깅 | v2.1.118 | skill-creator-pro 범위 밖 (`docs/release-workflow.md` 영역) |
| `claude plugin prune` | v2.1.121 | 동일, 관리 명령 |
| `claude plugin validate` marketplace.json `$schema` 인식 | v2.1.120 | Quality Gate 통과 그대로 |
| `--dangerously-skip-permissions` `.claude/skills/` 무프롬프트 | v2.1.121, 126 | 개발 편의. 가이드 변경 없음 |
| Plugin `themes/` 디렉터리 | v2.1.118 | skill-creator-pro 범위 밖 |
| `/skills` 타입필터 검색 | v2.1.121 | UX 개선 |
| Read tool 멀웨어-경고 제거 | v2.1.126 | 레거시 모델용 |
| Native build bfs/ugrep | v2.1.117 | 인프라 |

---

## 4. 이전 라운드에서 잘못 추가한 것 (롤백 필요)

내가 첫 라운드 자동 작업 시 추가했으나, 공식 docs 대조 후 시정 필요:

| 항목 | 위치 | 사유 |
|---|---|---|
| `disallowedTools` skill frontmatter 행 | `platform-reference.md:17` | 공식 skill 스키마에 없음. 릴리즈 노트의 `--print + disallowedTools`는 **agent** frontmatter 얘기 (sub-agents) |
| Gotcha "auto-compact 재실행 fixed" | `platform-reference.md:111` | 버그 수정 = 가이드 무영향 |
| Gotcha "context: fork deferred-tool fix" | `platform-reference.md:110` | 동일 |
| Gotcha "Bundled MCP alwaysLoad" | `platform-reference.md:112` | gotcha 형식이 아님 — design-patterns MCP 섹션에 이미 채택됨 |
| `effort` 필드의 Pro/Max 추가 | `platform-reference.md:19` | 트리비아 |
| SKILL.md "Tag a Release" 섹션 | `SKILL.md:411-419` | skill-creator-pro 범위 밖 |
| SKILL.md "Notable platform features" 7항목 리스트 | `SKILL.md:447-455` | 노이즈, 호환성 도장만 남기면 충분 |

---

## 5. 실행 플랜 (콜드 실행 가능)

다음 에이전트가 이 섹션만 보고 바로 실행할 수 있도록 작성. 모든 변경은 **HEAD 베이스라인 기준** (현재 working tree 변경물 reset 후).

### 5.0 실행 워크플로우

순서:

```
1. Baseline reset (1라운드 변경 64줄 폐기)
2. Section 5.1 ~ 5.7 적용
3. Validation
4. Version bump + commit
```

#### Step 1 — Baseline reset

```bash
git checkout -- \
  plugins/skill-creator-pro/skills/skill-creator-pro/SKILL.md \
  plugins/skill-creator-pro/skills/skill-creator-pro/references/design-patterns.md \
  plugins/skill-creator-pro/skills/skill-creator-pro/references/platform-reference.md
```

**이유**: 1라운드 변경 64줄 = 옳은 것 + 잘못 섞임. Reset 후 Section 5에서 옳은 것 + 갭 정정 모두 새로 적용.

**1라운드 잔존 옳은 것** (reset 후 5.1-5.4 통해 모두 재적용됨):
- platform-reference: `mcp_tool` hook type, `${CLAUDE_EFFORT}` substitution, PostToolUse `duration_ms`/`updatedToolOutput` 섹션
- design-patterns: Hook Types `mcp_tool` 5번째, MCP `alwaysLoad` 서브섹션, OTel `skill_activated` 측정 섹션, Description budget 1024→1536 일부 정정
- SKILL.md: Compatibility 도장 v2.1.112→v2.1.126

이것들도 reset되니 5.x 적용 시 빠뜨리지 말 것.

#### Step 2 — Section 5.1 ~ 5.7 적용 (아래)

#### Step 3 — Validation

```bash
unset CLAUDECODE && claude plugin validate plugins/skill-creator-pro
python plugins/skill-creator-pro/skills/skill-creator-pro/scripts/quick_validate.py \
  plugins/skill-creator-pro/skills/skill-creator-pro
```

#### Step 4 — Version bump + commit

`marketplace.json` skill-creator-pro 항목 1.8.1 → 1.8.2. 커밋 메시지 영문 1-2문장:

```
docs(skill-creator-pro): align references with Claude Code v2.1.126 docs

Fix description cap (1,536 combined), body budget (1%/8K),
add Skill content lifecycle (5K/25K), correct skills frontmatter
field as subagent-only, add bundled skill collisions to Quality Gate.
```

---

### 5.1 `references/platform-reference.md` (베이스라인 101줄)

#### 5.1.1 헤더 — 라인 3
```
"Reflects Claude Code v2.1.112" → "Reflects Claude Code v2.1.126"
```

#### 5.1.2 Frontmatter Fields 표 (베이스라인 라인 11-27)

**`name` 행 정정**:
- 베이스라인: `kebab-case, matches folder name. When a plugin declares skills via "skills": ["./"]...`
- 후: `Lowercase letters, numbers, and hyphens only (max 64 chars). If omitted, uses directory name. When a plugin declares skills via "skills": ["./"] in plugin.json, the name field becomes the invocation name (not the directory basename), giving stable identity across install methods.`
- 출처: skills.md frontmatter 표

**`description` 행 정정**:
- 끝에 추가: ` Combined with when_to_use, capped at 1,536 chars in skill listing (skills.md).`

**`when_to_use` 행 신규 추가** (description 다음 행):
```
| `when_to_use` | Additional context for when Claude should invoke. Trigger phrases or example requests. Counts toward the 1,536-char cap (combined with description). (skills.md) |
```

**`argument-hint` 행** 베이스라인 유지

**`arguments` 행 신규 추가** (argument-hint 다음 행):
```
| `arguments` | Named positional arguments for `$name` substitution. Accepts space-separated string or YAML list. Names map to argument positions in order. (skills.md) |
```

**`allowed-tools` 행 정정**:
- 끝에 추가: ` Honored in --print / headless mode since v2.1.119.`

**`disallowedTools` 행** — **베이스라인엔 없음. 추가하지 말 것**. Skill 스키마 부재. 1라운드 잘못.

**`model` 행** 베이스라인 유지

**`effort` 행 정정**:
- 베이스라인: `Effort level override (low, medium, high). Session default is high for API-key, Bedrock, Vertex, Foundry, Team, and Enterprise users — set effort: medium explicitly if your skill needs a lower default.`
- 후: `Effort level override. Options: low, medium, high, xhigh, max. Available levels depend on the model. Default: inherits from session. (skills.md)`
- 1라운드 Pro/Max 트리비아 제거 (재추가 금지)

**`context`, `agent`, `hooks`, `disable-model-invocation` 행** 베이스라인 유지

**`paths` 행 정정**:
- 베이스라인: `YAML list of globs — skill only triggers for matching file paths (e.g., ["src/**/*.ts"])`
- 후: `Glob patterns. Accepts comma-separated string or YAML list. Skill only triggers for matching file paths (e.g., "src/**/*.ts"). (skills.md)`

**`skills` 행 (베이스라인 라인 25)** — **삭제**.
- 이유: 공식 skills.md frontmatter 표에 부재. sub-agents.md:247 — subagent frontmatter 전용 필드.

**`user-invocable`, `shell` 행** 베이스라인 유지

#### 5.1.3 String Substitutions 표 (베이스라인 라인 35-43)

**`$ARGUMENTS`, `$ARGUMENTS[N]` 행** 베이스라인 유지

**`$N` 행 신규 추가** (`$ARGUMENTS[N]` 다음):
```
| `$N` | Shorthand for `$ARGUMENTS[N]`, such as `$0` for the first argument. (skills.md) |
```

**`$name` 행 신규 추가** (`$N` 다음):
```
| `$name` | Named argument declared in the `arguments` frontmatter list. With `arguments: [issue, branch]`, `$issue` expands to the first argument. (skills.md) |
```

**`${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${CLAUDE_SESSION_ID}` 행** 베이스라인 유지

**`${CLAUDE_EFFORT}` 행 신규 추가** (`${CLAUDE_SESSION_ID}` 다음):
```
| `${CLAUDE_EFFORT}` | Current effort level: `low`, `medium`, `high`, `xhigh`, or `max` — added in v2.1.120. Use to gate optional deep-analysis steps based on effort budget (e.g., skip extra eval rounds when `low`). |
```

**표 직후 한 줄 추가**:
```
Indexed arguments use shell-style quoting. Wrap multi-word values in quotes to pass as a single argument. `$ARGUMENTS` always expands to the full argument string as typed. (skills.md)
```

#### 5.1.4 Bash Permission Patterns 섹션 (베이스라인 라인 49-51)

베이스라인 단락 유지. 다음 신규 서브섹션 추가:

```markdown
### Skill Permissions

- `Skill(name)` — exact match
- `Skill(name *)` — prefix match (any arguments)

Use to allow/deny specific skills via permission rules. Source: skills.md "Restrict Claude's skill access".
```

#### 5.1.5 Hook System 섹션

**Hook Types 리스트 (베이스라인 4개) — `mcp_tool` 5번째 추가**:
```
- **`mcp_tool`** — Invoke an MCP tool directly (added in v2.1.118). Skip the shell round-trip when the action is already exposed by an MCP server (e.g., post to Linear, log to a webhook MCP). Specify `tool_name` and `arguments` in the hook entry.
```

**PostToolUse Input/Output 섹션 신규 추가** (Hook Output Limit 섹션 다음):
```markdown
### PostToolUse Input/Output

- `PostToolUse` and `PostToolUseFailure` inputs include `duration_ms` (v2.1.119) — tool execution time excluding permission prompts and PreToolUse hooks. Useful for skills that audit slow tool calls. (hooks.md)
- `hookSpecificOutput.updatedToolOutput` lets a `PostToolUse` hook replace the tool's result for any tool (v2.1.121, previously MCP-only). Use for redaction, normalization, or summarization before the model sees the output. (hooks.md)
```

**Available Events 목록 보강 (베이스라인 라인 89)**:

베이스라인 목록 끝에 추가: `UserPromptExpansion`, `PostToolBatch`, `PostToolUseFailure`. 출처 hooks.md.

#### 5.1.6 Platform Gotchas 섹션 (베이스라인 라인 105-109)

베이스라인 3개 gotcha (Inline shell, /reload-plugins, JS prototype names) 유지.

**추가 금지** (1라운드 잘못, 재추가하지 말 것):
- `context: fork` deferred-tool fix gotcha — 버그 수정, 가이드 무영향
- Auto-compact re-execution fixed gotcha — 버그 수정, 가이드 무영향
- Bundled MCP `alwaysLoad` gotcha — design-patterns MCP 섹션에 옳은 위치로 배치

---

### 5.2 `references/design-patterns.md` (베이스라인 560줄)

#### 5.2.1 Hook Types 섹션 (베이스라인 라인 ~302) — `mcp_tool` 추가

베이스라인 4개 hook type 리스트에 5번째 추가:
```
- **`mcp_tool`** — Invoke an MCP tool directly (added in v2.1.118). Skip the shell round-trip when the action is already exposed by an MCP server (e.g., post a Linear comment, log to a webhook MCP, write to a Notion page). Specify `tool_name` and `arguments` in the hook entry.
```

서브섹션 헤더(`### Hook Types`) 위 텍스트는 5종임 명시:
- 베이스라인 `Four types are available:` → `Five types are available:`

#### 5.2.2 Available Hook Events (베이스라인 라인 ~324) — 보강

기존 목록 끝에 추가: `UserPromptExpansion`, `PostToolBatch`, `PostToolUseFailure`.

#### 5.2.3 MCP Server Considerations 섹션 (베이스라인 라인 ~437) — `alwaysLoad` 신규

기존 섹션 끝에 신규 서브섹션 추가:

````markdown
### `alwaysLoad` Option (v2.1.121)

By default, MCP tools are deferred and surface through `ToolSearch`. Set `"alwaysLoad": true` on a server entry when its tools must be reachable on every turn without a search step — typical for safety checks, mandatory pre-flight queries, or low-tool-count servers tightly bound to the skill's workflow.

```json
{
  "mcpServers": {
    "guardrail-mcp": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/guardrail.js"],
      "alwaysLoad": true
    }
  }
}
```

Use sparingly. Every always-loaded tool consumes startup context budget (~description-length per tool). For servers with many tools, prefer the default deferred behavior.
````

#### 5.2.4 Composing Skills > "Subagent Composition via `skills` Frontmatter" (베이스라인 라인 ~478-491) — **재작성**

**베이스라인 텍스트 (잘못 가이드, 전체 교체)**:
```markdown
### Subagent Composition via `skills` Frontmatter

Use the `skills` frontmatter field to auto-load skills into subagents spawned by your skill:

```yaml
---
name: weekly-recap
skills:
  - jira-query
  - slack-post
---
```

When your skill spawns subagents (via `context: fork` or Task tool), the listed skills are available to those subagents without the user needing to invoke them manually.
```

**전체 교체 — 신규 텍스트**:

````markdown
### Skill ↔ Subagent Composition

Two complementary mechanisms link skills and subagents — pick by which side owns the configuration.

**Mechanism 1: Skill drives the subagent (`context: fork`)**

Add `context: fork` + `agent: <type>` to your SKILL.md. The skill body becomes the prompt for a forked subagent context. Use when a skill needs an isolated context but the workflow lives inside the skill.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---
```

**Mechanism 2: Subagent preloads skills (`skills` field on the SUBAGENT)**

The `skills` frontmatter belongs on a **subagent definition** (`.claude/agents/<name>.md`), NOT on a skill. The full content of each listed skill is injected into the subagent's context at startup. Subagents don't inherit skills from the parent conversation; you must list them explicitly.

```yaml
---
name: api-developer
description: Implements API endpoints
skills:
  - api-conventions
  - error-handling
---
Implement API endpoints. Follow the conventions and patterns from the preloaded skills.
```

You cannot preload skills that set `disable-model-invocation: true`.

Pick mechanism 1 when the skill is the entry point and orchestrates a subagent. Pick mechanism 2 when a custom subagent should always have certain skills loaded. See [sub-agents.md "Preload skills into subagents"](https://code.claude.com/docs/en/sub-agents#preload-skills-into-subagents) for the spec.
````

#### 5.2.5 Measuring Skills 섹션 (베이스라인 라인 ~510) — OTel 보강

베이스라인 PreToolUse hook 로그 예시 다음에 다음 텍스트 추가:

```markdown
**2. OpenTelemetry `claude_code.skill_activated` event (v2.1.126)** — fires on every skill activation and carries `invocation_trigger` (`"user-slash"`, `"claude-proactive"`, or `"nested-skill"`). Aggregate by trigger to spot under-triggering: a skill mostly fired by `user-slash` is probably failing to auto-trigger and needs a description rewrite.

### Detecting Under-triggering

With OTel enabled, query `claude_code.skill_activated` events and group by `invocation_trigger`:
- `user-slash` ratio > ~70% → description fails to auto-trigger; rewrite with more contextual phrasings
- `claude-proactive` healthy mix → auto-triggering works; iterate on output quality instead
- `nested-skill` only → skill is purely a composition target; description optimization is lower priority

Without OTel: review usage logs from the PreToolUse hook above. If a skill is manually invoked (via `/skill-name`) far more often than auto-triggered, run the description optimization loop from Phase 5.
```

#### 5.2.6 Description Length and Body Budget 섹션 (베이스라인 라인 ~560) — 정정

**베이스라인 텍스트**:
```markdown
Keep the description **under ~1024 characters**. The model reads the full string when deciding to invoke, but attention is strongest at the start — front-load trigger phrases (user phrasings, contexts). Long descriptions dilute the trigger signal and gain nothing.

The skill body budget scales to ~2% of the context window. With 1M context, that's ~20K characters; with 200K, ~4K. Keep SKILL.md lean and push detail to reference files.
```

**전체 교체 — 신규**:

```markdown
The combined `description` and `when_to_use` text caps at **1,536 characters** in the skill listing (skills.md). Front-load trigger phrases — attention is strongest at the start. Adding `when_to_use` does not raise the cap; it shares the same 1,536 budget. Long descriptions dilute the trigger signal and gain nothing.

The skill body budget scales to **1% of the context window**, with a fallback of **8,000 characters** (skills.md). Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to raise the limit. Keep SKILL.md lean and push detail to reference files.
```

#### 5.2.7 Progressive Disclosure 섹션 (베이스라인 라인 ~232-272) — Skill content lifecycle 신규

기존 "Three-Level System" 표 다음에 신규 서브섹션 추가:

```markdown
### Skill content lifecycle

Invoked skill content enters the conversation as a single message and stays for the rest of the session. Auto-compaction carries skills forward within a token budget — Claude Code re-attaches the most recent invocation of each skill after the summary, keeping the **first 5,000 tokens** of each. Re-attached skills share a combined budget of **25,000 tokens**. Older skills can be dropped entirely after compaction if many were invoked. (skills.md)

If a skill seems to stop influencing behavior after the first response, the content is usually still present and the model is choosing other tools. Strengthen the description and instructions so the model keeps preferring it, or use hooks to enforce behavior deterministically. If the skill is large or you invoked several others after it, **re-invoke it after compaction** to restore the full content.
```

---

### 5.3 `references/troubleshooting-guide.md` (베이스라인 ~217줄)

#### 5.3.1 Section 4 "Large Context Issues" — 라인 ~129 정정

**베이스라인**: `Description budget scales at 2% of context window (fallback: 16,000 chars)`

**후**:
```
- Description budget scales at **1%** of context window (fallback: **8,000 chars**). Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to raise the limit. (skills.md)
```

#### 5.3.2 Section 3 "Instructions Not Followed" — 신규 3e

기존 3a/3b/3c/3d 다음에 추가:

```markdown
### 3e. Auto-compact 후 영향력 손실

**Symptom:** Skill works initially but loses effect after a long session with many tool calls.

**Cause:** Auto-compaction re-attaches skills with a 5,000-token cap per skill and 25,000-token combined budget. Older invocations get dropped entirely if many skills were invoked. (skills.md)

**Fix:**
- **Re-invoke the skill** after compaction to restore full content
- For long sessions with many skills, prefer **hooks** (deterministic) for invariants instead of skill instructions
- Strengthen the description so the model keeps preferring the skill rather than choosing other tools
```

---

### 5.4 `SKILL.md` (베이스라인 436줄)

#### 5.4.1 Phase 5 "Description Optimization" 정정 (베이스라인 라인 ~351)

**베이스라인 한 단락**:
```
**Front-load trigger phrases.** The model reads the full description when deciding whether to invoke, but attention is strongest at the start — put the core trigger conditions (user phrasings, contexts) in the first sentence. Keep the description under ~1024 characters; longer ones dilute trigger signal and risk platform-side truncation warnings.
```

**후**:
```
**Front-load trigger phrases.** The model reads the full description when deciding whether to invoke, but attention is strongest at the start — put the core trigger conditions (user phrasings, contexts) in the first sentence. The combined `description` + `when_to_use` text caps at **1,536 characters** (skills.md). Adding `when_to_use` does not raise the cap; it shares the same budget.
```

#### 5.4.2 Quality Gate 체크리스트 정정 (베이스라인 라인 ~373-391)

**`Skill name does not collide with built-in slash commands` 항목 보강 (베이스라인 ~382)**:

베이스라인:
```
- [ ] Skill name does not collide with built-in slash commands (`init`, `review`, `security-review`, etc.) — since v2.1.108 the model can invoke built-ins via the Skill tool, and same-name skills will clash
```

후:
```
- [ ] Skill name does not collide with built-in slash commands (`init`, `review`, `security-review`) or bundled skills (`simplify`, `batch`, `debug`, `loop`, `claude-api`) — since v2.1.108 the model can invoke built-ins via the Skill tool, and same-name skills will clash (skills.md)
```

**`SKILL.md under 500 lines` 항목 정정 (베이스라인 ~385)**:

베이스라인:
```
- [ ] SKILL.md under 500 lines / 5,000 words (body budget scales to ~2% of context window)
```

후:
```
- [ ] SKILL.md under 500 lines / 5,000 words (body budget scales to **1%** of context window, fallback **8,000 chars**; `SLASH_COMMAND_TOOL_CHAR_BUDGET` to raise)
```

#### 5.4.3 Compatibility 섹션 정정 (베이스라인 라인 ~431)

**베이스라인**:
```
Written and tested against **Claude Code v2.1.112**. If something breaks after a Claude Code update, check `${CLAUDE_SKILL_DIR}/references/platform-reference.md` and fetch official docs for spec changes.
```

**후**:
```
Written and tested against **Claude Code v2.1.126**. If something breaks after a Claude Code update, check `${CLAUDE_SKILL_DIR}/references/platform-reference.md` and fetch official docs for spec changes.
```

**추가 금지** (1라운드 잘못, 재추가하지 말 것):
- "Tag a Release (Plugin Skills)" 섹션 — 플러그인 관리 영역, skill-creator-pro 범위 밖
- "Notable platform features assumed available in this skill's guidance:" 7항목 리스트 — 노이즈, 호환성 한 줄로 충분

---

### 5.5 `.claude-plugin/marketplace.json`

`skill-creator-pro` 항목의 `version`:
- 1.8.1 → 1.8.2

`description` 변경 없음 (현재 정확).

근거: patch — 문서 정확도 + Claude Code v2.1.126 platform 신규 기능 안내. API/기능 인터페이스 변경 없음.

---

### 5.6 `scripts/quick_validate.py` — description cap (라인 75)

**베이스라인**:
```python
        if len(description) > 1024:
            return False, f"Description too long ({len(description)} chars, max 1024)"
```

**후**:
```python
        if len(description) > 1536:
            return False, f"Description too long ({len(description)} chars, max 1536; combined with when_to_use)"
```

근거: skills.md "combined `description` and `when_to_use` text is truncated at 1,536 characters". Validator는 description 단독 상한으로 사용 (when_to_use까지 합치면 더 빨리 막힘).

---

### 5.7 `scripts/quick_validate.py` — allowed set (라인 46-52)

**베이스라인**:
```python
    allowed = {
        "name", "description", "license", "allowed-tools",
        "metadata", "compatibility", "argument-hint",
        "disable-model-invocation", "user-invocable",
        "model", "context", "agent", "hooks",
        "effort", "paths", "skills", "shell",
    }
```

**후** (`skills` 제거, `when_to_use`/`arguments` 추가):
```python
    allowed = {
        "name", "description", "when_to_use", "arguments",
        "license", "allowed-tools",
        "metadata", "compatibility", "argument-hint",
        "disable-model-invocation", "user-invocable",
        "model", "context", "agent", "hooks",
        "effort", "paths", "shell",
    }
```

근거:
- `skills` 제거 — sub-agents.md:247 subagent frontmatter 전용 필드. skill에 추가 시 작동 안 함, validator catch 필요.
- `when_to_use` 추가 — skills.md frontmatter 표 정식 필드.
- `arguments` 추가 — skills.md frontmatter 표 정식 필드.

---

## 6. 추가 검수 결과 (2차 sweep — 2026-05-03)

플랜 1차 작성 후 사용자 검수 + 추가 sweep으로 발견된 갭 4개 통합.

### 6.1 갭 1 — `scripts/quick_validate.py:75` description cap

**문제**: 검증 로직 `if len(description) > 1024` — 공식 cap **1,536** (description+when_to_use 합산). 1024는 false negative (정상 description도 reject).

**수정**: 1024 → 1536, "(description+when_to_use combined cap; this script checks description alone as upper bound)" 주석.

**위치**: 이 항목을 Section 5에 `5.6` 신규 추가.

### 6.2 갭 2 — `skills` frontmatter 필드는 skill용 아님 (sub-agents.md sweep 결과)

**확정 사실**: 공식 `sub-agents.md` 검증 결과 `skills`는 **subagent frontmatter 전용** 필드. Skill frontmatter 표 (`skills.md`)에 부재.

증거 (sub-agents.md):
- Line 247: subagent supported frontmatter 표에 `skills` 등재
- Line 384: "Use the `skills` field to inject skill content into a subagent's context at startup"
- Line 403: "With `skills` in a subagent, the subagent controls... With `context: fork` in a skill, the skill content is injected into the agent you specify"

두 메커니즘 분리:
- **Skill → agent inject**: skill의 `context: fork` + `agent: X`
- **Agent ← skills preload**: subagent 정의의 `skills: [...]`

**우리 plugin 3곳 잘못**:
1. `platform-reference.md:25` — skill frontmatter 표에 `skills` 행 등재 → 삭제 + `context: fork`/`agent` 설명 강화
2. `design-patterns.md:478-491` "Subagent Composition via `skills` Frontmatter" 섹션 — yaml 예시가 skill frontmatter처럼 보임. 실제로 작동 안 함. **재작성** 필요: 두 메커니즘 분리 설명
3. `quick_validate.py:51` `allowed` set — `"skills"` 제거. 사용자가 skill에 잘못 추가하면 validator가 catch

### 6.3 갭 3 — 빌드인/번들 슬래시 명령 충돌 목록 보강

**현재 `SKILL.md:382` Quality Gate**: `init, review, security-review` 3개만 명시.

**공식 `skills.md` 확인**: 위 3개는 빌드인 명령. 추가로 **번들 스킬** `/simplify, /batch, /debug, /loop, /claude-api` 모두 같은 식으로 충돌 가능 (사용자 동명 스킬 만들면 클래시).

**수정**: Quality Gate 체크리스트 항목에 5개 추가.

### 6.4 갭 4 — `SKILL.md:448-455` "Notable platform features" 7항목 처리 (사용자 결정)

**사용자 의도**: 호환성 도장 = "어느 버전까지 커버하는가"만. 기능 breakdown 불필요.

**결정**: **(a) 통째 삭제**. 호환성 한 줄만 유지: `Written and tested against Claude Code v2.1.126.`

플랜 Section 4 권고와 일치. 1라운드 추가분 노이즈 정리.

---

## 7. 후속 검수 권장 (이번 작업 외)

다음 라운드용 sweep (지금 작업 진행에는 영향 없음):

1. **공식 docs 추가 WebFetch**:
   - `plugins-reference.md` — plugin.json / marketplace.json 매니페스트 (skill-creator-pro 범위)
   - `env-vars.md` — substitution 변수 정확성 검증

2. **plugin 파일 미정독**:
   - `references/schemas.md` — 외부 스펙 변경 영향 점검
   - `agents/*.md` — grading 형식 정확성
   - `auto-optimize/SKILL.md` — 별도 스킬, 동일 사실 오류 가능

3. **사실 검증**:
   - `SKILL.md:382` "since v2.1.108 the model can invoke built-ins via the Skill tool" 출처
   - `platform-reference.md:13` `"skills": ["./"]` 매니페스트 동작 출처
