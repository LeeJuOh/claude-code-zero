---
topic: rubber-duck-tutor-redesign
date: 2026-06-21
---

# rubber-duck-tutor 재설계 (no-numb + mattpocock-skills 분석 기반)

## Goal

`plugins/rubber-duck-tutor/` (현 v2.4.1) 를 두 참고 프로젝트 분석 결과로 재설계:
- `references/no-numb` — Stop-hook forcing-function 퀴즈 플러그인
- `references/mattpocock-skills` — SW엔지니어링 스킬 스위트 (이 세션에 로드된 grill-with-docs/tdd/domain-modeling 등의 원본)

설계 결정은 **그릴 세션으로 전부 확정됨**. 이 핸드오프는 **구현 지시서**다. 다음 세션에서 **단계별(Phase 1부터)**, **R2 구조**, **ADR + CONTEXT.md 생성**까지 실행.

## First Action

**Phase 1 착수 — 싸고 안전한 수정 2건:**

1. **§0 문서버그 정정.** `/branch`·`/resume`는 **Claude Code 빌트인**(공식 문서 확인 완료: `/branch [name]`, `/resume [session]` alias `/continue`). 현재 `plugins/rubber-duck-tutor/skills/duck/references/core.md` (~L87 "Fallback when /branch and /resume are unavailable ... external plugin like lab-harness-zero") + `README.md` Prerequisites 가 **거짓 전제**(외부 플러그인) 위에 폴백 분기를 얹음. → 그 폴백 분기 삭제, "빌트인이라 항상 사용 가능"으로 단순화.

2. **§3 후크 수정** (아래 Decisions §3 참조) — 경로기반 문서트리거(**실버그**), 출하 공유예산 + 제안→직면(**개선**). (컴파운드 명령은 버그 아님 — §3 참조.)

Phase 1 끝나면 commit (영어, 버전 범프 동반 — 메모리 `version-bump-with-fix`).

## Context

유저와 그릴 세션(`/grill-with-docs`)으로 진행. no-numb의 forcing-function을 duck에 이식할지부터 시작해 전체 결정트리를 한 단계씩 해소함. 핵심 깨달음 두 개:
1. **no-numb과 duck은 정반대 철학** (마찰=기능 vs 학습≠생산성경쟁) → 게이트 복제는 정체성 수입. 거부.
2. **mattpocock 관용구**(model-invoked 규율 + user-invoked 래퍼)는 이식 가능하나, **"grill-with-docs가 before-build 소유" 같은 포지셔닝은 환경특수** → 배포 플러그인은 단독작동해야 하므로 design/plan을 *삭제* 말고 *병합*.

유저 최종 지시: **단계별 R2, ADR+CONTEXT OK, 단 다음 세션에서.** 그래서 이 핸드오프.

## Decisions Made (전체 원장 — 재논쟁 금지)

