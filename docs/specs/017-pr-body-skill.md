# Spec 017 — PR 본문 작성 스킬

> 생성: 2026-11-13 · 출처: grill-with-docs 세션 (진행 중)
> 대상 플러그인: 미정
> **상태**: 그릴 진행 중. 확정 결정만 아래 Decisions에 적는다.

## Sources

출처는 원본 레포와 원본 아티클만 쓴다 (위키 요약 제외).

| # | 경로 | 역할 |
|---|---|---|
| S1 | `references/pstack/skills/poteto-mode/playbooks/opening-a-pr.md` | 섹션 뼈대, 길이 제한, 제목 규칙 |
| S2 | `references/pstack/skills/technical-writing/SKILL.md:94` | "1분 브리핑" 문장 규칙 |
| S3 | `references/pstack/skills/benchmark-checklist/SKILL.md:34` | 성능 PR은 대표 숫자 1개 |
| S4 | `references/pstack/skills/blast-radius/SKILL.md:17,43,46` | Blast Radius 증명 방식 |
| S5 | `references/pstack/skills/unslop/` | 마지막 문장 필터 |
| S6 | `references/humanlayer-skills/plugins/visual-pr/skills/visual-pr/` | 그림으로 보여 주는 변경 개요 |
| S7 | `references/humanlayer-skills/plugins/show-me/skills/show-me/SKILL.md` | 그림 종류 선택 규칙 |
| S8 | `~/.claude/plugins/cache/mattpocock/mattpocock-skills/1.3.2/skills/engineering/pr/SKILL.md` | Merge Danger (one-way/two-way door) |
| S9 | `references/hr-folio/skills/pr-writing/SKILL.md` | 증거 표, 작성 출처 줄, 게시 전 확인 |
| S10 | `references/pr-lens/packages/agent-skill/manual.md:189,193` | 다이어그램 위치, 안 바뀐 부분 표시 |
| A1 | `raw-articles/What My Pull Requests Look Like Now.md` | S9 근거. 증거 표(:49-55), 정직성 규칙(:109-113), 순서(:121) |
| A2 | `raw-articles/I Don’t Want to Read What You Didn’t Write.md:18` | 독자의 질문 5개 |
| A3 | `raw-articles/Addressing the code review bottleneck.md:65,85,99` | impact, rollback cost, 테스트 결과 |
| A4 | `raw-articles/How the Claude Code team does code review.md:67,172` | 말 대신 실행 결과 |
| A5 | `raw-articles/Chapter 27 Check a measured performance number before you report it.md:351` | S3 근거 |
| A6 | `raw-articles/Chapter 28 Check what a change could break and where the diff is weak.md:100-106` | 증명 강도 5단계 |
| A7 | `raw-articles/Chapter 14 Open PRs and merge verified changes.md` | S1 옛 버전 해설 (2차) |
| A8 | `raw-articles/explain-diff.md` | PR 본문 아님, 별도 설명 문서 (참고만) |

## Constraints

- **C1 에이전트 호환.** Claude Code, Codex, Antigravity 등에서 그대로 동작한다. (사용자 요구 2026-11-13) 조사 사실:
  - frontmatter는 Agent Skills spec 6개 필드만 (`references/agentskills-spec/docs/specification.mdx:27-32`). CC 문서도 CC 밖에서는 이 6개만 쓰라고 한다 (`code.claude.com/docs/en/skills.md`, "Using skill frontmatter outside Claude Code").
  - 본문에 `${CLAUDE_*}`, `$ARGUMENTS`, `` !`cmd` ``, `@path`, 도구 이름(`AskUserQuestion`, `Bash`)을 쓰지 않는다. 질문은 산문으로 "ask the user … and wait"라고 쓴다. 질문 도구 이름이 에이전트마다 다르다 (CC `AskUserQuestion`, Codex `tool/requestUserInput`, Antigravity `ask_question` — `antigravity.google/docs/sdk/tools.md`).
  - 번들 파일은 skill root 기준 상대 경로. 스크립트는 TTY 입력 없이 인자와 stdout만 (`using-scripts.mdx:229-231`).
  - 탐색 경로가 다르다. CC는 `.claude/skills`·`<plugin>/skills`, Codex와 Antigravity는 `.agents/skills` (`learn.chatgpt.com/docs/build-skills.md`, `antigravity.google/docs/skills.md`). CC 플러그인 skill은 다른 에이전트에서 안 보인다 → 배포 방식은 별도 결정.
  - 답을 받을 수 없는 모드(CC `-p`, Codex approval never, Antigravity headless)에서의 기본 동작을 스킬에 적는다.

