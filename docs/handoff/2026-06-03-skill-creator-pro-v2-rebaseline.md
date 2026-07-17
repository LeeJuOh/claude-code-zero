---
topic: skill-creator-pro-v2-rebaseline
date: 2026-06-03
---

# skill-creator-pro v2 re-baseline — 핸드오프

## Goal

`skill-creator-pro`(v1.8.2 fork)를 Anthropic 공식 `skill-creator` 위에 재기반화. "공식 + 좋은 아이디어 몇 개"로 느껴지게, 프로세스 무거운 프레임워크 탈피. 4단계 단일 이슈로 진행 중. **Phase 1+2 완료, Phase 3+4 남음.**

소스 진실(중복 금지, 경로 참조):
- 이슈: `.scratch/skill-creator-pro-v2/issues/01-rebaseline.md` (4단계 체크리스트)
- PRD: 삭제됨 (2026-07-17, `docs/superpowers/` 트리 폐지) — 필요 시 git 히스토리에서 복구
  (`git log --diff-filter=D -- docs/superpowers/plans/2026-06-03-skill-creator-pro-v2-rebaseline.md`)
- ADR: `docs/adr/0001-rebaseline-skill-creator-pro-on-official.md`
- 용어/락된 결정: `plugins/skill-creator-pro/CONTEXT.md`
- 공식 spine 원본: `references/claude-plugins-official/plugins/skill-creator/skills/skill-creator/`

## First Action

`skill-creator-pro` 스킬 재호출 후 이슈 **Phase 3** 실행 — 대상 파일 `plugins/skill-creator-pro/skills/skill-creator-pro/SKILL.md`에 inline graft(새 ref파일 금지):
1. **"is a skill the right primitive?" gate** — `### Capture Intent` 시작부에 8–12줄. 5개 확장점(CLAUDE.md / hooks / skills / plugins / MCP)을 *결정*으로 제시 + "hooks can self-improve (Stop hook가 스킬/CLAUDE.md에 업데이트 제안), not just block" 한 줄 포함.
2. **skill-rot / retirement review** — 3–4줄. 모델 업데이트 시 한계 패치용 스킬은 부담되니 트림/은퇴 의지. (현재 SKILL.md엔 옛 "Model Update Check"가 이미 제거된 상태 — 이게 그 대체물.)
3. **남은 eval-op gotchas** — "create the workspace before spawning"(레이스 방지), "don't over-design upfront" 2개를 eval 섹션에 추가. (snapshot/iteration번호/kill-viewer 3개는 Phase 2에서 이미 인라인 반영됨.)
4. **platform-traps quality gate** — `### Package and Present` 근처에 짧은 체크리스트: YAML boolean 이름, 예약어 `claude`/`anthropic`, description 안 따옴표 콜론, 빌트인 슬래시명 충돌, description char budget. (단 **숫자 하드코딩 금지** — "budget exists, fetch from skills.md" 식으로.)

Phase 3 체크리스트 = 이슈 L59–62.

## Context

검수→착수 흐름이었음. 이슈 자체를 먼저 검수(사실관계 100% 정확 확인)하고 L1 한 줄만 고친 뒤 빌드 시작. Phase 1(하버스 통째 스왑)+Phase 2(SKILL.md spine 교체)까지 하고 사용자가 "Phase 2까지만" 지시해서 멈춤. Phase 3 graft 자리는 의도적으로 비워둔 상태(spine만 깔끔히).

핵심 신경 쓴 지점: **경로 관례 결정**(아래 Decisions) + Phase별 validate 게이트 유지. 중간에 깨진 SKILL.md 안 만들려고 Phase 2를 spine-only 완성→validate→정지로 끊음.

## Current Progress

전부 **working tree에만 있음 — 커밋 0개.** (AGENTS.md: develop 브랜치 작업, 수정 시 버전범프 같이 커밋, no auto-push.)

**Phase 1 — 하버스 복원 (완료):**
- `scripts/`·`agents/`·`eval-viewer/`·`assets/eval_review.html`·`references/schemas.md`를 공식판으로 통째 스왑. `diff -rq` 결과 전부 **byte-identical**.
- schemas.md 430줄, `history.json`(L39)+`metrics.json`(L163) 둘 다 문서화 → 기존 grader.md↔schemas.md 갭 닫힘.
- smoke: `py_compile` 전체 OK, `run_eval/run_loop/aggregate_benchmark --help` OK. `quick_validate --help`만 `ModuleNotFoundError: No module named 'yaml'` — PyYAML 미설치(런타임 의존성), 공식과 byte-identical이라 스왑 회귀 아님.

