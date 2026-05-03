# Handoff: skill-creator-pro 검수 + 정정 작업

**날짜**: 2026-05-03
**상태**: 플랜 완성, 구현 미시작
**플랜 파일**: `docs/superpowers/plans/skill-creator-pro-audit-2026-05-03.md`

---

## Goal

`plugins/skill-creator-pro/` v1.8.1 → v1.8.2 패치 릴리즈. Claude Code v2.1.113~126 릴리즈 노트 + 공식 docs (skills.md, hooks.md, sub-agents.md) 대조해 사실 오류 시정 + 누락 platform 기능 안내 추가. 플러그인 철학(trigger reliably / follow instructions consistently / improve over time) 정렬.

---

## First Action

```bash
git checkout -- \
  plugins/skill-creator-pro/skills/skill-creator-pro/SKILL.md \
  plugins/skill-creator-pro/skills/skill-creator-pro/references/design-patterns.md \
  plugins/skill-creator-pro/skills/skill-creator-pro/references/platform-reference.md
```

→ 1라운드 변경 64줄 폐기. 베이스라인(커밋 752e0ab) 복원.

그 다음 `docs/superpowers/plans/skill-creator-pro-audit-2026-05-03.md` Section 5.0 ~ 5.7 순서대로 적용.

---

## Context

### 작업 흐름 요약

1. 사용자가 Claude Code 릴리즈 노트 v2.1.113~126 분석 요청. 1라운드 자동 작업으로 plugin 3 파일에 64줄 추가 (현재 working tree 상태). 잘못된 가이드 일부 포함.
2. 사용자 검수 요청 → 공식 docs (skills.md, hooks.md, sub-agents.md) WebFetch + curl로 대조. 사실 오류 매핑 + 1라운드 잘못 식별.
3. 갭 4개 추가 발견:
   - 갭 1: `quick_validate.py:75` description cap 1024 → 1536 (공식 cap)
   - 갭 2: `skills` frontmatter는 subagent 전용 — plugin 3곳 잘못 (platform-ref:25, design-patterns:478-491, quick_validate:51)
   - 갭 3: Quality Gate 빌드인 충돌 목록에 번들 스킬 5개 추가 (simplify/batch/debug/loop/claude-api)
   - 갭 4: SKILL.md "Notable platform features" 7항목 리스트 — 사용자 결정 = 통째 삭제 (호환성 도장 한 줄만)
4. 플랜 Section 5 콜드 실행 가능한 형태로 완전 재작성. 베이스라인(HEAD) 기준 변경 명세, 출처 인용, 추가 금지 항목 명시.
5. 핸드오프 작성 (이 파일). 다음 세션에서 핸드오프 + 플랜만 보고 바로 구현 가능.

### Mental state at pause

- 플랜 Section 5 자체완결. 모든 변경에 베이스라인 라인 번호 + before/after 텍스트 + 출처 docs 명시.
- 핵심 트랩: `git checkout`이 1라운드 변경 64줄 모두 날림. 그중 옳은 것 (mcp_tool, ${CLAUDE_EFFORT}, duration_ms/updatedToolOutput, alwaysLoad, OTel skill_activated 등)도 함께 사라짐. Section 5.x에서 옳은 것 + 갭 정정 모두 새로 적용해야 함. 플랜 Section 5.0에 명시.
- `skills` 필드 잘못은 1라운드가 아니라 베이스라인부터 있던 pre-existing error. Reset이 안 고침. Section 5.1.2 (platform-reference 행 삭제) + 5.2.4 (design-patterns 섹션 재작성) + 5.7 (quick_validate allowed set) 세 곳 명시.
- 사용자 철학 검증: scope discipline 엄수. `claude plugin tag/prune`, `themes/`, marketplace `$schema` 같은 plugin 관리 영역 일관 제외. 1라운드의 "Tag a Release" 섹션 / "Notable platform features" 7리스트는 scope 위반으로 롤백.

### 사용자 컨텍스트 (CLAUDE.md 메모리 발췌)

- `plugin-scope-boundaries`: 플러그인 기능 범위 외 내용 X
- `removal-scope-discipline`: 제거 지시 확대 해석 금지, 불확실하면 물어볼 것
- `version-bump-with-fix`: 플러그인 수정 시 버전 범프 같이 커밋 (별도로 묻지 말 것)
- `audit-dont-invent-changes`: 가짜 변경 만들지 말 것, 단 compat "tested against" 도장은 찍을 것
- `release-pull-first`: 릴리즈 전 git fetch origin

---

## Current Progress

