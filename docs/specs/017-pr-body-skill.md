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

- **D9 제목: 형식은 레포 규칙, 내용은 항상 "무엇을 바꿨나".** 형식은 레포의 최근 PR 제목·커밋 규칙을 따르고, 없으면 Conventional Commits `type(scope): subject`, 끝 마침표 없음, 명령형 (S1:11). 내용 규칙은 형식과 무관하게 적용한다. subject는 영역이 아니라 무엇을 바꿨는지(동사 + 대상)를 쓰고, 변경을 대표하는 코드 이름이 있으면 넣는다. 예: `refactor(auth): move token refresh into AuthClient` ⭕, `refactor(auth): refactor auth` ❌. pstack 원문 "names a real symbol when one carries the change"(S1:11)는 조건부라 건너뛸 수 있어 "영역 말고 변경" 규칙을 더했다(판단, 출처 없음). 제목은 D7 스크립트로 검사하지 않는다(레포 규칙이 다양함). 다른 참고 스킬(S6, S8, S9, S10)에는 제목 규칙이 없다. A1:11은 제목·본문을 묶은 비판이라 제목 근거에서 뺐다. (그릴 2026-11-13)

- **D10 작성 출처 줄: 넣지 않는다.** Hugo의 첫 줄 "Written by an AI agent on behalf of @handle… has not reviewed it yet."(S9:12-25)은 빼다. 이유: 참고 스킬 중 Hugo만 쓴다(S1, S6, S8, S10에 없음, 직접 grep). "아직 안 읽음" 상태는 Hugo가 리뷰 뒤 손으로 고치는데(S9:23) 이 스킬은 올리고 끝나서(D6) 거짓이 남는다. handle을 물으면 D6·C1과 충돌한다. 기각한 근거: 팀 레포에서 리뷰어가 첫 리뷰어임을 안다(A1:41). 팀 레포에서 필요해지면 다시 정한다. (그릴 2026-11-13)

- **D11 증거: Hugo 표 + 짧게.** SKILL.md에 변경 종류별 증거 표를 둔다. 행은 Hugo 7행 (S9:42-48, A1:49-55): 화면 / 명령어·빌드 / 버그 / 성능 / AI·에이전트 동작 / 새 API·기능 / 그 밖. 표는 에이전트용 규칙이고 본문에 넣지 않는다. 본문 Verification은 돌린 것과 결과를 1~3 불릿으로 쓴다 (S1:20, A4:67,172). 성능 행은 Hugo의 실행 횟수·편차 대신 대표 숫자 1개 `before → after` + 단위 (S3:34, A5:351), 나머지는 D3 넘친 내용으로. 출력은 실제 줄을 잘라 그대로 붙이고 고치지 않는다, 뺀 곳은 `…` (S9:43 "Never retype or tidy"). 자르기 허용은 S1:20·A4:172를 합친 판단. 충돌 해소: mattpocock의 의사코드 테스트(S8:164)는 기각, 실제 출력(S9:43, A4:67, A6:102 "말로만은 가치 없음")을 따른다. (그릴 2026-11-13)

- **D12 문장 필터: 스킬 안에 직접 담는다.** pstack `technical-writing`(S2:85-95)·`unslop`(S5)에서 PR 본문에 맞는 규칙 10개 안팎만 골라 스킬에 넣는다(짧은 문장, 한 대상 한 이름, 긴 대시 금지, AI 단어 금지, 굵은 글씨+콜론 목록 금지 등). 외부 스킬 호출은 다른 에이전트에서 동작하지 않는다(C1). pstack은 MIT (`references/pstack/LICENSE`). 다른 출처의 길이 규칙: Why 한 문장 (S6:29), 문단 1~2문장·30단어 이하 (S10:162). Hugo·mattpocock에는 문장 필터가 없다. (그릴 2026-11-13)

