# Spec 017 — PR 본문 작성 스킬

> 생성: 2026-11-13 · 출처: grill-with-docs 세션 (진행 중)
> 대상 플러그인: `plugins/one-minute-pr/` (D30)
> 구현 이슈: `docs/issues/017-pr-body-skill.md`
> **상태**: 그릴 완료(2026-11-14). 구현은 이슈 017.

## Sources

출처는 원본 레포와 원본 아티클만 쓴다 (위키 요약 제외).

| # | 경로 | 역할 |
|---|---|---|
| S1 | `references/pstack/skills/poteto-mode/playbooks/opening-a-pr.md` | 섹션 뼈대, 길이 제한, 제목 규칙 |
| S2 | `references/pstack/skills/technical-writing/SKILL.md:94` | "1분 브리핑" 문장 규칙 |
| S3 | `references/pstack/skills/benchmark-checklist/SKILL.md:34` | 성능 PR은 대표 숫자 1개 |
| S4 | `references/pstack/skills/blast-radius/SKILL.md:17,43` | Blast Radius 증명 방식 |
| S5 | `references/pstack/skills/unslop/` | 마지막 문장 필터 |
| S6 | `references/humanlayer-skills/plugins/visual-pr/skills/visual-pr/` | 그림으로 보여 주는 변경 개요 |
| S7 | `references/humanlayer-skills/plugins/show-me/skills/show-me/SKILL.md` | 그림 종류 선택 규칙 |
| S8 | `~/.claude/plugins/cache/mattpocock/mattpocock-skills/1.3.2/skills/engineering/pr/SKILL.md` | Merge Danger (one-way/two-way door) |
| S9 | `references/hr-folio/skills/pr-writing/SKILL.md` | 증거 표, 작성 출처 줄, 게시 전 확인 |
| S10 | `references/pr-lens/packages/agent-skill/manual.md:189,193` | 다이어그램 위치, 안 바뀐 부분 표시 |
| A1 | `raw-articles/What My Pull Requests Look Like Now.md` | S9 근거. 증거 목록 5행(:51-55), 정직성 규칙(:109-113), 순서(:121) |
| A2 | `raw-articles/I Don’t Want to Read What You Didn’t Write.md:18` | 독자의 질문 5개 |
| A3 | `raw-articles/Addressing the code review bottleneck.md:65,85,99` | impact, rollback cost, 테스트 결과 |
| A4 | `raw-articles/How the Claude Code team does code review.md:67,172` | 말 대신 실행 결과 |
| A5 | `raw-articles/Chapter 27 Check a measured performance number before you report it.md:351` | S3 근거 |
| A6 | `raw-articles/Chapter 28 Check what a change could break and where the diff is weak.md:105-109` | 증명 강도 5단계 |
| A7 | `raw-articles/Chapter 14 Open PRs and merge verified changes.md` | S1 옛 버전 해설 (2차) |
| A8 | `raw-articles/explain-diff.md` | PR 본문 아님, 별도 설명 문서 (참고만) |

## Constraints