## Decisions

- **D1 분량: 짧게.** 1분 브리핑, 대략 40줄 이하 (S1:13, S2:94). 이미지·영상은 넣을 수 있다 (S1:22). 넘친 내용은 본문 밖에 둔다 — 위치는 미정. (그릴 2026-11-13)

- **D2 섹션과 순서: pstack 고정 순서.** Why · What changed · Scope · Tradeoffs · Blast Radius · Verification, `##` 헤딩, 할 말 없는 섹션은 뺀다 (S1:13-20). 변경 두 곳: What changed는 그림 (S6 `SKILL.md:31`), Verification은 변경 유형별 증거 표 (A1:49-55), 성능은 대표 숫자 1개 (S3:34). Hugo의 증거-앞 순서(A1:121)는 긴 본문 전제라 D1과 맞지 않아 기각. (그릴 2026-11-13)

- **D3 넘친 내용: 넘칠 때만 사용자에게 묻는다.** 선택지는 "PR 코멘트에 `<details>`로 접어서" 또는 "별도 linked artifact, 링크는 사용자가 준다". 플랫폼은 사용자마다 달라 스킬이 정하지 않는다. `userConfig` 설정은 만들지 않는다. 근거: pstack은 linked artifact로 뺀다 (S1:22, S3:34). 핵심 그림은 본문에, 접기는 GitHub 코멘트에서 쓴다 (S10:99,189). 코멘트를 넘친 내용의 자리로 정한 출처는 없다(판단). (그릴 2026-11-13)

- **D4 플랫폼: 가리지 않는다.** 본문은 플랫폼 중립으로 쓴다. 올릴 때 레포의 forge를 확인하고 그 CLI(`gh`, `glab` 등)가 있으면 쓰고, 없으면 본문만 출력한다. 근거: pstack "per the resolved forge" (S1:28), pr-lens의 forge별 처리 (S10:86,99). visual-pr·Hugo는 `gh`만 (S6:17,44). (그릴 2026-11-13)

- **D5 접기 조건: forge가 렌더할 때만 `<details>`로 접는다.** 스킬 문장은 "Fold the details with `<details>` when the forge renders it." 한 줄이고 특정 forge 이름은 쓰지 않는다. 조건이 없으면 태그가 글자 그대로 보인다 (S10:86,99). D3 보완. (그릴 2026-11-13)

- **D6 미리보기 없음: 바로 올린다.** 스킬 호출이 곧 게시 의도다. 올린 뒤 PR 링크를 주고, 사용자가 고칠 곳을 말하면 고친다. 본문 수정은 되돌릴 수 있다 (S8 two-way door). 멈추는 곳은 D3 질문(넘친 내용이 있을 때)뿐이다. 근거: pstack·visual-pr는 바로 올린다 (S1:30, S6:44). Hugo의 게시 전 승인(S9:10)은 기각. 기각 비용: PR 생성 알림에 첫 본문이 실릴 수 있다(추론). (그릴 2026-11-13)

