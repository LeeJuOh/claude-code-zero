---
topic: vision-powers-review-fixes
date: 2026-06-27
---

# vision-powers Phase 1 사후 검수 — 결함 3개 수정 (미착수, 방향 확정)

## Goal

방금 커밋한 vision-powers Phase 1(08f3ee1)을 서브에이전트 2명이 검수해 찾은 결함 3개를 고친다:
**SEC-1**(extract-hunks scope option injection, 보안), **GATE-2**(stripVerbatimCode 정규식 취약),
**BUG-3/delete-language**(삭제파일 language 오류). 각각 테스트 추가 → 게이트 재실행 → vision-powers
`4.5.1`로 범프해 커밋. 수정 방향은 전부 확정됨 — 결정할 것 없음(아래 Decisions).

## First Action

**SEC-1 먼저 고쳐라**(보안, 내가 방금 커밋한 코드의 실존 취약점).
`plugins/vision-powers/scripts/extract-hunks.js`의 `getDiffForFile()`에서, `scopeArgs` 계산 직후
`-` 시작 토큰 있으면 거부:

```js
// getDiffForFile(): scopeArgs = scope.trim().split(/\s+/)  바로 다음 줄에 추가
if (scopeArgs.some(a => a.startsWith('-'))) return '';
```

이유: `scope`가 공백 split돼 `git diff` 의 `--` **앞**에 spread됨. `--`는 `file`만 보호. 정상
scope(HEAD/브랜치/sha/range)는 절대 `-`로 시작 안 하므로 이 가드는 안전. `return ''` = safe-empty
("스킬 안 죽임" exit-0 계약과 일치, 확정). 그다음 `extract-hunks.test.js`에 option-injection 거부
테스트 추가(`"HEAD --output=/tmp/x" file` → 빈 결과 + 파일 안 생김 확인).

## Context

이번 세션 흐름: (1) eval 뷰어 깨짐 진단→수정(fedb238 커밋), (2) Phase 1 결함 1·2 수정→Phase 1
커밋(08f3ee1), (3) 사용자가 "서브에이전트로 vision-powers 검수" 요청 → cavecrew-reviewer +
general-purpose 2명 병렬 리뷰 → 결함 3개 적발. 사용자가 "바로 고치면 되냐 vs 방향 결정?" 물었고,
**방향 확정(결정 불필요)** 답한 직후 핸드오프 요청. 즉 다음 세션은 "설명/결정"이 아니라 **바로 수정** 모드.

검수가 통과시킨 항목(재검증 불필요): escapeHtml(5 SGML, `&` 먼저), hunk 줄번호 off-by-one 없음,
range overlap, bare-sha 라우팅(uppercase 포함), crash-safe 계약. 핵심 로직은 정상 — 결함은 가장자리.

## Current Progress

`repo_facts.sh` 기준: branch `develop`, 미push 3개(`origin/develop..develop`). 코드는 깨끗 — working
tree에 미커밋 변경 없음(단 이 핸드오프 `.md` 자체는 untracked, 다음 세션서 fix와 같이 커밋).

- `08f3ee1` vision-powers 4.5.0 — structured split-diff blocks + Phase1 결함1·2 fix + docs (커밋됨)
- `fedb238` eval 뷰어 fix (escape + sandboxed iframe) — skill-creator-pro 2.0.5 (커밋됨)
- `a739a5b` (선행 세션, llm-wiki symlink) — 미push

**검수 결함 3개 = 전부 미착수.** working tree 깨끗 = 아직 한 줄도 안 고침. 다음 세션이 처음부터 적용.

## Decisions Made

- **SEC-1 막을 때 `return ''`** (safe-empty), `exit 2` 아님 — "git 실패해도 스킬 안 죽임" 계약 일치.
- **수정 범위 = vision-powers만** → 한 커밋, `4.5.0 → 4.5.1`(patch, 보안fix 포함). `marketplace.json`
  vision-powers 항목만 범프. (skill-creator-pro는 무관.)