- **C1 에이전트 호환.** Claude Code, Codex, Antigravity 등에서 그대로 동작한다. (사용자 요구 2026-11-13) 조사 사실:
  - frontmatter는 Agent Skills spec 6개 필드만 (`references/agentskills-spec/docs/specification.mdx:27-32`). CC 문서도 CC 밖에서는 이 6개만 쓰라고 한다 (`code.claude.com/docs/en/skills.md`, "Using skill frontmatter outside Claude Code").
  - 본문에 `${CLAUDE_*}`, `$ARGUMENTS`, `` !`cmd` ``, `@path`, 도구 이름(`AskUserQuestion`, `Bash`)을 쓰지 않는다. 질문은 산문으로 "ask the user … and wait"라고 쓴다. 질문 도구 이름이 에이전트마다 다르다 (CC `AskUserQuestion`, Codex `tool/requestUserInput`, Antigravity `ask_question` — `antigravity.google/docs/sdk/tools.md`).
  - 번들 파일은 skill root 기준 상대 경로. 스크립트는 TTY 입력 없이 인자와 stdout만 (`using-scripts.mdx:229-231`).
  - 탐색 경로가 다르다. CC는 `.claude/skills`·`<plugin>/skills`, Codex와 Antigravity는 `.agents/skills` (`learn.chatgpt.com/docs/build-skills.md`, `antigravity.google/docs/skills.md`). CC 플러그인 skill은 다른 에이전트에서 그대로 안 보인다. 단 Codex도 자체 플러그인·marketplace가 있다(CLI `/plugins`, `learn.chatgpt.com/docs/plugins.md:54-56`, 2026-11-14 확인). agy도 플러그인이 있다(2026-11-14 조사, 다운로드한 문서 확인):
    - 매니페스트: CC `.claude-plugin/plugin.json`, Codex `.codex-plugin/plugin.json` 또는 루트 `plugin.json`(`developers.openai.com/plugins/build/plugins.md:14-26`), agy `.antigravity-plugin/plugin.json`(여러 에이전트 레포용, `antigravity.google/docs/build-plugins.md:98`). `skills/`는 공유.
    - marketplace: Codex `.agents/plugins/marketplace.json`, `source.path: "./plugins/x"` 가능(plugins.md:410-466). agy는 공식 marketplace 하나뿐, GitHub URL·로컬 경로로 설치(`antigravity.google/docs/plugins.md:129-142`, 문서에는 레포 루트 URL만). 하위 폴더 URL은 실제 설치로 확인: agy 1.5.3에서 `agy plugin install https://github.com/LeeJuOh/claude-code-zero/tree/main/plugins/rubber-duck-tutor`가 성공했고, `.claude-plugin` 매니페스트만 있어도 읽었다(`Source: claude-code`, skills 6·hooks 1). 확인 뒤 제거함. (2026-11-14)
    - 호출: CC 맨 이름 `/fancy`도 됨, 다른 명령과 겹치지 않을 때(`code.claude.com/docs/en/skills.md:455`). agy `/<skill-name>` 접두어 없음(`agy-docs-plugins.md:37`). Codex `$` 멘션(`skills-and-plugins.md:44-45`), 플러그인 접두어 여부 미확인.
    - Codex는 CC 매니페스트를 그대로 읽는다(S3 확인, 2026-11-14). 문서: Codex가 읽는 marketplace 목록에 "a legacy-compatible marketplace at `$REPO_ROOT/.claude-plugin/marketplace.json`"이 있다(`developers.openai.com/plugins/build/plugins.md:541`). 매니페스트도 "OpenAI also accepts legacy and Claude-compatible manifests"(같은 문서 :596). `.codex-plugin/plugin.json`은 "compatibility fallback"이다(:26, :564). 실제: 사용자 Codex(`codex-cli 0.167.1`)에 `claude-code-zero` marketplace가 이미 git 소스로 있다. `codex plugin list`는 `.claude-plugin/marketplace.json`을 읽고 `toolbox`·`vision-powers`·`worktree-plus`를 `installed, enabled`로 보인다. 그래서 `.codex-plugin/plugin.json`과 `.agents/plugins/marketplace.json`은 만들지 않는다. `.agents/plugins/marketplace.json`을 새로 두면 Codex가 그 파일만 읽어 이미 설치한 플러그인이 목록에서 빠질 수 있다(추정, 확인 안 함). 설치 명령은 `codex plugin marketplace add LeeJuOh/claude-code-zero`와 `codex plugin add one-minute-pr@claude-code-zero`(:184-196, `codex plugin add --help`).
    - 전례: `references/superpowers/`(`.claude-plugin`·`.codex-plugin`·`.antigravity-plugin`·`.agents/plugins` + 공유 `skills/`), `references/compound-engineering-plugin/`. 모두 레포 루트에 플러그인 하나. 우리 레포처럼 `plugins/<name>/` 여러 개인 전례는 없다.
  - `npx skills`로도 설치할 수 있어야 한다. (사용자 요구 2026-11-14) 확인: skills 1.8.1에서 `npx skills add LeeJuOh/claude-code-zero --list`가 `plugins/*/skills/` 아래 스킬 38개를 찾았다. 그래서 설치는 `--skill one-minute-pr`로 한다. 이 방식은 스킬 폴더만 받는다(S4 실제 설치로 확인, 2026-11-14). 그래서 스크립트·별도 파일은 모두 스킬 폴더 안에 둔다(플러그인 루트에 두지 않는다). (2026-11-14)
  배포 방식은 Open에서 정한다.

- **C2 독자는 사람 리뷰어.** SKILL.md는 에이전트가 읽고, PR 본문은 사람 리뷰어가 읽는다(AI 리뷰어도 읽지만 기준은 사람. AI 리뷰어는 PR 본문의 의도를 읽고(`raw-articles/How the Claude Code team does code review.md:80`), 위험이 낮은 PR은 사람 리뷰 없이 머지되기도 한다(:106)). 목적은 PR 작성자 쪽에서 리뷰 병목을 줄이는 것(A3 제목). 근거: "a one-minute briefing … for a reviewer who has the diff"(S1:13), A2 제목. 규칙이 충돌하면 사람 리뷰어의 가독성을 기준으로 판단한다. (사용자 2026-11-14)

## Decisions

- **D1 분량: 짧게.** 1분 브리핑, 대략 40줄 이하 (S1:13, S2:94). 이미지·영상은 넣을 수 있다 (S1:22). 넘친 내용은 본문 밖에 둔다 — 위치는 미정. (그릴 2026-11-13)