- **D7 스크립트 검사: 섹션만 막고 줄 수는 경고.** 올리기 전에 스크립트로 `##` 섹션 이름과 순서를 검사하고, 틀리면 실패한다. 줄 수는 40줄을 넘으면 경고만 한다(D1 "대략", D3로 넘김). 런타임 요구는 `compatibility` 필드에 적는다 (`references/agentskills-spec/docs/skill-creation/using-scripts.mdx:86`). 근거: pstack `check-plan.mjs` (`poteto-mode/playbooks/multi-phase-plan.md:10`), AGENTS.md "Deterministic first". 참고 PR 스킬(S6, S8, S9)에는 스크립트 검사가 없다. (그릴 2026-11-13)

- **D8 검사 스크립트 언어: node `.mjs`, 내장 모듈만.** `npm install` 없이 `node scripts/<name>.mjs <body.md>`로 돌린다. `compatibility`에 Node.js 요구를 적는다. 근거: PR 참고 스킬 중 실행 검사 스크립트는 pstack `check-plan.mjs`뿐이고 `node:fs`·`node:process`만 쓴다. 여러 에이전트용 레포의 `scripts/` 확장자 수: anthropics-skills py 62·sh 2, openai-skills py 42·js/mjs 14·sh 4, vercel-agent-skills mjs 16, agent-skills js 14 (직접 셈). 되돌리기 쉬운 구현 세부라 에이전트가 정함, 사용자 동의. (그릴 2026-11-13)

- **D9 제목: 형식은 레포 규칙, 내용은 pstack 원문.** 형식은 레포의 최근 PR 제목·커밋 규칙을 따르고, 없으면 Conventional Commits `type(scope): subject`, 끝 마침표 없음, 명령형 (S1:11). 내용은 pstack 원문 그대로 "names a real symbol when one carries the change"(S1:11). 처음 더한 "영역 말고 변경" 규칙은 출처 없음으로 보고 뺐다. 단 나중에 찾은 간접 출처: "A description of “Bug fix” is not helpful"(`raw-articles/Software Engineering at Google.md:165`, 본문 설명 대상). 제목은 D7 스크립트로 검사하지 않는다(레포 규칙이 다양함). 다른 참고 스킬(S6, S8, S9, S10)에는 제목 규칙이 없다. A1:11은 제목·본문을 묶은 비판이라 제목 근거에서 뺐다. (그릴 2026-11-13)

- **D10 작성 출처 줄: 넣지 않는다.** Hugo의 첫 줄 "Written by an AI agent on behalf of @handle… has not reviewed it yet."(S9:12-25)은 빼다. 이유: 참고 스킬 중 Hugo만 쓴다(S1, S6, S8, S10에 없음, 직접 grep). "아직 안 읽음" 상태는 Hugo가 리뷰 뒤 손으로 고치는데(S9:23) 이 스킬은 올리고 끝나서(D6) 거짓이 남는다. handle을 물으면 D6·C1과 충돌한다. 기각한 근거: 팀 레포에서 리뷰어가 첫 리뷰어임을 안다(A1:41). 팀 레포에서 필요해지면 다시 정한다. (그릴 2026-11-13)

- **D11 증거: Hugo 표 + 짧게.** SKILL.md에 변경 종류별 증거 표를 둔다. 행은 Hugo 7행 (S9:42-48, A1:49-55): 화면 / 명령어·빌드 / 버그 / 성능 / AI·에이전트 동작 / 새 API·기능 / 그 밖. 표는 에이전트용 규칙이고 본문에 넣지 않는다. 본문 Verification은 돌린 것과 결과를 1~3 불릿으로 쓴다 (S1:20, A4:67,172). 성능 행은 Hugo의 실행 횟수·편차 대신 대표 숫자 1개 `before → after` + 단위 (S3:34, A5:351), 나머지는 D3 넘친 내용으로. 출력은 실제 줄을 잘라 그대로 붙이고 고치지 않는다, 뺀 곳은 `…` (S9:43 "Never retype or tidy"). 자르기 허용은 S1:20·A4:172를 합친 판단. 충돌 해소: mattpocock의 의사코드 테스트(S8:164)는 기각, 실제 출력(S9:43, A4:67, A6:102 "말로만은 가치 없음")을 따른다. (그릴 2026-11-13)

