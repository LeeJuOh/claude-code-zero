---
topic: vision-powers-structured-blocks
date: 2026-06-27
---

# vision-powers diff-visual 구조화 블록 (issue 005) — Phase 1 구현완료, 커밋 전

## Goal

`docs/issues/005-vision-powers-structured-blocks.md` 구현. `diff-visual`이 파일맵·다이어그램만 그리고
**바뀐 코드 줄은 0개**이던 구멍을 메운다 — Builder.io `visual-recap`의 **구조화 블록 + build-time
grounding**(코드는 git에서 기계추출 verbatim, 모델은 산문만)을 zero-runtime 자기완결 HTML 정체성을
깨지 않고 흡수. 전체 = S1~S6, 3 페이즈. **Phase 1 = S1(split-diff) + S2(file-map flags)**.

이번 세션: Phase 1 코드 + eval까지 완료. **아직 커밋 안 함, 결함 2개 미수정.**

## First Action

**skill-creator-pro eval 뷰어를 다시 띄워서 "왜 깨져 보였는지" 직접 진단하라** (사용자 핵심 요청 #1).
이번 세션에서 나(이전 에이전트)는 진단 없이 성급히 죽였다 — 원인 **미상**.

```bash
SC="/Users/ljo/.claude/plugins/cache/claude-code-zero/skill-creator-pro/2.0.4/skills/skill-creator-pro"
WS="/Users/ljo/.claude/plugins/data/skill-creator-pro-claude-code-zero/vision-diff-structured"
nohup python3 "$SC/eval-viewer/generate_review.py" "$WS/iteration-1" \
  --skill-name "diff-visual-structured-blocks" \
  --benchmark "$WS/iteration-1/benchmark.json" > "$WS/viewer.log" 2>&1 &
# 그다음 브라우저로 열고, 화면을 render-report.js로 PNG 떠서 실제로 뭐가 깨졌는지 눈으로 확인
```

판정할 것: **generate_review.py(스킬) 결함인가, 내 셋업 실수인가.** 점검 가설 ↓ (What Didn't Work 참조).
진단 결과를 사용자에게 설명한 뒤, 아래 결함 2개 설명 → **개선방향 제시 → 사용자 승인 → 수정** 순서로 진행.
승인 없이 먼저 고치지 말 것 (사용자 명시 요청).

## Context

Phase 1 코드는 전부 짜였고 eval로 기능 검증까지 끝난 상태. 사용자가 eval 뷰어를 열었을 때 "깨져있다"고
했고, 내가 뷰어를 "껍데기"라 부르며 죽인 게 사용자를 혼란/불만스럽게 함. 사용자가 원하는 건 단순 진행이
아니라 **이해**: (1) 뷰어가 왜 깨졌는지 — 스킬 버그인지 내 실수인지, (2) eval이 잡은 결함 2개가 정확히
무엇이고 어떻게 고칠지 — 를 납득시키고 **승인받은 뒤** 수정하는 것. 다음 세션은 "코드부터 고치기"가 아니라
"설명 → 승인 → 수정" 모드로 가야 한다.

eval 자체는 성공적. 정량결과는 깨끗하고(아래), 진짜 수확은 점수보다 **eval이 잡아낸 실제 결함 2개**다.

## Current Progress

`repo_facts.sh` 기준 (branch `develop`, 미커밋 11 path — 아래 10개 작업 + 이 handoff 문서 자신):

**이번 세션 내 작업 (Phase 1, 전부 미커밋, working tree에만):**
- `?? plugins/vision-powers/scripts/extract-hunks.js` — 신규. `(scope, file, line-range)` → git에서
  hunk verbatim 추출 + HTML-escape, `language-*` 자동(확장자), `--stdin`(PR)/`--json` 모드,
  binary/missing/empty 안전. 엣지 5개 + git실경로 테스트 통과. **단 bare-sha 결함 있음(결함1).**
- `?? plugins/vision-powers/references/design-system/structured-blocks.md` — 신규. split-diff
  HTML/CSS, highlight.js CDN(cdnjs 11.9.0, github/github-dark, prefers-color-scheme, 명시 언어클래스),
  예산(3-8/≤150), build-time grounding 법칙, network-0 monospace degrade. 형제스킬용 범용.
- ` M plugins/vision-powers/skills/diff-visual/SKILL.md` — Key Changes 배선(`SKILL.md:145`, extract-hunks
  호출 `:158`), File Map change-flags(`--name-status` 기계도출), md 모드, visual self-audit 항목,
  reference 표(`:299`), description 갱신("실제 바뀐 코드도 보여줌").
- ` M .claude-plugin/marketplace.json` — vision-powers `4.4.2 → 4.5.0` (`marketplace.json:32`).
  *(주의: 50행의 4.5.0은 codex-advisor — 무관, 우연히 동일버전.)*
- ` M plugins/vision-powers/.claude-plugin/plugin.json` — description 갱신.
- ` M plugins/vision-powers/{CHANGELOG.md,README.md}` — 4.5.0 항목/표 갱신.

**선행 세션 산출물 (내 코드작업 아님, grill/domain-modeling 세션서 생성, 같이 미커밋):**
- `?? docs/adr/0005-structured-block-grounding-via-extraction.md`
- `?? docs/issues/005-vision-powers-structured-blocks.md`
- ` M docs/context/vision-powers.md` (+17: Structured block / Build-time grounding 용어)

**eval 결과 (skill-creator-pro 루프, 실제 커밋 3개, with-skill 신규 vs baseline=HEAD 스냅샷):**
- 워크스페이스: `/Users/ljo/.claude/plugins/data/skill-creator-pro-claude-code-zero/vision-diff-structured/`
- **Pass Rate: baseline 24% ±8% → with-skill 100% ±0%** (7개 객관 어서션). 비용: 시간 +199s, 토큰 +29k.
- 7/7·7/7·7/7 (신규) vs 2/7·1/7·2/7 (baseline). benchmark.md / grade.py / agent-map.txt / BUGS.md 워크스페이스에 있음.
- 게이트: 기존 42 테스트 통과(미변경), 샘플 split-diff 게이트 통과 — **추가 게이트검사 불필요 확인됨**(S1 AC).
- network-0 degrade: 헤드리스 렌더서 highlight.js 못 받아도 단색 monospace로 깔끔 — 시각 확인됨.

**미완료:** Phase 1 커밋 안 됨. 결함 1·2 미수정. Phase 2(S3)·Phase 3(S4/S5/S6) 미착수.

## Decisions Made

- **Phase 1 = S1+S2 병합 구현** — 둘 다 diff-visual 렌더, issue가 병합 허용("구현 시 판단").
- **eval baseline = HEAD 전체 vision-powers 스냅샷** (`git archive HEAD`), `$WS/skill-snapshot/`. baseline엔
  structured-blocks/extract-hunks/Key Changes 전무 — 의도대로.
- **highlight.js SRI 미적용** — 기존 Mermaid CDN도 SRI 없음. 로컬 단일파일 리포트, 차단돼도 monospace
  degrade로 안전. 한쪽만 SRI 붙이면 불일치 → 기존 패턴 유지. (보안훅 경고는 의식적 무시.)

## What Worked

- **tracer-bullet 수직절단** — extract-hunks.js → structured-blocks.md → SKILL 배선 → 게이트 → eval 한 줄로
  관통. 인프라를 S1 안에서 만든 게 맞았다.
- **6개 서브에이전트 동시 스폰**(3 with + 3 baseline) → 실제 diff로 풀 리포트 생성. 3명이 **독립적으로 결함1을
  발견** → 진짜 버그라는 강한 신호. eval이 점수 그 이상의 가치(실결함 적발)를 줌.
- **grade.py 자동채점** — 7 어서션 + 게이트 프로그램 검사. iteration 재사용 가능.

## What Didn't Work

- ⚠️ **eval 뷰어를 진단 없이 죽임** — 사용자가 "깨졌다" 했을 때 원인 안 보고 "껍데기"라 부르며 kill(PID
  49931, 이미 죽음). 이게 사용자 불만의 핵심. 다음 세션 First Action으로 **반드시 재현·진단**.
  점검 가설: (a) 임베드된 report iframe이 CDN(highlight.js/Mermaid) 실행 못 해 깨져 보임, (b) 뷰어 자체
  CSS/레이아웃, (c) run-1/ 재구성으로 run_id가 이상하게 표시, (d) 실제론 안 깨졌고 그냥 못생김/혼란. 띄워서
  눈으로 봐야 판정 가능. **이게 스킬(generate_review.py) 결함인지 내 셋업 실수인지가 사용자 질문.**
- **집계 스크립트 디렉터리 규약 함정** — `aggregate_benchmark.py`는 `eval-N/<config>/run-*/grading.json` +
  grading에 `summary` 블록을 요구. 처음 `<config>/` 직속에 두면 0% 나옴. `run-1/` 레벨 추가 + summary
  주입으로 해결(워크스페이스는 이미 재구성됨). 뷰어는 `outputs/` 가진 디렉터리 재귀탐색이라 양쪽 호환됨.
- "Read로 본 PNG는 사용자에게 안 보인다" — 산출물 보여줄 땐 `open <file>` 써야 함(이번에 한 번 헛발).

## eval이 잡은 결함 2개 (다음 세션: 설명 → 승인 → 수정)

### 결함 1 (HIGH) — extract-hunks.js bare-sha 오작동 — **내가 만든 코드 결함**
- 위치: `plugins/vision-powers/scripts/extract-hunks.js` `getDiffForFile()` (`:170`).
- 증상: 단일 커밋 sha를 주면 `git diff <sha> -- file`을 **먼저** 시도 → 이건 *커밋 vs 작업트리* 비교지
  *그 커밋 자체의 변경*이 아님. 그 파일이 이후 커밋서 바뀌면/삭제되면 엉뚱한 hunk(누적/통째삭제) 출력.
  `git show` 폴백은 `git diff`가 빈 경우에만 발동(`:178`)인데 빈 경우가 드물어 거의 안 탐.
- 영향: `diff-visual <커밋해시>` 단독 실행시 잘못된 코드 표시. eval 3명 전원 발동, `--stdin`/`sha~..sha`로 우회.
- 개선방향: 단일 hex-sha(범위표시 `..`/`...` 없음)면 `git show --format= <sha> -- file`을 **먼저** 쓰도록
  순서 교정 (diff-visual 자체 scope 규약 = 단일커밋→git show 와 일치). 테스트 추가.
- 출처: 코드 직접 결함. 스킬 사용자 책임 아님.

### 결함 2 (MED) — checkForbiddenColors 게이트 충돌 — **선행 게이트 결함, 신규 기능이 노출시킴**
- 위치: `plugins/vision-powers/scripts/artifact-gate.js` `checkForbiddenColors()` (`:221`, `const lower =
  html.toLowerCase()` 전체 스캔).
- 증상: 이 검사는 `stripCodeRegions`(`:112`) 안 거치고 **전체 HTML**서 금지 보라/fuchsia hex를 찾음.
  그래서 *금지 hex를 다루는 커밋*(eval-0 = fdc3a5f, 바로 그 hex 금지 추가 커밋)의 verbatim split-diff가
  그 hex를 정당히 포함 → false 위반 4건. 에이전트가 `#`→`&#35;` 인코딩으로 우회.
- 영향: source passthrough(verbatim)와 forbidden-color 게이트가 충돌. 보라hex 다루는 코드는 못 보여줌.
- 개선방향(정교): 단순 stripCodeRegions 불가 — 그건 mermaid(`<pre class="mermaid">`)까지 벗겨 보라색
  못 잡게 됨. 필요: `<style>` + 인라인 `style=` + mermaid 블록은 계속 스캔, **verbatim
  `<pre><code class="language-*">` 코드 패널만 면제**. 게이트 42-테스트 스위트에 케이스 추가.
- 출처: checkForbiddenColors는 선행(4.3/4.4.0). 내 verbatim-code 기능이 처음 노출시킴.

### 결함 3 (LOW, 블로커 아님) — ≤150줄 soft budget vs 통째 hunk 추출
- 197줄 단일 추가 hunk는 extract-hunks가 hunk 통째 필터라 못 자름. 에이전트들이 verbatim 우선해 collapsed로
  처리(타당). 개선: extract-hunks가 hunk 내부 서브 line-range 출력 지원(S3 annotated-code서 다룰 만함). **연기.**

## Next Steps (승인 후)

1. 뷰어 깨짐 진단 결과를 사용자에게 설명(스킬 결함 vs 셋업 실수 판정).
2. 결함 1·2 개선방향 사용자에게 설명 → **승인** 받기.
3. 승인되면: 결함1 수정(extract-hunks bare-sha 순서) + 테스트, 결함2 수정(forbidden-color 코드패널 면제) +
   게이트 테스트. 결함3는 연기 결정.
4. 재검증(게이트 테스트, extract-hunks 재테스트, 필요시 eval 일부 재실행).
5. **Phase 1 커밋** — `develop`에. 선행 ADR0005/issue005/context 변경도 같이 커밋할지 사용자 확인.
   영어 커밋, Co-Authored-By 없음, push는 명시 요청시만.
6. (이후 별도) Phase 2 = S3 annotated-code, Phase 3 = S4 data-model + S5 api-endpoint + S6 doc/plugin-visual 확장.

## Infrastructure State

- eval 뷰어 서버: PID 49931 (killed). 포트 3117. 재기동 명령은 First Action.
- eval 워크스페이스: `/Users/ljo/.claude/plugins/data/skill-creator-pro-claude-code-zero/vision-diff-structured/`
  (iteration-1/ 6 run, benchmark.json/md, grade.py, BUGS.md, agent-map.txt, skill-snapshot/).
- 미커밋 working tree (위 Current Progress) — 다음 세션 시작 시 그대로 있어야 함.