- **BUG-3(따옴표 경로)·NOTE-4(순수 hex 브랜치명)는 연기** — 병적 엣지, 블로커 아님.

## 수정할 결함 3개 (방향 확정, 바로 적용)

### SEC-1 (HIGH, 보안) — extract-hunks scope option injection
- 위치: `extract-hunks.js` `getDiffForFile()` (현재 `:171`, `scopeArgs`는 `:175`).
- 증상: `git diff ...scopeArgs -- file`서 scope가 `--` 앞 → `"HEAD --output=/victim" file`이
  `git diff HEAD --output=/victim -- file` 되어 **임의 파일 덮어쓰기**. `--ext-diff`+config → 명령실행.
  main()의 `argv.filter(startsWith('--'))`(`:282`)는 split **이전**이라 우회됨.
- Fix: First Action 참조 (scopeArgs에 `-` 시작 토큰 거부 + 테스트).

### GATE-2 (MED) — stripVerbatimCode 정규식 너무 빡빡
- 위치: `artifact-gate.js` `stripVerbatimCode()` (`:128`), `checkForbiddenColors`가 호출(`:238`).
- 증상: 현재 `/<code\s+class="language-..."/` = class가 `<code` 바로 뒤여야 매치. `<code data-line="1"
  class="language-js">`처럼 속성 먼저 오면 miss → 코드패널 내 보라hex 못 벗김 → 결함2 false위반 재발.
- Fix: `/<code\b[^>]*class="language-[^"]*"[^>]*>[\s\S]*?<\/code>/gi`. artifact-gate.test.js에 속성-순서
  변형 케이스 추가(`<code data-x="1" class="language-js">#8b5cf6</code>` → 면제 확인).

### BUG-3 (LOW) — 삭제파일 language 오류
- 위치: `extract-hunks.js` `buildResult()` (`:234`, `const language = languageFor(entry.newPath || file)`).
- 증상: 삭제 파일은 `entry.newPath === "/dev/null"`(truthy) → `languageFor`가 `plaintext`. before-pane
  하이라이트 죽음(내용·escape는 정상, verbatim 보장 안 깨짐 — 외관만).
- Fix: `const language = languageFor(file);` (user-supplied path는 modify/rename-new/delete 전부 정확.
  binary 분기 `:231`도 이미 `file` 씀). extract-hunks.test.js에 삭제 커밋 case 추가.

## Next Steps

1. **First Action** = SEC-1 fix + 테스트.
2. GATE-2 fix(정규식) + artifact-gate.test.js 케이스.
3. BUG-3 fix(`languageFor(file)`) + extract-hunks.test.js 삭제-파일 케이스.
4. 게이트 재실행: `cd plugins/vision-powers/scripts && node --test` (현재 49 pass — 추가분 합쳐 green 확인).
5. `marketplace.json` vision-powers `4.5.0 → 4.5.1`, CHANGELOG에 `## 4.5.1` Fixed 항목(SEC-1 보안 명시).
6. 커밋(develop, 영어, Co-Authored-By 없음). push는 사용자 명시 요청시만(현재 3개 미push 누적).

## Infrastructure State

- 미push 커밋 3개(`develop` ahead origin 3). push 보류 중.
- eval 뷰어 검증 산출물: scratchpad의 `viewer-iframe.png`(라이브 렌더 성공본) — 참고용, 재현 불필요.
- 검수 서브에이전트 ID(필요시 SendMessage 재개): cavecrew-reviewer `a6e7845467e707c91`,
  extract-hunks 심층감사 `ad322d77316a22c73`. (새 세션선 만료 가능 — 없으면 재스폰.)

## What Worked

- **서브에이전트 2명 병렬 검수**(diff 전반 + 단일파일 심층) — general-purpose가 SEC-1을 `git diff
  --output` 실증까지 해서 잡음. 단일 핵심파일은 깊게, diff 전반은 넓게 = 역할 분리가 적중.
- **설명→승인→수정** 리듬 — 사용자가 "결정할 거 있냐"를 반복 확인. 방향 명확하면 "바로 고쳐"가 답.