- **D12 문장 필터: 스킬 안에 직접 담는다.** pstack `technical-writing`(S2:85-95)·`unslop`(S5)에서 PR 본문에 맞는 규칙 10개 안팎만 골라 스킬에 넣는다(짧은 문장, 한 대상 한 이름, 긴 대시 금지, AI 단어 금지, 굵은 글씨+콜론 목록 금지 등). 외부 스킬 호출은 다른 에이전트에서 동작하지 않는다(C1). pstack은 MIT (`references/pstack/LICENSE`). 다른 출처의 길이 규칙: Why 한 문장 (S6:29), 문단 1~2문장·30단어 이하 (S10:162). Hugo·mattpocock에는 문장 필터가 없다. (그릴 2026-11-13)

- **D13 스크립트 문장 검사: pstack과 같은 3개만 실패.** 코드 블록·백틱 밖에서 긴 대시(`—` `–`), 둥근 따옴표, 문장 중간 콜론(`: ` 뒤 글자)이 나오면 실패 (`references/pstack/skills/poteto-mode/scripts/check-plan.mjs:78-80`). AI 단어 목록은 스크립트에 넣지 않고 D12 문장 규칙(에이전트 판단)에 맡긴다. 이유: 오탐("enhance" 정상 사용), 참고 레포(pstack, desloppify, humanizer)에 스크립트 전례 없음(grep). (그릴 2026-11-13)

- **D14 스킬 경계: 본 증거만 쓴다.** 이 스킬은 증거를 새로 만들지 않는다(테스트 실행, 스크린샷 촬영 없음). 에이전트가 실제로 본 증거만 쓴다 ("Never invent a result", S9:62). 변경 종류에 맞는 증거(D11 표)를 못 찾으면 본문에 "안 했다"가 아니라 "못 찾았다"로 쓴다. 에이전트가 못 본 곳에 증거가 있을 수 있어서다(판단). 올린 뒤 채팅 답장에서 빠진 증거를 종류별로 알려 주고, 사용자가 주면 본문을 고친다(D6 two-way door, 멈춤 아님). 증거 찾을 장소 목록은 두지 않는다(목록 밖을 안 찾게 됨, 사용자 기각). 근거: 보고만 하는 편 S1:3,22, S4, S6:22-27, A4:67, A3:99 / 직접 찍는 편 A1:27, S9:50(단 S9:10 "description only"와 모순), S8:162 조건부. 기각 비용: 앞 단계에서 증거를 안 만든 세션은 "못 찾음"으로 올라간다. (그릴 2026-11-13)

- **D15 What changed 내용: 바뀐 모양만.** 파일별 목록이 아니라 리뷰어가 알아야 할 모양의 변화를 보여 준다. 종류는 계약(API 요청·응답, 엔드포인트, 이벤트 형식), 데이터 구조(DB 테이블·컬럼, 핵심 타입), 설정값(환경 변수, 설정 파일, feature flag), 흐름(호출, 데이터, 아키텍처). 바뀐 종류만 넣는다(S6:39). (마이그레이션이면 데이터 구조를 꼭 넣는다는 규칙은 "바뀐 종류만"과 중복이라 뺐다. S10:15.) 계약·데이터 구조·설정값은 `diff` 블록, 대부분 새것이면 전체 모양(S6:38, S8:93,143). 새 API는 쓰는 코드를 보인다(A1:55). 파일 트리는 쓰지 않는다. diff 화면의 파일 목록과 겹치고(S1:13,22), A2:18의 기계식 나열에 가깝다(사용자 판단). 책임이 옮겨 가면 흐름 그림에 넣는다. 기각한 출처: S6:35, S8:85-89. 설정값 행은 PR 스킬 출처 없음(판단, 간접 S4:35, A4:76). (그릴 2026-11-13)