- **D2 섹션과 순서: pstack 고정 순서.** Why · What changed · Scope · Tradeoffs · Blast Radius · Rollback · Verification, `##` 헤딩, 할 말 없는 섹션은 뺀다 (S1:13-20). Rollback(D21)과 Scope는 언제나 넣는다. Scope는 할 말이 없으면 "Covers the whole change." 한 줄(pstack `S1:17` "`## Scope`: always.", 다른 참고 스킬에는 Scope 섹션 없음, grep, 사용자 2026-11-14). 변경 두 곳: What changed는 그림 (S6 `SKILL.md:31`), Verification은 변경 유형별 증거 표 (S9:41-47, A1:51-55), 성능은 대표 숫자 1개 (S3:34). Hugo의 증거-앞 순서(A1:121)는 긴 본문 전제라 D1과 맞지 않아 기각. (그릴 2026-11-13)

- **D3 넘친 내용: 넘칠 때만 사용자에게 묻는다.** 선택지는 "PR 코멘트에 `<details>`로 접어서" 또는 "별도 linked artifact, 링크는 사용자가 준다". 플랫폼은 사용자마다 달라 스킬이 정하지 않는다. `userConfig` 설정은 만들지 않는다. 근거: pstack은 linked artifact로 뺀다 (S1:22, S3:34). 핵심 그림은 본문에, 접기는 GitHub 코멘트에서 쓴다 (S10:99,189). 코멘트를 넘친 내용의 자리로 정한 출처는 없다(판단). (그릴 2026-11-13)

- **D4 플랫폼: 가리지 않는다.** 본문은 플랫폼 중립으로 쓴다. 올릴 때 레포의 forge를 확인하고 그 CLI(`gh`, `glab` 등)가 있으면 쓰고, 없으면 본문만 출력한다. 근거: pstack "per the resolved forge" (S1:28), pr-lens의 forge별 처리 (S10:86,99). visual-pr·Hugo는 `gh`만 (S6:17,44). (그릴 2026-11-13)

- **D5 접기 조건: forge가 렌더할 때만 `<details>`로 접는다.** 스킬 문장은 "Fold the details with `<details>` when the forge renders it." 한 줄이고 특정 forge 이름은 쓰지 않는다. 조건이 없으면 태그가 글자 그대로 보인다 (S10:86,99). D3 보완. (그릴 2026-11-13)

- **D6 미리보기 없음: 바로 올린다.** 스킬 호출이 곧 게시 의도다. 올린 뒤 PR 링크를 주고, 사용자가 고칠 곳을 말하면 고친다. 본문 수정은 되돌릴 수 있다 (S8 two-way door). 멈추는 곳은 D3 질문(넘친 내용이 있을 때)뿐이다. 근거: pstack·visual-pr는 바로 올린다 (S1:30, S6:44). Hugo의 게시 전 승인(S9:10)은 기각. 기각 비용: PR 생성 알림에 첫 본문이 실릴 수 있다(추론). 반대 근거(기각): "the person who asked for the change signs off on it"(`raw-articles/How the Claude Code team does code review.md:98`), 리뷰 보내기 전 작성자가 diff를 읽고 설명을 고친다(`raw-articles/The Brain Sandwich.md:31`). 둘 다 "사람이 확인"이지 "올리기 전"은 아니다. 올린 뒤 확인으로 충족(사용자 2026-11-14 "일단 게시하고 보면 된다"). draft PR로 올리는 중간안도 기각(S1:30 "never as a draft"). (그릴 2026-11-13, 보강 11-14)

- **D7 스크립트 검사: 섹션만 막고 줄 수는 경고.** 올리기 전에 스크립트로 `##` 섹션 이름과 순서(D2)를 검사하고, 틀리거나 `## Rollback`·`## Scope`가 없으면 실패한다(D21, D2). 줄 수는 40줄을 넘으면 경고만 한다(D1 "대략", D3로 넘김). 런타임 요구는 `compatibility` 필드에 적는다 (`references/agentskills-spec/docs/skill-creation/using-scripts.mdx:86`). 근거: pstack `check-plan.mjs` (`poteto-mode/playbooks/multi-phase-plan.md:10`), AGENTS.md "Deterministic first". 참고 PR 스킬(S6, S8, S9)에는 스크립트 검사가 없다. (그릴 2026-11-13)

- **D8 검사 스크립트 언어: node `.mjs`, 내장 모듈만.** `npm install` 없이 `node scripts/<name>.mjs <body.md>`로 돌린다. `compatibility`에 Node.js 요구를 적는다. 근거: pstack `check-plan.mjs`는 `node:fs`·`node:process`만 쓴다. symphony도 본문 검사 명령 `mix pr_body.check`를 돌린다(`references/symphony/.codex/skills/push/SKILL.md:55`, Elixir). 여러 에이전트용 레포의 `scripts/` 확장자 수: anthropics-skills py 62·sh 2, openai-skills py 42·js/mjs 14·sh 4, vercel-agent-skills mjs 16, agent-skills js 14 (직접 셈). 되돌리기 쉬운 구현 세부라 에이전트가 정함, 사용자 동의. (그릴 2026-11-13)

