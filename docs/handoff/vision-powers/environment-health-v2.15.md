# Handoff — environment-health v2.15 (도중)

> 상태: Task 1/13 docs 완료 · 스캐너 코드 Task 2/4/5/6/7/9/10/11/13 분 이미 작성됨 (docs 미반영) · 커밋 안 됨

## Goal

`plugins/vision-powers/skills/environment-health` 스킬을 공식 Claude Code 문서(skills.md,
memory.md, mcp.md, hooks.md, context-window.md, costs.md, plugins-reference.md,
sub-agents.md 등) 전수 대조 결과 발견된 **13개 이슈**를 구현 파일에 반영.

B안 선택: **구현만 수정 + marketplace 2.14.0 → 2.15.0 minor 버전업**. 플랜 문서
`docs/superpowers/plans/2026-04-10-environment-health.md`는 건드리지 않음.

## First Action

```bash
cd /Users/ljo/Desktop/project/zero-code/claude-code-zero
git diff plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js | head -300
```

스캐너에 이미 들어간 변경(Task 2/4/5/6/7/9/10/11/13의 코드 부분)을 확인한 뒤, 아래
"Next Steps" §A부터 순서대로 진행. 스캐너는 `main()`까지 wiring 완료되어 수동 실행
가능한 상태:

```bash
node plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js --window-size=200000 | head -200
```

## Context

- 검수는 총 4차에 걸쳐 수행됨. 1차(피상) → 2차(250자 오류) → 3차(3-layer 컨텍스트 로딩
  모델) → 4차(plugins-reference.md 전수 검토로 컴포넌트 누락 5개 발견)
- 사용자가 "관련 공식 문서 다 봤냐"고 강하게 압박한 것이 핵심 turning point —
  llms.txt 인덱스에서 놓친 페이지 병렬 fetch한 것이 큰 진전
- 13개 중 Task 1(스킬 디스크립션 250→1,536 + A/B/C 세 축 재설계)은 완전히 끝남
- 스캐너 코드는 Task 2/4/5/6/7/9/10/11/13까지 이미 구현되어 있음. 빠진 것은 그에 맞는
  docs 반영과 Task 3/8/12/14의 docs-only 작업
- Context가 한계 근처라 사용자가 의도적으로 task 1만 끝내고 중단하게 함
- 사용자는 한국어로 대화, 파일은 영어로 작성 (CLAUDE.md/AGENTS.md 규칙)
- **사용자가 원하는 톤**: 단순 숫자 치환이 아닌 구조적 이해 확인. "근데 컨텍스트 로딩
  실제로 어떻게 되는지는 확인했냐" 같은 질문이 자주 나옴. 공식 출처 없는 숫자에 매우
  민감함 — 발명 금지 원칙 유지할 것

## Current Progress

### ✅ 완료 (Task 1)

**스캐너 (`scripts/env-health-scan.js`):**
- `parseFrontmatter()` → `when_to_use`, `combined_chars`, `user_invocable`,
  `preload_skills` 추출 추가
- `scanInstalledSkills()`/`scanInstalledCommands()` → `combined_chars` 기반으로
  예산 집계. `disabled` 스킬은 listing에서 빠지므로 예산 0.

**Criteria (`references/health-criteria.md`):**
- §3 전면 재작성. **A/B/C 세 축 분리**:
  - 축 A: 1,536자 per-entry 하드캡 (공식 skills.md frontmatter + troubleshooting 2곳
    인용)
  - 축 B: `effective_budget = SLASH_COMMAND_TOOL_CHAR_BUDGET ?? max(8000, window × 0.01)`
    대비 포화율. 70% watch threshold는 공식 근거 없어 "lead-time buffer"로 명시
  - 축 C: 불균형 소비 — 관측(observational), 등급 없음
- `disable-model-invocation: true` 효과를 frontmatter 표 인용으로 보강

**Section schema (`references/section-structure.md`):**
- `skill_health` → 3 축별 필드로 분리:
  `description_axis_a_cap` / `description_axis_b_budget` / `description_axis_c_balance`
- `disable_model_invocation.not_using` 정렬 기준을 `combined_chars`로 변경