- **D16 흐름 그림: 에이전트가 그린다, 도구 순서.** 흐름은 그림으로 쓴다(S7:47, S8:76-84, S10:189). 그림은 증거가 아니라 diff에서 나온 설명이라 에이전트가 새로 그려도 된다(D14와 다름, S6:22-37, S8:15-17). 규칙: "diff를 보고 그린다. 맞는 그림이 이미 있으면 그것을 쓴다." 옛 그림 확인과 그림 채팅 알림은 뺐다(출처 없음, 과함). 새로 그릴 때 순서: 에이전트의 그림 스킬·도구(이름은 적지 않음, C1) → forge가 렌더하는 그림 문법(예: Mermaid, 고정 아님) → 글자 그림. 이미지는 PR에 올린다(D18). HTML은 새로 만들지 않고, 이미 있고 링크가 있을 때만 링크를 넣는다(A4:177-185는 학습 자료, PR 본문 아님). 그림 스킬이 HTML만 내면 다음 순서로 넘어간다. 참고 스킬 중 외부 그림 스킬에 맡기는 곳은 없다. visual-pr는 그림 규칙을 번들한다(S6:26 `references/show-me.md`). (그릴 2026-11-13)

- **D17 그림 규칙: 에이전트가 직접 그릴 때만.** 규칙 3개: 생각 하나에 그림 하나(S10:189), 바뀌지 않은 주변도 그린다(S10:193), 중심 연결은 1~2개만 강조(S10:195). D16 케이스별 적용: 이미 있는 그림을 쓸 때 ✕(그대로 씀), 그림 스킬이 그릴 때 ✕(그 스킬 규칙), 에이전트가 그림 문법·글자 그림으로 그릴 때 ○. 근거: visual-pr는 그림 규칙을 번들한다(S6:26). 처음 전역 규칙으로 제안했다가 사용자가 케이스 적용 범위를 바로잡음. (그릴 2026-11-13)

- **D18 이미지 올리기: 한 줄만.** SKILL.md에 "이미지는 PR에 올린다. 브랜치에 커밋하지 않는다. 못 올리면 채팅에서 알린다." 한 줄만 둔다. 올리는 방법은 에이전트가 forge에 맞게 찾는다. 근거: Hugo 한 줄(S9:56), pstack "attach" 한 마디(S1:22), visual-pr·mattpocock은 언급 없음. 사실: GitHub 문서에 `gh pr create/edit --attach`가 있다(docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli, 2026-11-13 확인), 로컬 `gh` 2.95.0에는 없다(직접 확인). GitLab은 `POST /projects/:id/uploads`, 응답에 `markdown` 필드(docs.gitlab.com/api/project_markdown_uploads). 처음 케이스 표로 제안했다가 사용자가 과하다고 바로잡음. (그릴 2026-11-13)

- **D19 분량과 언어: 참고 스킬 수준, 영어.** SKILL.md는 900단어 이하(스크립트 제외). 참고 스킬 분량(직접 셈): visual-pr 490(+그림 규칙 파일 406), mattpocock 568, Hugo 909, pstack PR 929, pr-lens 4,829(전용 CLI 설명서라 제외). 확정한 결정은 모두 동작하게 담는다. spec의 근거·기각 이유는 SKILL.md에 넣지 않고 규칙만 넣는다. 넘치면 규칙 문장을 줄이고 별도 파일로 옮기지 않는다. 언어는 영어(AGENTS.md Coding Style). (그릴 2026-11-13)

- **D20 레포 PR 템플릿: 무시하고 우리 양식.** 레포에 PR 템플릿이 있어도 D2 섹션으로 쓴다. D7 섹션 검사는 언제나 돈다. 근거: 일반 PR 스킬 4개 중 3개가 자기 양식만 쓴다(visual-pr S6:51 "Do not expand the PR body beyond that template", mattpocock S8:12, pstack S1:13). 레포 템플릿을 따르는 곳은 Hugo(S9:25)와 symphony(`references/symphony/.codex/skills/push/SKILL.md:47`, 자기 레포 전용)뿐. 기각 이유: 템플릿마다 섹션이 달라 에이전트가 우리 내용을 어느 섹션에 넣을지 매번 추측한다(사용자 판단). 기각 비용: 템플릿 레포에서 필수 항목(체크박스 등)이 빠지고, CI가 본문 형식을 검사하는 레포(`references/symphony/.github/workflows/pr-description-lint.yml:38`)에서는 막힌다. 팀 레포에서 필요해지면 다시 정한다. (그릴 2026-11-13)