**Phase 2 — SKILL.md spine (완료):**
- 5-phase 골격 → 공식 코칭 루프로 교체, 따뜻한 톤 복원. 493줄(<500).
- 분류축 3개(9 categories / capability-uplift·encoded-preference / problem-first·tool-first) 전부 제거 — grep CLEAN.
- ref파일 5개 삭제(skill-categories/design-patterns/troubleshooting-guide/platform-reference/eval-writing-guide) → `references/` = **schemas.md만**.
- 하드코딩 숫자(1,536 / 1% / 8,000 / SLASH_COMMAND_TOOL_CHAR_BUDGET) 제거 — grep CLEAN. 삭제파일 dangling ref 없음.
- `unset CLAUDECODE && claude plugin validate .` → **✔ 통과**.

git diff --stat: skill-creator-pro 하위 22파일 변경(+3548/−2530). auto-optimize 서브스킬은 **무손상**(diff 없음).

## Decisions Made

1. **경로 관례 = `${CLAUDE_SKILL_DIR}` + `${CLAUDE_PLUGIN_DATA}`.** 공식 spine은 bare 상대경로를 쓰지만, pro는 플러그인이라 자기 번들 참조는 `${CLAUDE_SKILL_DIR}`, 산출물/워크스페이스는 `${CLAUDE_PLUGIN_DATA}`로 적응. 이슈가 두 변수를 "inline one-liner로 유지"하라 명시 + AGENTS.md가 ${CLAUDE_PLUGIN_DATA} 강제 + v1.8.2도 이미 이 관례. = official spine의 **유일한 의도적 경로 일탈**. (공식 워크스페이스 "sibling to skill dir"도 ${CLAUDE_PLUGIN_DATA}로 바꿈 — 플러그인 install dir은 업데이트 시 wipe되니까.)
2. **이슈 L1 수정 완료.** Phase 4 trigger eval 합격선 문구를 "loop엔 pass/fail 없음 → best_description 반환, 점수 명백히 떨어진 거 아니면 통과(도그푸드 점검, 하드게이트 아님)"로 명확화. 이슈 파일 이미 반영됨.
3. **검수 결론**: M1(eval-set 미지정) = 무효(공식 워크플로가 Description Optimization Step 1에서 생성), L2/N1 = 손댈 거 없음. 실수정은 L1 하나뿐이었음.

## Blockers

⚠️ **미해결 결정 2개 — Phase 3 들어가기 전 사용자 확인 권장** (Phase 2 끝에 보고했으나 사용자가 핸드오프 지시로 결정 보류):
1. **`/auto-optimize` 포인터 유지 여부.** 현재 SKILL.md "Improving the skill"에 1문단 트림 포인터 남겨둠("hands-off 원하면 /auto-optimize, ~0.7+ pass rate에서 유효"). 이슈/PRD/ADR는 auto-optimize *스킬 자체*만 untouched라 했고 *메인 SKILL.md 포인터*는 언급 없음. → 유지/제거 확인 필요.
2. **eval-op gotcha 일부 Phase 2 선반영.** snapshot/iteration번호/kill-viewer 3개를 Phase 2 spine에 자연스럽게 녹임(Phase 3 항목인데 앞당김). 문제면 되돌리기. 아니면 Phase 3는 나머지 2개(workspace-before-spawn, don't-over-design)만 추가하면 됨.

## Next Steps

- **Phase 3** (위 First Action) — blocked-by Phase 2(완료). 끝나면 `claude plugin validate .` 재실행.
- **Phase 4 — Housekeeping + 최종 수용** (blocked-by Phase 3). 이슈 L64–74:
  - `marketplace.json` 버전 `1.8.2 → 2.0.0` (로컬 플러그인 → 버전은 marketplace.json에만).
  - `plugin.json` + `marketplace.json` description에서 "category-aware design"/분류 언어 제거(현재 양쪽에 있음).
  - `README.md` philosophy-first 재작성(repo README 스타일). `name`은 `skill-creator-pro` 유지.
  - ADR 0001 + CONTEXT.md + PRD 동기화 확인.
  - `claude plugin validate .` 통과.
  - trigger eval: `run_loop.py` 1회(공식 Description Optimization Step 1로 eval-set 먼저 생성됨). `--model`은 세션 모델 ID.
  - 수동 end-to-end 점검: 분류축 0, gate at intent capture, references/=schemas.md, 따뜻한 톤.
- **커밋** — AGENTS.md대로 develop에 영어 커밋 + 버전범프 동반. push는 사용자 명시 요청 시만.

## Infra/환경 메모

- 브랜치: `develop` (정상). main 직접 커밋 금지.
- `quick_validate.py` 실제 사용하려면 PyYAML 필요(`pip install pyyaml`). 빌드엔 비차단.
- working tree에 무관 변경 없음 — dirty 항목 전부 이번 v2 작업물 + 옛 audit문서 2개 삭제(`docs/handoff/skill-creator-pro-audit-handoff-2026-05-03.md`, `docs/superpowers/plans/skill-creator-pro-audit-2026-05-03.md` — 별개 토픽, 그대로 둠).