**SKILL.md:**
- 가챠 "250자 cap" 제거 → 3-layer 모델 설명으로 교체
- Top lever 계산 기준 `combined_chars` 및 1,536 기준으로 갱신

### 🟡 스캐너 코드 작성됨 (docs 미반영)

main()까지 wiring 완료, 현재 실행 가능한 상태. docs 쪽 반영만 남음.

| Task | 스캐너 함수 | 상태 |
|---|---|---|
| 2 | `normalizeEnableToolSearch()` (5-value + proxy fallback) → `scanEnvAndSettings` 통합 | 코드 완료 |
| 4 | `scanPluginComponents()` (bin/monitors/.lsp.json/output-styles/channels) | 코드 완료 |
| 5 | `scanHookInventoryDetailed`/`scanContextMetrics` → `pluginManifests` 받아 inline 훅/MCP 파싱 | 코드 완료 |
| 6 | `scanEnvAndSettings.agent_teams_enabled` (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | 코드 완료 |
| 7 | `scanSubagentPreloads()` — agent frontmatter `skills:` 필드 | 코드 완료 |
| 9 | `scanInstalledPlugins()` → `activeInstallPaths` 기반 orphan 구분, `orphan_count` + `orphans[]` 반환 | 코드 완료 |
| 10 | `scanPluginOptions()` — `pluginConfigs[*].options` 키만 (값 X — sensitive) | 코드 완료 |
| 11 | `scanClaudeMd()` → scope를 `project-root`/`ancestor`/`ancestor-local`/`nested`/`user`로 분류, `compact_resilient` 필드 추가. nested는 lazy-loaded 카운트 분리 (`nested_lines`, `nested_bytes`, `nested_est_tokens`) | 코드 완료 |
| 13 | `scanClaudeMd()` `$HOME` 경계 제거 — 파일시스템 루트까지 walk | 코드 완료 |

**`collectPluginManifests()`** 헬퍼 추가 — `enabledPlugins` + `activeInstallPaths` 기준
plugin.json 한 번 로드해 hook/mcp/components 스캐너에 공유.

### ⚪ 미착수 (docs만 필요)

- Task 3: `health-criteria.md` §2에서 `~5,000 tokens × server_count` 추정치 삭제
- Task 8: SKILL.md에 auto-compaction thrashing 가챠 + 복구 링크
- Task 12: `health-criteria.md` §5(collision count tiers) / §6(prompt-agent hook tiers)
  / §8(CLAUDE.md >300줄) invented threshold를 관측화 또는 공식 인용 보강
- Task 14: 버전 bump + validation + commit

## What Worked

- **공식 llms.txt 인덱스 전수 열람**이 결정적. 3차까지는 주요 페이지만 봤고, 4차에서
  `plugins-reference.md`를 추가로 fetch하자 bin/monitors/.lsp.json/output-styles/
  channels 등 5개 컴포넌트 누락이 드러남
- **공식 인용 문장을 blockquote로 criteria 문서에 그대로 박기** — 사용자가 "발명 숫자"
  를 극도로 경계하므로 출처가 명시된 수치만 남기는 것이 신뢰 유지에 중요
- **WebFetch 결과가 너무 커서 persisted-output 파일로 떨어질 때**, 그 파일을 Grep으로
  정밀 검색하면 필요한 문단만 얻을 수 있음 (예: ENABLE_TOOL_SEARCH 허용값 표 추출)
- **3-layer 설명**: per-entry cap(1,536) vs total budget(1%·8K) vs dynamic shortening
  을 분리해서 설명하니 사용자가 즉시 납득. 이 구조를 Task 1 docs에 그대로 박음
- 스캐너에서 `parseFrontmatter`를 확장할 때 `when_to_use`, `preload_skills` 등 여러
  필드를 **한 번에 리팩터** — 여러 스캐너가 공유해 중복 파서 코드 방지

## What Didn't Work

- **1차 검수 때 급하게 "250 → 1,536 치환"이라 답한 것** — 사용자가 "컨텍스트 로딩 실제
  로 확인했냐"고 반박. 단일 숫자 치환이 아니라 3-layer 구조 이해가 필요한 문제였음
- **초기 스캐너 `scanEnvAndSettings`의 `enableToolSearch || "deferred"`** — "deferred"
  라는 값은 공식 허용값 목록(true/auto/auto:N/false)에 없음. 내부 라벨일 뿐인데 혼동
  유발. 결국 `normalizeEnableToolSearch()` 도입해 raw 값 vs `effective_mode`로 분리
- **CLAUDE.md walk $HOME 경계** — `while (current === home || current.startsWith(home +
  sep))` 조건이 cwd 가 `$HOME` 밖일 때(예: `/tmp/foo`) 아무 것도 스캔 못함. 공식 docs
  는 경계를 지정하지 않음. 제거하고 파일시스템 루트까지 walk로 변경
- **mtime 최신 기반 plugin.json 선택** — orphan cache가 섞이면 오래된 버전이 선택될
  수 있음. `installed_plugins.json` 의 `installPath`를 ground truth로 사용하도록 수정
- **Task 범위 욕심** — 사용자가 "한 번에 다" 했지만 context 폭주로 중단됨. 다음 세션은
  Task 3/8/12 (docs-only) 먼저 빠르게 처리한 뒤 Task 2/4/5/6/7/9/10/11/13 docs를
  축별로 묶어 순차 진행 권장

## Next Steps

순서대로 진행 권장. docs-only 3개 먼저 끝내고 → 스캐너 반영 docs → 버전업.

### A. Docs-only 3건 (빠름)

1. **Task 3** — `references/health-criteria.md` §2에서 아래 블록 삭제:
   ```
   - `ENABLE_TOOL_SEARCH=auto` → MCP schemas load upfront if ≤10% of context. Add
     `~5,000 tokens × server_count` to MCP cost (estimate)
   - `ENABLE_TOOL_SEARCH=false` → all MCP schemas loaded. Same add-on, but unconditional
   ```
   → "추정치, 공식 근거 없음" 레이블 달거나 "mode only, 토큰 추정치는 `/context`로 확인"
   로 대체.

2. **Task 8** — SKILL.md 가챠 섹션에 추가:
   - 공식: how-claude-code-works.md — "If a single file or tool output is so large that
     context refills immediately after each summary, Claude Code stops auto-compacting
     after a few attempts and shows an error"
   - 스캐너가 직접 감지하진 못함. 대신 큰 skill body + 많은 rules + 큰 CLAUDE.md 조합
     을 surface하고, troubleshooting 링크 제시:
     `https://code.claude.com/docs/en/troubleshooting#auto-compaction-stops-with-a-thrashing-error`

3. **Task 12** — `health-criteria.md` 재검토:
   - §5 (Trigger Collisions): 1-2 OVERLAP/3+ OVERLAP 등급 근거 없음 → 관측화
     (subagent 반환값 그대로 노출, 등급 없음)
   - §6 (Hook Complexity): 1-2/3+ prompt-agent hook 등급 근거 없음 → 관측화. LLM 호출
     비용은 언급하되 등급은 빼기
   - §8 (CLAUDE.md): "200 target" 은 공식, ">300 lines = critical" 은 근거 없음 →
     200줄 초과를 단일 🟡로 두거나 관측화

### B. 스캐너 코드 docs 반영

스캐너는 이미 새 필드를 출력하고 있음. 소비 쪽 맞춰야 함:

4. **Task 2** — `health-criteria.md` §7 MCP 섹션을 5-value 표로 교체
   (unset/true/auto/auto:N/false + proxy fallback). `section-structure.md`
   `hooks_and_mcp.mcp.effective_mode`를 `deferred|upfront|auto|unknown`로 명시.

5. **Task 4** — `section-structure.md`에 새 섹션 추가 또는 기존 `hooks_and_mcp`
   확장: `plugin_components` 필드 (`{per_plugin, totals: {bin, monitors, lsp_servers,
   output_styles, channels}}`). `health-criteria.md`에 §9 "Plugin Components" 추가
   (관측, 카운트만 표시).

6. **Task 5** — docs는 "인라인 훅/MCP도 카운트됩니다" 한 줄이면 충분. 이미 §6/§7에
   녹여 넣거나 §2 dashboard에 노트로 표시.

7. **Task 6** — `health-criteria.md`에 `agent_teams_enabled=true` 감지 시 info note
   한 줄 ("agent teams enabled — expect ~7x token usage per teammate session, costs
   page"). 등급은 주지 않음.

8. **Task 7** — `section-structure.md`에 `subagent_preloads` 필드 추가
   (`{agents_with_preload: [...], total_preloaded_skills}`). Criteria는 관측만.

9. **Task 9** — `section-structure.md` `overview.totals`에 `orphaned_cache_count` 추가
   (기존 `stale_in_cache`와 분리). info_notes에 "7-day grace" 언급.

10. **Task 10** — `section-structure.md` `overview`에 `plugin_options` 필드 추가
    (키만, 값 X). Criteria는 관측만.

11. **Task 11** — `section-structure.md` `claude_md_memory.claude_md`에 `scope` enum
    확장 + `compact_resilient: bool` + `load_mode: "always-loaded"|"lazy-loaded"` 필드
    노출. Criteria §8에 "nested CLAUDE.md는 lazy-load, compact 후 재주입 안 됨" 노트
    추가.

12. **Task 13** — docs-only 노트: "scan walks from cwd to filesystem root (no $HOME
    boundary)" — gotcha 혹은 §8 주석에 반영.

### C. 버전 bump + 검증

13. **Task 14**:
    ```bash
    # marketplace.json version 2.14.0 → 2.15.0 (local source, version in marketplace only)
    # plugin.json은 version 필드 없으므로 건드리지 않음 (AGENTS.md 규칙)
    # README.md 스킬 설명 업데이트는 실제 동작 변경 있으므로 한 줄 보강
    unset CLAUDECODE && claude plugin validate .
    node plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js --window-size=200000 | head -50
    # 수동 실행 smoke test 통과 확인
    ```

14. **커밋** (per-task 또는 logical group):
    ```
    feat(vision-powers): v2.15.0 — description obesity 3-axis model + docs accuracy
    ```
    주요 항목을 bullet로 요약. AGENTS.md 규칙 준수(영어, 1-2줄, Co-Authored-By 없음,
    자동 push 금지).

## Modified Files (uncommitted)

```
 M plugins/vision-powers/skills/environment-health/SKILL.md
 M plugins/vision-powers/skills/environment-health/references/health-criteria.md
 M plugins/vision-powers/skills/environment-health/references/section-structure.md
 M plugins/vision-powers/skills/environment-health/scripts/env-health-scan.js
```

## Key References

- 공식 docs index: `https://code.claude.com/docs/llms.txt`
- 본 작업의 기반 플랜: `docs/superpowers/plans/2026-04-10-environment-health.md`
- 스킬 root: `plugins/vision-powers/skills/environment-health/`
- 검수 시 persisted-output 파일들:
  `~/.claude/projects/-Users-ljo-Desktop-project-zero-code-claude-code-zero/5ceac44c-d270-4a5f-977c-6a906ac006a3/tool-results/toolu_*.txt`
  (MCP 페이지, 서브에이전트 페이지, settings 페이지 등 — 15분 캐시 만료 시 WebFetch
  재실행 필요)

## Critical Reminders

- 공식 출처 없는 숫자 **절대 추가 금지**. 플랜의 원래 "no invented numbers" 룰 유지
- 250자는 **존재하지 않는 숫자**. 1,536자가 공식 per-entry cap
- `ENABLE_TOOL_SEARCH` 허용값: `(unset)` / `true` / `auto` / `auto:<N>` / `false` — "deferred"는 내부 라벨
- 플랜 파일(`docs/superpowers/plans/2026-04-10-environment-health.md`)은 **수정 안 함** (B안)
- marketplace.json 버전 bump는 **minor (2.14.0 → 2.15.0)** — 새 스캐너/필드는 기능 추가
- CLAUDE.md/AGENTS.md 규칙: 플러그인 산출물 영어, 대화는 한국어, 커밋 영어 1-2줄