- **D9 제목: 형식은 레포 규칙, 내용은 pstack 원문.** 형식은 레포의 최근 PR 제목·커밋 규칙을 따르고, 없으면 Conventional Commits `type(scope): subject`, 끝 마침표 없음, 명령형 (S1:11). 내용은 pstack 원문 그대로 "names a real symbol when one carries the change"(S1:11). 처음 더한 "영역 말고 변경" 규칙은 출처 없음으로 보고 뺐다. 단 나중에 찾은 간접 출처: "A description of “Bug fix” is not helpful"(`raw-articles/Software Engineering at Google.md:165`, 본문 설명 대상). 제목은 D7 스크립트로 검사하지 않는다(레포 규칙이 다양함). 다른 참고 스킬(S6, S8, S9, S10)에는 제목 규칙이 없다. A1:11은 제목·본문을 묶은 비판이라 제목 근거에서 뺐다. (그릴 2026-11-13)

- **D10 작성 출처 줄: 넣지 않는다.** Hugo의 첫 줄 "Written by an AI agent on behalf of @handle… has not reviewed it yet."(S9:12-25)은 빼다. 이유: 참고 스킬 중 Hugo만 쓴다(S1, S6, S8, S10에 없음, 직접 grep). "아직 안 읽음" 상태는 Hugo가 리뷰 뒤 손으로 고치는데(S9:23) 이 스킬은 올리고 끝나서(D6) 거짓이 남는다. handle을 물으면 D6·C1과 충돌한다. 기각한 근거: 팀 레포에서 리뷰어가 첫 리뷰어임을 안다(A1:41). 팀 레포에서 필요해지면 다시 정한다. (그릴 2026-11-13)

- **D11 증거: Hugo 표 + 짧게.** SKILL.md에 변경 종류별 증거 표를 둔다. 행은 Hugo 7행 (S9:41-47, A1:51-55는 5행): 화면 / 명령어·빌드 / 버그 / 성능 / AI·에이전트 동작 / 새 API·기능 / 그 밖. 표는 에이전트용 규칙이고 본문에 넣지 않는다. 명령어·빌드 행은 같은 명령의 전과 후 출력이다(S9:42, A1:54, S8:21,160). pstack `S1:20`만 결과뿐이다. 본 적 없는 전은 "not found"로 쓴다(D14, 사용자 2026-11-14). 본문 Verification은 돌린 것과 결과를 1~3 불릿으로 쓴다 (S1:20, A4:67,172). 성능 행은 Hugo의 실행 횟수·편차 대신 대표 숫자 1개 `before → after` + 단위 (S3:34, A5:351), 나머지는 D3 넘친 내용으로. 출력은 실제 줄을 잘라 그대로 붙이고 고치지 않는다, 뺀 곳은 `…` (S9:42 "Never retype or tidy"). 붙인 출력은 코드 블록이나 백틱 안에 둔다. 그래야 D13 검사에 걸리지 않는다. 자르기 허용은 S1:20·A4:172를 합친 판단. 충돌 해소: mattpocock의 의사코드 테스트(S8:164)는 기각, 실제 출력(S9:42, A4:67, A6:105 "말로만은 가치 없음")을 따른다. (그릴 2026-11-13)

- **D12 문장 필터: 스킬 안에 직접 담는다.** pstack `technical-writing`(S2:85-95)·`unslop`(S5)에서 PR 본문에 맞는 규칙 10개 안팎만 골라 스킬에 넣는다(짧은 문장, 한 대상 한 이름, 긴 대시 금지, AI 단어 금지, 굵은 글씨+콜론 목록 금지 등). 외부 스킬 호출은 다른 에이전트에서 동작하지 않는다(C1). pstack은 MIT (`references/pstack/LICENSE`). 다른 출처의 길이 규칙: Why 한 문장 (S6:29), 문단 1~2문장·30단어 이하 (S10:162). Hugo·mattpocock에는 문장 필터가 없다. (그릴 2026-11-13)