- **D13 스크립트 문장 검사: pstack과 같은 3개만 실패.** 코드 블록·백틱 밖에서 긴 대시(`—` `–`), 둥근 따옴표, 문장 중간 콜론(`: ` 뒤 글자)이 나오면 실패 (`references/pstack/skills/poteto-mode/scripts/check-plan.mjs:78-80`). AI 단어 목록은 스크립트에 넣지 않고 D12 문장 규칙(에이전트 판단)에 맡긴다. 이유: 오탐("enhance" 정상 사용), 참고 레포(pstack, desloppify, humanizer)에 스크립트 전례 없음(grep). (그릴 2026-11-13)

## Open

다음 질문 순서대로. 한 번에 하나씩, 출처와 추천을 붙여 묻는다.

- **Q9 스킬 경계 (답 대기, 먼저 확정).** 제안: 이 스킬은 증거를 새로 만들지 않고 에이전트가 실제로 본 증거만 쓴다 ("Never invent a result", S9:62). 변경 종류에 맞는 증거(D11 표)를 못 찾으면 본문에 "안 했다"가 아니라 "못 찾았다"로 쓴다(판단). 올린 뒤 채팅 답장에서 빠진 증거를 종류별로 알려 주고, 사용자가 주면 본문을 고친다(D6 two-way door, 멈춤 아님). 증거 찾을 장소 목록은 사용자가 기각(목록 밖을 안 찾게 됨). 근거: 보고만 하는 편 S1:3,22, S4, S6:22-27, A4:67, A3:99 / 직접 찍는 편 A1:27, S9:50(단 S9:10 "description only"와 모순), S8:162 조건부. 기각 비용: 앞 단계에서 증거를 안 만든 세션은 "못 찾음"으로 올라간다.
- **Q8 그림 방식 (답 대기, Q9 뒤 재확인).** 제안: 1) 기본은 코드 블록 글자 그림(`diff`, 파일·호출 트리) (S6:31, S7) 2) 흐름은 forge가 렌더할 때만 Mermaid, 아니면 글자 트리 (D5와 같은 조건) 3) 화면은 스크린샷 (Q9가 확정되면 "이미 있는 스크린샷") 4) 생각 하나에 그림 하나, 안 바뀐 주변도 그린다 (S10:189,193). pr-lens 전용 CLI(S10:28)는 C1 때문에 안 쓰고 규칙만 가져온다 5) HTML은 만들지 않고 있으면 링크만 (A4:185는 PR 본문이 아니라 팀원 학습용 설명 자료, A4:177-185. A8도 별도 문서). 사용자는 Mermaid 긍정.
- 스크린샷·영상 올리는 곳. Hugo는 브랜치 커밋 금지, PR에 업로드 (S9:56). pr-lens는 `gh pr create --attach`로 올린다고 하나 (S10:51) 로컬 `gh` 2.95.0 `--help`에 `--attach` 없음 (직접 확인). forge마다 다름 (D4). Q9가 "모으기만"이면 범위가 줄어든다.
- Blast Radius 증명 강도: A6:100-106, S4:20-28 5단계를 쓸지.
- 스킬 이름, 둘 플러그인, 에이전트별 배포 경로 (C1 탐색 경로 차이).

## Resume

그릴 일시정지 2026-11-13 (2차, D7~D13 확정). 재개 시 `/mattpocock-skills:grill-with-docs`로 이 파일을 읽고 Open 첫 항목(Q9)부터 묻는다. 사용자 선호: 질문은 하나씩, 짧고 쉬운 한국어(영어 문장 그대로 던지지 말고 번역, 예시 붙이기), 근거는 출처 경로:줄(스킬 S*와 아티클 A* 둘 다 찾아 붙인다), 추천을 반드시 붙인다. 출처 간 충돌을 먼저 찾아 보고한다. 예시는 예시라고 밝힌다. 플랫폼(GitHub 등)을 단정하지 않는다. 구현은 그릴 종료와 사용자 승인 후.