## Open

다음 질문 순서대로. 한 번에 하나씩, 출처와 추천을 붙여 묻는다. 새 규칙은 이미 정한 케이스 중 어디에 적용되는지 먼저 표로 확인한다.

- **되돌리는 방법 (다음, 답 대기).** Claude Code 팀 템플릿이 "How to revert"를 묻는다(`raw-articles/How the Claude Code team does code review.md:98,219`). A3:80 rollback cost. mattpocock one-way/two-way door(S8:168). pstack Blast Radius는 "safe or risky" 1~2문장, 되돌리기 언급 없음(S1:19). D2에 자리가 없다. 제안: 새 섹션 없이 Blast Radius 안에 한 문장(예: "revert 커밋 하나로 되돌린다" / "DB 컬럼을 지워 revert로 데이터가 돌아오지 않는다"). 추천 예.
- **같은 PR에서 다시 부를 때 (위키 감사).** 본문을 PR 전체 범위로 새로 쓰고 옛 문장을 재사용하지 않는다(`references/symphony/.codex/skills/push/SKILL.md:51-54`), 리뷰 중 새 결정은 설명에 반영(`raw-articles/Software Engineering at Google.md:167`).
- **D6 반대 근거 기록 (위키 감사).** "Claude can fill that in, but the person who asked for the change signs off on it."(How the Claude Code team…:98), 작성자가 diff를 읽고 설명을 고친다(`raw-articles/The Brain Sandwich.md:31`). 감사 제안: D6 유지(스킬 호출이 확인), 기각 근거로만 적는다.
- Blast Radius 증명 강도: A6:100-106, S4:20-28 5단계를 쓸지.
- 스킬 이름, 둘 플러그인, 에이전트별 배포 경로 (C1 탐색 경로 차이).

## Resume

그릴 일시정지 2026-11-13 (3차, D14~D20 확정). 재개 시 `/mattpocock-skills:grill-with-docs`로 이 파일을 읽고 Open 첫 항목(되돌리는 방법)의 제안부터 다시 묻는다. 그 뒤 순서: 같은 PR 재호출 → D6 반대 근거 기록 → Blast Radius 증명 강도 → 스킬 이름·플러그인·배포 경로. 그릴이 끝나면 구현 전에 사용자 승인을 받는다.

사용자 선호: 질문은 하나씩, 짧고 쉬운 한국어(영어 문장 그대로 던지지 말고 번역, 예시 붙이기). 장황하게 말하지 않는다. 근거는 출처 경로:줄(스킬 S*와 아티클 A* 둘 다), 추천을 반드시 붙인다. 출처 간 충돌을 먼저 찾아 보고하고, 참고 스킬들이 실제로 어떻게 하는지 표로 먼저 보인다. 예시는 예시라고 밝힌다. 플랫폼(GitHub 등)을 단정하지 않는다.

주의(이번 세션에서 사용자가 바로잡은 것): 1) 출처 없는 규칙을 과하게 더하지 않는다(D9, D15, D16, D18 축소). 참고 스킬이 한 줄로 끝내는 것은 한 줄로. 2) 새 규칙은 이미 정한 케이스 중 어디에 적용되는지 먼저 확인한다(D17). 3) 새 용어·섹션을 꺼낼 때 그것이 무엇인지 예시로 먼저 설명한다. 4) SKILL.md는 900단어 이하, 영어, 확정 결정은 모두 동작하게(D19).