- **D13 스크립트 문장 검사: pstack과 같은 3개만 실패.** 코드 블록·백틱 밖에서 긴 대시(`—` `–`), 둥근 따옴표, 문장 중간 콜론(`: ` 뒤 글자)이 나오면 실패 (`references/pstack/skills/poteto-mode/scripts/check-plan.mjs:78-80`). 코드로 보는 범위: 몇 칸이든 들여 쓴 펜스(리스트 안 펜스 포함), 빈 줄 뒤 4칸 이상 들여 쓴 줄, 문단 안에서 줄을 넘는 인라인 코드. 헤딩 끝의 `#`는 지우고 이름을 본다(`## Rollback ##`). 1~3칸 들여 쓴 헤딩, 탭, setext 헤딩, 이스케이프한 백틱, BOM은 다루지 않는다. 본문에 `<!--`가 있으면 어디든 실패한다. 숨긴 Rollback을 막는다(symphony `references/symphony/elixir/lib/mix/tasks/pr_body.check.ex:124`, D21). (사용자 2026-11-14) AI 단어 목록은 스크립트에 넣지 않고 D12 문장 규칙(에이전트 판단)에 맡긴다. 이유: 오탐("enhance" 정상 사용), 참고 레포(pstack, desloppify, humanizer)에 스크립트 전례 없음(grep). (그릴 2026-11-13)

- **D14 스킬 경계: 본 증거만 쓴다.** 이 스킬은 증거를 새로 만들지 않는다(테스트 실행, 스크린샷 촬영 없음). 에이전트가 실제로 본 증거만 쓴다 ("Nothing in it was invented", S9:65). 변경 종류에 맞는 증거(D11 표)를 못 찾으면 본문에 "안 했다"가 아니라 "못 찾았다"로 쓴다. 에이전트가 못 본 곳에 증거가 있을 수 있어서다(판단). 올린 뒤 채팅 답장에서 빠진 증거를 종류별로 알려 주고, 사용자가 주면 본문을 고친다(D6 two-way door, 멈춤 아님). 증거 찾을 장소 목록은 두지 않는다(목록 밖을 안 찾게 됨, 사용자 기각). 근거: 보고만 하는 편 S1:3,22, S6:22-27, A4:67 / 직접 찍는 편 A1:27, S9:49(단 S9:10 "description only"와 모순), S8:162 조건부. 기각 비용: 앞 단계에서 증거를 안 만든 세션은 "못 찾음"으로 올라간다. (그릴 2026-11-13)

- **D15 What changed 내용: 바뀐 모양만.** 파일별 목록이 아니라 리뷰어가 알아야 할 모양의 변화를 보여 준다. 종류는 계약(API 요청·응답, 엔드포인트, 이벤트 형식), 데이터 구조(DB 테이블·컬럼, 핵심 타입), 설정값(환경 변수, 설정 파일, feature flag), 흐름(호출, 데이터, 아키텍처). 바뀐 종류만 넣는다(S6:39). (마이그레이션이면 데이터 구조를 꼭 넣는다는 규칙은 "바뀐 종류만"과 중복이라 뺐다. S10:15.) 계약·데이터 구조·설정값은 `diff` 블록, 대부분 새것이면 전체 모양(S6:38, S8:93,143). 새 API는 쓰는 코드를 보인다(A1:55). 파일 트리는 쓰지 않는다. diff 화면의 파일 목록과 겹치고(S1:13,22), A2:18의 기계식 나열에 가깝다(사용자 판단). 책임이 옮겨 가면 흐름 그림에 넣는다. 기각한 출처: S6:35, S8:72-79. 설정값 행은 PR 스킬 출처 없음(판단, 간접 S4:35, A4:76). (그릴 2026-11-13)

- **D16 흐름 그림: 에이전트가 그린다, 도구 순서.** 흐름은 그림으로 쓴다(S7:47, S8:76-84, S10:189). 그림은 증거가 아니라 diff에서 나온 설명이라 에이전트가 새로 그려도 된다(D14와 다름, S6:22-37, S8:15-17). 규칙: "diff를 보고 그린다. 맞는 그림이 이미 있으면 그것을 쓴다." 옛 그림 확인과 그림 채팅 알림은 뺐다(출처 없음, 과함). 새로 그릴 때 순서: 에이전트의 그림 스킬·도구(이름은 적지 않음, C1) → forge가 렌더하는 그림 문법(예: Mermaid, 고정 아님) → 글자 그림. 이미지는 PR에 올린다(D18). HTML은 새로 만들지 않고, 이미 있고 링크가 있을 때만 링크를 넣는다(A4:177-185는 학습 자료, PR 본문 아님). 그림 스킬이 HTML만 내면 다음 순서로 넘어간다. 참고 스킬 중 외부 그림 스킬에 맡기는 곳은 없다. visual-pr는 그림 규칙을 번들한다(S6:26 `references/show-me.md`). (그릴 2026-11-13)