번호 = 최종 결론 섹션. 실제 편집 = **0,2,3,4,5,6** (#1은 "안 함").

- **§0 — 문서버그.** /branch·/resume 빌트인. core.md+README 폴백 삭제. **(Phase 1)**
- **§1 — 거부(비편집).** enforce 게이트(Stop-block) **거부**, 객관식 **거부**. 근거: duck 강령("learning shouldn't compete with productivity") + Anthropic 연구(효과는 *질문*이지 *게이트* 아님; 17% 연구의 긍정 코호트=자발적 질문자). 개방형 소크라테스식 유지. no-numb과는 **보완재**(둘 다 깔면 됨). ⚠️ 다음 세션에서 "그래도 게이트 넣자" 재발 금지 — 이미 깊이 논파됨.
- **§2 — no-numb 비구조 흡수.** (1) **설정 다이얼** `${CLAUDE_PLUGIN_DATA}/config.json`: `enabled`(on/off, 마감날 끔) + 기본 강도(quick/standard/deep). 기본 ON. no-numb처럼 `.enabled == false` 명시 체크(`//` 함정 주의). (2) **턴-스코핑**: duck-verify가 git diff 외 "이번 세션 수정분"도 잡게 — no-numb `gate.sh §4`의 transcript 파싱 기법 참고(마지막 user prompt 이후 Edit/Write/MultiEdit/NotebookEdit). **(Phase 3)**
- **§3 — 후크 B안(출하 집중).** 전제 재정의: *"흐름 끊지 마라, 단 기본값은 건너뛰기가 아니라 관여."* **(Phase 1)**
  - **출하 훅 = 제안→직면.** push/PR 훅의 additionalContext를 "/branch+/duck-review 제안"에서 "**방금 출하한 변경에 이해질문 1개 인라인 직면**"으로. 깊은 세션만 branch-first.
  - **출하 공유예산.** `{git push, gh pr create, glab mr create}` 셋이 **1회/세션 공유, 먼저 뜨는 게 이김.** 이유: `git push`가 플랫폼·도구 무관 보편 신호(웹PR·Bitbucket·GitLab MR 다 push 선행) → CLI 후크(gh/glab) 놓치는 웹/기타 플랫폼을 push가 폴백 커버. 중복발동·노이즈 방지. (설계 트리거와 별도 예산 — 출하가 안 굶게.)
  - **문서 트리거 경로기반 전환.** 현 `post-write-plan.sh`는 **파일명** 매칭(`adr*.md` 등) → ⚠️ **이 레포 자기 ADR `docs/adr/0001-rebaseline-...md`를 놓침**(basename이 `adr`로 시작 안 함). 번호 ADR이 표준이라 파일명 방식 깨짐. → **경로기반**(`docs/adr/`, `docs/plans?/`, `docs/specs?/`, `docs/rfcs?/`) + 파일명 폴백. 강한 기본값 + **선택적 경로정규식 오버라이드 1키** + 풋건 폴백(잘못된 정규식 → 기본값). 설계예산만 씀.
  - **컴파운드 명령 — 버그 아님(검증 완료).** 공식 hooks 문서: `if:` Bash 매처는 `&&`·`$()`·백틱 포함 **각 서브커맨드 독립 검사** → `Bash(git push *)`가 `npm test && git push origin` 매칭함. 따라서 스크립트 인라인 정규식은 **중복 방어**(무해 — 원하면 정리만, 필수 아님). ⚠️ 이전 그릴서 "접두 매처라 빠져나감"이라 잘못 단정 → **철회.** 남는 실제 갭은 alias·`hub` 정도(다른 명령명) — **저우선, Phase 1 범위 밖.**
- **§4 — mattpocock 관용구.** `core.md` → **model-invoked `ducking` 스킬로 승격**(grilling이 grill-me/grill-with-docs의 재사용 루프인 것과 동형). 에이전트가 러버스탬핑 감지 시 자동 집음 = 후크 없는 소프트 트리거. **invoke 일관화**: model `ducking` 1개 + 나머지 user-invoked 래퍼. (현 `duck-design`만 model-invoke로 새어있어 라우터와 트리거 충돌 → 병합으로 자동 소멸. user→user 호출 위반도 해소.) **(Phase 2)**
- **§5 — design/plan 병합.** 삭제 X(단독 유저는 grill-with-docs 없음, duck이 before-build 커버해야). **병합 O**(before-AI vs after-AI 구분이 intrinsic 혼란 — 유저 본인이 헷갈림). → `duck-prebuild` 하나로(predict-first + plan-review 한 모드 안에서). **(Phase 2)**
- **§6 — 정체성 재정의.** README/desc: *"AI코딩 생애주기 전반의 이해유지층. grill-with-docs·/branch 등 있으면 합쳐지고 없으면 단독 작동."* after-build 전용으로 좁히지 말 것(환경특수). **(Phase 3)**

### 구조 결정: R2 (확정)
```
skills/
├── ducking/        MODEL  엔진 — 이해규율 루프 (core.md 승격). 자동 집힘.
│   ├── references/  prebuild.md, verify.md, review.md, orient.md, learning-science.md, exercise-patterns.md, orientation-guide.md
│   └── scripts/     log-gap.sh, recent-gaps.sh (skills/duck/scripts/ 에서 이동, 경로 재지정)
├── duck/           USER   라우터/현관 — 단계 감지 → ducking 호출 (ask-matt 패턴)
├── duck-prebuild/  USER   빌드 전 (design+plan 병합)
├── duck-verify/    USER   빌드 후 코드 이해
├── duck-review/    USER   출하 전 (B 후크 앵커)
└── duck-orient/    USER   코드베이스 입문
```
- R2 선택 이유: **배포 플러그인** → `/` 눌렀을 때 단계 다 보임 = 발견성↑. (R1=2스킬은 미니멀하나 첫 유저가 `/duck`만 보여 뭘 할지 모름 → 기각.)
- user-invoked 래퍼는 **얇게** — 단계별 입력/질문틀 framing만 잡고 본 루프는 `ducking` 호출. mattpocock `grill-me`(얇음)→`grilling`(루프) 관계 그대로.

## 실행 계획 (단계별)

- **Phase 1 (싸고 안전):** §0 문서버그 + §3 후크 픽스. → commit.
- **Phase 2 (구조개편, 위험):** §4 core→ducking 승격, §5 design/plan→duck-prebuild 병합, invoke 일관, 래퍼화. R2 디렉터리 구조 실현. → 로컬 테스트(`claude --plugin-dir ./plugins/rubber-duck-tutor`, 캐시 충돌 시 disable/enable). → commit.
  - ⚠️ **명령 개명 전파 체크리스트 (`/duck-design`·`/duck-plan` → `/duck-prebuild`).** 병합하면 두 명령이 사라짐 → **모든 참조처 동시 갱신 필수**(빠지면 죽은 명령 가리킴):
    - `skills/duck/SKILL.md` — description(L3), detection/mode 표(L15-16, L26-27 부근)
    - `hooks/post-plan.sh` — additionalContext의 `/duck-plan` 문구
    - `hooks/post-write-plan.sh` — additionalContext의 `/duck-plan` 문구
    - `README.md` — 명령 표(L17-18), Quick Start(L51-52), 후크 단락(L25)
    - `plugin.json` + `marketplace.json` — description 내 명령 나열
    - (`/duck-review`는 유지 — post-pr.sh/post-push.sh는 그대로.)
  - ⚠️ **scripts/ 마이그레이션.** `skills/duck/scripts/{log-gap.sh, recent-gaps.sh}`는 core→ducking 승격 시 **경로 이동**(`ducking/scripts/`로). 모든 모드 SKILL.md의 `allowed-tools` + core.md(→ducking) 내 `${CLAUDE_PLUGIN_ROOT}/skills/duck/scripts/...` 경로 **전부 재지정**. R2 구조 블록의 `ducking/`에 `scripts/`도 포함시킬 것.
- **Phase 3 (마감):** §2 설정 다이얼+턴-스코핑, §6 README/plugin.json/marketplace.json desc 재작성, 버전 범프. **⚠️ major 유력 — `2.4.1 → 3.0.0`**: `/duck-design`·`/duck-plan` 명령이 제거(→`/duck-prebuild` 병합)되어 **사용자 인터페이스 파괴**(AGENTS.md SemVer: breaking=major). 로컬 소스라 `marketplace.json`만 범프. → commit.
- **문서:** ADR + CONTEXT.md (아래 Next Steps).

## What Worked

- **그릴 먼저, 코드 0줄.** 전체 결정트리를 한 질문씩 해소 → 큰 리팩터인데 재논쟁 여지 없는 원장 확보. 이 리듬 유지.
- **참고 프로젝트 실제 코드 정독** 후 단정(no-numb gate.sh, mattpocock grilling/ask-matt). 기억 아닌 소스로.
- **공식 문서로 사실 검증**(/branch 빌트인) → README 버그 발견. AGENTS.md의 "official docs 먼저" 규칙이 실익.

## What Didn't Work (다음 세션 주의)

- ⚠️ **환경 과적합 한 번 함.** "grill-with-docs가 before-build 소유하니 design/plan 삭제"라 추천했다가 유저가 "우린 배포 플러그인" 지적 → 철회. **교훈: duck은 다른 플러그인 0개 유저에게도 단독 작동해야 함. 동료 스킬은 있으면 합쳐지는 보완(이미 후크에 "딴 플러그인이 제안했으면 스킵" 패턴 있음).**
- ⚠️ **MC vs 게이트 설명 꼬임.** "객관식 빼면 게이트 폐기"라 과장했다 정정. 정확히는: 게이트=턴 살리기=도구호출(AskUserQuestion) 필요. MC는 그 자연스런 채움일 뿐, 자유입력도 턴 살림. 어쨌든 **게이트 자체를 거부**했으므로 이 논점은 죽음 — 다음 세션에서 다시 파지 말 것.

## Next Steps (First Action 이후)

1. Phase 1 commit 후 → Phase 2 → Phase 3 (위 실행 계획).
2. **ADR 생성** (`docs/adr/0003-*.md`, 기존 0001/0002 형식 따름): *"duck은 forcing-function 게이트(no-numb식)를 거부하고 출하지점 직면을 택한다."* — 되돌리기 어렵(아키텍처 전체 좌우)+놀랍(왜 강제 안 함?)+진짜 트레이드오프(no-numb 강점을 알고도 거부) 3요건 충족. 근거: duck 강령 + Anthropic 17% 연구. §1·§3 묶어 한 ADR.
3. **CONTEXT.md 생성** (`plugins/rubber-duck-tutor/CONTEXT.md` — 기존 `plugins/skill-creator-pro/CONTEXT.md`, `plugins/vision-powers/CONTEXT.md` 선례 따라 플러그인별). 이번에 벼린 용어 글로서리: `ducking`(재사용 이해규율 엔진), rubber-stamping, before-build vs after-build comprehension, ship-point confrontation, forcing function, 공유 출하예산. 형식은 mattpocock `skills/engineering/domain-modeling/CONTEXT-FORMAT.md` 참고 — **구현 디테일 금지, 순수 글로서리.**

## 핵심 파일 포인터

- 대상 플러그인: `plugins/rubber-duck-tutor/` (skills/{duck,duck-design,duck-plan,duck-verify,duck-review,duck-orient}, skills/duck/scripts/{log-gap.sh,recent-gaps.sh}, hooks/{hooks.json,lib.sh,post-plan.sh,post-write-plan.sh,post-pr.sh,post-push.sh})
- 공유 규칙 현 위치: `plugins/rubber-duck-tutor/skills/duck/references/core.md` (→ ducking으로 승격 대상)
- 참고: `references/no-numb/{hooks/gate.sh, skills/quiz-me/SKILL.md, README.md}`
- 참고: `references/mattpocock-skills/{README.md, skills/productivity/grilling/SKILL.md, skills/engineering/ask-matt/SKILL.md, skills/engineering/domain-modeling/CONTEXT-FORMAT.md}`
- 버전: `.claude-plugin/marketplace.json` (rubber-duck-tutor 2.4.1 — 로컬 소스라 버전은 여기만)
- 릴리즈: `docs/release-workflow.md` (8단계), git workflow는 develop 작업/main은 --no-ff

## 작업 상태

- duck 관련 코드 변경 **0** (그릴/설계만). 현재 브랜치 **develop**.
- 워킹트리 **깨끗** — 이 핸드오프 파일(`docs/handoff/2026-06-21-...md`, untracked)만 있음. (작성 중 잠깐 보였던 toolbox 미커밋 변경은 그 후 `b06b24b feat(toolbox): ground handoff facts against the repo`로 커밋됨 — duck과 무관, 이미 정리됨.)