### ✅ 완료
- [x] 공식 docs WebFetch + curl 대조 (skills.md, hooks.md, hooks-guide.md, sub-agents.md)
- [x] 사실 오류 매핑 (description cap, body budget, effort options, ${CLAUDE_EFFORT} values, name 64자 max, paths comma 허용, when_to_use/arguments 신규, $N/$name substitutions, hook events 3개, Skill content lifecycle 5K/25K, Skill(name) permission syntax)
- [x] 갭 4개 분석 + 사용자 결정 수렴
- [x] 플랜 문서 콜드 실행 가능 형태로 재작성 (`docs/superpowers/plans/skill-creator-pro-audit-2026-05-03.md`)

### ⏸ 미진행 (다음 세션에서 진행)
- [ ] **Step 1**: 3 파일 git checkout (베이스라인 복원)
- [ ] **Step 2**: 플랜 Section 5.1 ~ 5.7 적용
- [ ] **Step 3**: validation (`claude plugin validate`, `quick_validate.py`)
- [ ] **Step 4**: marketplace.json 1.8.1 → 1.8.2 + 커밋

---

## What Worked

- **공식 docs 직접 대조** (curl로 raw fetch — WebFetch 잘림 우회): hooks.md `duration_ms` 위치 (line 1350, 1356, 1418, 1426) 확정 가능
- **sub-agents.md sweep으로 `skills` 필드 정당성 확정**: line 247, 384, 403 — subagent 전용. plugin 3곳 잘못 모두 식별
- **갭 분리 분석**: 갭 1(quick_validate cap)/갭 2(skills 필드)/갭 3(빌드인 충돌)/갭 4(Notable features) 각 독립 결정. 한 갭 결정이 다른 갭 막지 않음
- **플랜에 추가 금지 항목 명시**: 1라운드 잘못 (disallowedTools 행, Pro/Max 트리비아, 3개 gotcha, Tag a Release, Notable features 7리스트) 재실수 방지

## What Didn't Work

- **WebFetch on hooks.md**: 페이지 잘려서 PostToolUse 섹션 못 봄. → curl로 직접 raw 받아서 grep
- **1라운드 자동 실행**: scope 안 잡고 적용 → 잘못 가이드 일부 추가됨. 사용자 검수에서 발견. **교훈**: 검수 전 자동 실행 금지, 플랜 컨펌 후 진행
- **`docs/handoff/HANDOFF.md` 디폴트 네이밍 시도**: 사용자 거부 — 작업 식별 불가. → 현재 파일명 `skill-creator-pro-audit-handoff-2026-05-03.md`로 작업 명확

## Next Steps

플랜 Section 5.0 워크플로우 그대로:

1. **Reset 3 파일** (First Action 위에 명시)
2. **Section 5.1 적용** — `references/platform-reference.md` (5.1.1~5.1.6, 약 14개 항목 수정/추가/삭제)
3. **Section 5.2 적용** — `references/design-patterns.md` (5.2.1~5.2.7, 7개 항목 — 그중 5.2.4 Subagent Composition 섹션은 통째 교체)
4. **Section 5.3 적용** — `references/troubleshooting-guide.md` (2개 항목)
5. **Section 5.4 적용** — `SKILL.md` (3개 항목 + 추가 금지 명시)
6. **Section 5.5 적용** — `marketplace.json` 버전 범프
7. **Section 5.6 적용** — `quick_validate.py:75` description cap
8. **Section 5.7 적용** — `quick_validate.py:46-52` allowed set (skills 제거, when_to_use/arguments 추가)
9. **Validation** — `unset CLAUDECODE && claude plugin validate plugins/skill-creator-pro` + `python ...quick_validate.py`
10. **Commit** — 영문 1-2문장. 플랜 Section 5.0에 메시지 템플릿 있음
11. **사용자 보고** — diff stat + 변경 요약

진행 중 막히면 플랜 Section 6 (갭 audit log) 참조 — 결정 근거 + 출처 인용 모두 보존됨.

---

## 참조

- 플랜: `docs/superpowers/plans/skill-creator-pro-audit-2026-05-03.md`
- 베이스라인 커밋: `752e0ab` (Merge main into develop before release)
- 영향 파일:
  - `plugins/skill-creator-pro/skills/skill-creator-pro/SKILL.md` (베이스라인 436줄)
  - `plugins/skill-creator-pro/skills/skill-creator-pro/references/platform-reference.md` (베이스라인 101줄)
  - `plugins/skill-creator-pro/skills/skill-creator-pro/references/design-patterns.md` (베이스라인 560줄)
  - `plugins/skill-creator-pro/skills/skill-creator-pro/references/troubleshooting-guide.md`
  - `plugins/skill-creator-pro/skills/skill-creator-pro/scripts/quick_validate.py`
  - `.claude-plugin/marketplace.json` (skill-creator-pro 항목)
- 공식 docs:
  - `https://code.claude.com/docs/en/skills.md`
  - `https://code.claude.com/docs/en/hooks.md`
  - `https://code.claude.com/docs/en/sub-agents.md`