- **D17 그림 규칙: 에이전트가 직접 그릴 때만.** 규칙 3개: 생각 하나에 그림 하나(S10:189), 바뀌지 않은 주변도 그린다(S10:193), 중심 연결은 1~2개만 강조(S10:195). D16 케이스별 적용: 이미 있는 그림을 쓸 때 ✕(그대로 씀), 그림 스킬이 그릴 때 ✕(그 스킬 규칙), 에이전트가 그림 문법·글자 그림으로 그릴 때 ○. 근거: visual-pr는 그림 규칙을 번들한다(S6:26). 처음 전역 규칙으로 제안했다가 사용자가 케이스 적용 범위를 바로잡음. (그릴 2026-11-13)

- **D18 이미지 올리기: 한 줄만.** SKILL.md에 "이미지는 PR에 올린다. 브랜치에 커밋하지 않는다. 못 올리면 채팅에서 알린다." 한 줄만 둔다. 올리는 방법은 에이전트가 forge에 맞게 찾는다. 근거: Hugo 한 줄(S9:57), pstack "attach" 한 마디(S1:22), visual-pr·mattpocock은 언급 없음. 사실: GitHub 문서에 `gh pr create/edit --attach`가 있다(docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli, 2026-11-13 확인), 로컬 `gh` 2.95.0에는 없다(직접 확인). GitLab은 `POST /projects/:id/uploads`, 응답에 `markdown` 필드(docs.gitlab.com/api/project_markdown_uploads). 처음 케이스 표로 제안했다가 사용자가 과하다고 바로잡음. (그릴 2026-11-13)

- **D19 분량과 언어: 참고 스킬 수준, 영어.** SKILL.md는 900단어 이하(스크립트 제외). 참고 스킬 분량(직접 셈): visual-pr 490(+그림 규칙 파일 406), mattpocock 568, Hugo 909, pstack PR 929, pr-lens 4,829(전용 CLI 설명서라 제외). 확정한 결정은 모두 동작하게 담는다. spec의 근거·기각 이유는 SKILL.md에 넣지 않고 규칙만 넣는다. 넘치면 규칙 문장을 줄인다. (별도 파일 금지는 D26에서 고침: 일부 경우용 내용은 별도 파일.) 언어는 영어(AGENTS.md Coding Style). (그릴 2026-11-13)

- **D20 레포 PR 템플릿: 무시하고 우리 양식.** 레포에 PR 템플릿이 있어도 D2 섹션으로 쓴다. D7 섹션 검사는 언제나 돈다. 근거: 일반 PR 스킬 4개 중 3개가 자기 양식만 쓴다(visual-pr S6:51 "Do not expand the PR body beyond that template", mattpocock S8:12, pstack S1:13). 레포 템플릿을 따르는 곳은 Hugo(S9:25)와 symphony(`references/symphony/.codex/skills/push/SKILL.md:47`, 자기 레포 전용)뿐. 기각 이유: 템플릿마다 섹션이 달라 에이전트가 우리 내용을 어느 섹션에 넣을지 매번 추측한다(사용자 판단). 기각 비용: 템플릿 레포에서 필수 항목(체크박스 등)이 빠지고, CI가 본문 형식을 검사하는 레포(`references/symphony/.github/workflows/pr-description-lint.yml:38`)에서는 막힌다. 팀 레포에서 필요해지면 다시 정한다. (그릴 2026-11-13)

- **D21 되돌리는 방법: 별도 섹션.** Blast Radius에 섞지 않고 섹션을 따로 둔다. 근거: Claude Code 팀 템플릿이 "Risk"와 "How to revert"를 따로 묻는다(`raw-articles/How the Claude Code team does code review.md:98,219`). A3:79-80도 Impact와 Rollback cost를 다른 질문으로 둔다(리뷰어 질문 목록, 섹션 목록 아님). 기각: Blast Radius 안 한 문장(mattpocock Merge Danger S8, 에이전트 추천), 쓰지 않음(pstack S1:19). 항상 넣는다(D2 "할 말 없는 섹션은 뺀다"의 예외). 쉬우면 한 줄(예: "revert 커밋 하나로 되돌린다"). 이유: 빠지면 리뷰어가 "쉬워서"와 "잊어서"를 구별 못 한다. Claude Code 팀 템플릿도 매번 묻는다(:98). D7 스크립트는 이 섹션이 없으면 실패. 이름 `## Rollback`(A3:80, 다른 섹션처럼 짧은 명사, git revert 밖의 방법 예: flag 끄기도 담음). 기각: `How to revert`(CC 팀 :219, 문장형), `Revert`(git 명령 하나로 좁음). 위치는 Blast Radius 바로 뒤: Why · What changed · Scope · Tradeoffs · Blast Radius · Rollback · Verification. 이유: 출처 3개 모두 위험 바로 뒤에 되돌리기(CC 팀 :219 Risk → How to revert, S8 Merge Danger 한 섹션). 기각: 맨 끝. D2·D7에 반영함(2026-11-14). (그릴 2026-11-13)

