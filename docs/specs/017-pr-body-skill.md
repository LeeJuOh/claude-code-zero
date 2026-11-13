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

## Open

다음 질문 순서대로. 한 번에 하나씩, 출처와 추천을 붙여 묻는다.

- 스크립트 검사 여부. 이전 추천: 섹션 이름·순서만 검사하고 줄 수는 경고 (pstack `poteto-mode/playbooks/multi-phase-plan.md:10`의 `check-plan.mjs` 방식). 참고 PR 스킬 중 스크립트 검사는 없음.
- 제목 규칙 (S1:11 Conventional Commits).
- 작성 출처 줄 ("Written by an AI agent…", S9:18-25) 넣을지.
- 증거 표의 행 구성 (A1:51-55 + 성능 S3:34).
- 문장 필터: pstack `technical-writing`·`unslop`은 다른 에이전트에 없다 (C1). 규칙을 스킬 안에 담을지.
- 스킬 이름, 둘 플러그인, 에이전트별 배포 경로 (C1 탐색 경로 차이).

## Resume

그릴 일시정지 2026-11-13. 재개 시 `/mattpocock-skills:grill-with-docs`로 이 파일을 읽고 Open 첫 항목부터 묻는다. 사용자 선호: 질문은 하나씩, 짧고 쉬운 말, 근거는 출처 경로:줄, 추천을 반드시 붙인다. 플랫폼(GitHub 등)을 단정하지 않는다. 구현은 그릴 종료와 사용자 승인 후.