- **D22 다시 부를 때: 새로 쓴다.** 같은 PR에서 다시 부르면(커밋 추가, 리뷰 뒤) 브랜치 전체 기준으로 본문을 새로 쓰고 옛 문장은 다시 쓰지 않는다(`references/symphony/.codex/skills/push/SKILL.md:51-54`). 리뷰에서 정한 내용은 넣는다(`raw-articles/Software Engineering at Google.md:167`). 옛 본문의 증거(출력, 스크린샷 링크)는 지금 코드에 맞으면 남긴다(D14 본 증거). 기각: 덧붙이기(옛 문장이 틀린 채 남음, 예: "캐시로 빠르게 한다" + "캐시는 뺐다"), 그대로 두기. 변경 요약 코멘트는 출처 없어 넣지 않는다. visual-pr도 기존 PR 본문을 통째로 바꾼다(S6:17,44). (그릴 2026-11-13)

- **D23 Blast Radius: 이유 하나 + 확인 수준.** 1~2문장(S1:19 원문 "1–2 sentences on who or what it touches and why that is safe or risky"). 안전한 이유가 되는 사실 하나를 쓰고(S4:43 "the one fact"), 어디까지 확인했는지 쉬운 말로 붙인다(S4:20-28, A6:105-109의 5단계를 번호 없이, 예: "`app/routes.ts:12`에서 확인", "테스트로 확인"). 실행이 필요한 4~5단계는 이미 본 결과가 있을 때만(D14). 확인 못 했으면 "확인 못 함"(S4:43 "write unproven"). pstack PR playbook은 확인 수준을 쓰지 않는다(grep 0). 처음 "쓰지 않음"을 추천했다가 1~3단계는 코드 읽기라 D14와 충돌하지 않음을 바로잡음. (그릴 2026-11-14)

- **D24 스킬 이름: `one-minute-pr`.** 목표(리뷰어가 1분 안에 판단, S1:13 "one-minute briefing")와 문제(리뷰 병목)를 담는다. 약속을 D1·D7이 지킨다. 1분 넘는 PR은 목표로 읽고 넘친 내용은 D3. 기각: `pr-body`(PR을 만드는 스킬인데 본문만 보임), `open-pr`(차별점 없음), `pr`(mattpocock과 충돌), `pr-brief`, `review-ready-pr`, `human-readable-pr`, `proof-pr`(증거를 새로 만들라는 뜻으로 읽힘, D14 충돌), `visual-pr`(이미 있는 스킬, 그림은 차별점 아님). (그릴 2026-11-14)

- **D25 호출: 자동, 좁힌 트리거.** description은 "사용자가 PR을 열거나 만들라고 할 때"로 좁힌다. 자연어 요청에도 불리고, 호출이 곧 사용자 의도라 D6이 안전하다. 비용: mattpocock `pr`("Use when writing a PR body")과 겹침(사용자 로컬 설치). 참고: visual-pr 수동(description 문장, S6:3), Hugo(S9:3)·mattpocock(S8:3)·pstack 자동. `disable-model-invocation`은 CC 전용이라 C1과 맞지 않아 쓰지 않는다. 처음 수동을 추천했다가 자동의 가장 좋은 형태(좁힌 트리거)를 따져 바꿈. (그릴 2026-11-14)

- **D26 별도 파일: 일부 경우용만 (D19 수정).** 일부 경우에만 필요한 내용(D17 그림 규칙, D3·D5 넘친 내용 처리)은 skill root 아래 별도 파일에 두고, SKILL.md에서 "언제 열지"를 쓴 문장으로 가리킨다(예: "Before you draw a diagram yourself, read `references/diagrams.md`."). 매번 필요한 단계·섹션 규칙·증거 표·문장 규칙은 SKILL.md에. 900단어 제한은 SKILL.md에만. 근거: visual-pr 그림 규칙 별도 파일(S6:26), writing-for-agents의 분기 기준(모든 경우에 필요한 것은 본문, 일부 경우는 포인터 뒤). D19의 "별도 파일로 옮기지 않는다"에는 근거가 적혀 있지 않았다. (그릴 2026-11-14)

- **D27 eval: 작게.** 형식은 D7 스크립트의 단위 테스트(eval 아님). 호출은 요청 몇 개(대상·비슷하지만 대상 아님·애매함). 결과·비교는 이 레포 실제 PR 2~3개로 스킬 있음/없음을 같은 입력으로 비교하고, 같으면 스킬을 다시 생각한다. 배포는 세 에이전트에 설치 후 한 번씩 호출. `auto-optimize`는 나중. 근거: pstack authoring playbook 3단계("Test cases if structural"). (그릴 2026-11-14)

- **D28 플러그인: 별도 플러그인 `one-minute-pr`.** toolbox에 넣지 않는다. 플러그인 이름 = 스킬 이름이어도 호출은 짧다(CC 맨 이름 `skills.md:455`, agy `/<skill>`). 위치(이 레포 `plugins/one-minute-pr/` vs 별도 레포)는 아래 Open. (사용자 2026-11-14)

- **D29 커밋·push: push만 한다.** 커밋하지 않은 변경이 있으면 멈추고 먼저 커밋하라고 알린다. 커밋했지만 push하지 않았으면 upstream과 함께 push하고 PR을 만든다. force push는 하지 않는다. 근거: symphony `push`는 push와 PR만 하고 커밋은 별도 `commit` 스킬(`references/symphony/.codex/skills/push/SKILL.md:4-5,17,30`). visual-pr는 커밋까지 한다(S6:18-19). Hugo·mattpocock는 본문만(S9:10, S8). 커밋은 어떤 변경을 넣을지와 레포 메시지 규칙을 판단해야 해서 뺀다(D14와 같은 경계). push를 빼면 D6 "바로 올린다"가 막힌다. PR을 올릴 수 없어도(forge CLI 없음, forge 아닌 원격) push한다. S4에서 forge가 아니라며 push를 건너뛴 실행이 있어 분명히 적는다(사용자 2026-11-14). (그릴 2026-11-14)

- **D30 위치: 이 레포 `plugins/one-minute-pr/`.** 릴리스·버전은 지금 흐름(AGENTS.md Workflow)을 쓴다. 설치 경로: CC marketplace(지금 방식), agy 하위 폴더 URL(직접 확인), Codex `.agents/plugins/marketplace.json`의 `source.path: "./plugins/one-minute-pr"`(문서상, `learn.chatgpt.com` `plugins.md:410-466`), `npx skills add LeeJuOh/claude-code-zero --skill one-minute-pr`(목록 확인). 근거는 C1. Codex가 D27에서 안 되면 다시 정한다. (사용자 2026-11-14) 수정(S3, 2026-11-14): Codex는 `.agents/plugins/marketplace.json` 대신 지금 있는 `.claude-plugin/marketplace.json`을 읽는다(C1). 그래서 Codex용 파일을 따로 만들지 않았다.

- **D31 사람이 없는 실행: 따로 다루지 않는다.** C1에 있던 "답을 받을 수 없는 모드의 기본 동작을 스킬에 적는다"는 1차 그릴의 에이전트 조사 메모였고 사용자 요구가 아니어서 지운다. D3 질문은 그대로. 참고 PR 스킬 5개도 다루지 않는다(직접 grep, Hugo S9:10 "unless they've told you otherwise"뿐). (사용자 2026-11-14)

- **D32 본문 언어: 정하지 않는다.** 참고 PR 스킬 6개(S1, S6, S8, S9, S10, symphony push)에 언어 규칙이 없다(grep). S4 시험 본문은 사용자 전역 지시가 한국어여도 모두 영어였다. 다른 언어가 실제로 나오면 다시 연다. (사용자 2026-11-14)

## Open

없음. 구현 전 할 일은 이슈 017 슬라이스로 옮겼다.

## Resume

그릴 5차 2026-11-14 (D29~D31 확정, C1에 agy 하위 폴더 설치·`npx skills` 사실 추가). 질문이 모두 끝났다. 구현은 `docs/issues/017-pr-body-skill.md`의 S1부터 한다.

사용자 선호: 질문은 하나씩, 짧고 쉬운 한국어(영어 문장 그대로 던지지 말고 번역, 예시 붙이기). 장황하게 말하지 않는다. 근거는 출처 경로:줄(스킬 S*와 아티클 A* 둘 다), 추천을 반드시 붙인다. 출처 간 충돌을 먼저 찾아 보고하고, 참고 스킬들이 실제로 어떻게 하는지 표로 먼저 보인다. 예시는 예시라고 밝힌다. 플랫폼(GitHub 등)을 단정하지 않는다.

주의(이번 세션에서 사용자가 바로잡은 것): 1) 출처 없는 규칙을 과하게 더하지 않는다(D9, D15, D16, D18 축소). 참고 스킬이 한 줄로 끝내는 것은 한 줄로. 2) 새 규칙은 이미 정한 케이스 중 어디에 적용되는지 먼저 확인한다(D17). 3) 새 용어·섹션을 꺼낼 때 그것이 무엇인지 예시로 먼저 설명한다. 4) SKILL.md는 900단어 이하, 영어, 확정 결정은 모두 동작하게(D19, D26). 5) 다른 에이전트 동작은 단정하기 전에 공식 문서를 먼저 확인한다(4차에서 "Codex는 플러그인이 없다"고 잘못 말함, AGENTS.md 규칙). 6) spec의 줄을 사용자 요구로 다루기 전에 누가 적었는지 확인한다(5차에서 에이전트 메모를 결정할 빈칸으로 물음, D31).
