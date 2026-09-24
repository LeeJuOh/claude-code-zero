# 에이전트 문서 검수 — 레포 문서 + 플러그인 (2026-09-11)

> 상태: **검수 완료 · 재검수 반영(2026-09-23) · 1부 렌즈 재검수 반영(2026-09-24) · 1부 S1~S4·남은 결정 완료(2026-09-24, S5만 원 작성 머신), 2부 P1 진행 중(9/11 + 새 P1 1건 §2-4 #21 + 후보 §2-7 #25, worktree-plus `ebbdffa`·`6ad0cdd` 완료, 다음 rubber-duck-tutor)** · 수정 순서: 1부(레포 문서) 먼저, 2부(플러그인)는 그 뒤
> 줄 번호 기준: 커밋 `21a87ab`. 단 codex-advisor 관련 행과 재검수로 고친 행은 `23c69ec` 기준 — 수정 전에 해당 줄을 다시 열어 확인할 것. 공식 문서 줄 번호는 2026-09-23 기준으로 갱신(못 찾은 것은 인용 당시 값)
> 확인 표기: ✅ 직접 재확인(공식 문서 grep·git·실행) · 🔹 검수 에이전트가 grep/실행으로 확인 · (추측) 미확인
> 계기: auto memory를 껐다(`~/.claude/settings.json` `autoMemoryEnabled: false`). 메모리 파일은 남지만 로드되지 않으므로, 살릴 내용은 매 세션 읽히는 레포 문서로 옮기고 그 김에 레포 문서의 틀림·중복·퇴적을 정리한다.
> 작성 환경: 메모리 27개(§1-4), `.claude/settings.local.json`, `.claude/worktrees/remove-test-3`는 원 작성 머신(`/Users/ljo/…/zero-code/claude-code-zero`)에만 있다. 다른 머신에서 작업하면 이 대상은 없다.
> 다음 세션: 아래 §핸드오프부터 읽는다. 이 문서가 원장이다 — 별도 handoff 파일은 만들지 않는다.

## 핸드오프 (2026-09-24 8차 → 다음 세션)

**첫 행동:** rubber-duck-tutor §2-4 #1·#21. 현재 코드에서 버그를 재확인하고 "증상 한 줄 + 질문 한 줄 + 추천 한 줄"로 보고한다. 수정은 사용자 승인 뒤에만(8차 끝에 사용자가 "오케이"로 rubber-duck-tutor 먼저를 받음).

**다음 순서** (2부 P1 남은 버그)
1. rubber-duck-tutor — §2-4 #1·#21
2. e2e-test-runner — §2-7 #6
3. worktree-plus §2-7 #25 — 8차에 새로 찾은 실제 버그(재현함). P1에 넣을지는 사용자에게 묻는다

P1이 끝나면 P2~P7(아래 표).

**플러그인 하나 처리 절차** (8차에 사용자 반응으로 굳힘)
1. 현재 코드에서 재확인 → 보고 → 승인. ⚠️ 8차에 `/skill-creator-pro`와 "개선하자"를 수정 승인으로 읽고 eval 없이 고쳐 커밋했다가 "누가 고치래? 제대로 고친거 맞는지 검수해"를 들었다.
2. 스킬 문구 수정은 검수까지 한다: 스크립트를 격리 환경(`HOME`·`GIT_CONFIG_GLOBAL`을 scratchpad로)에서 직접 돌려 문구가 사실인지 확인하고, 옛/새 스킬 eval 비교(아래). 8차에 이 검수로 내가 새로 쓴 문구의 결함을 찾아 `6ad0cdd`로 고쳤다.
3. 수정 커밋(버전 bump 포함) + 원장 기록.

**eval 방식** (8차 worktree-plus에서 씀, 산출물 `plugins/worktree-plus/.evals/worktree-setup/`, gitignored)
- 스냅샷: `git show <수정 전 커밋>:<SKILL.md 경로>` → `skill-snapshot/SKILL.md`. 서브에이전트에 스킬 경로 + 사용자 프롬프트 + "드라이런: 쓰기 금지, 실행할 쓰기 명령은 `commands.sh`, 답변은 `response.md`로 저장"을 준다.
- `aggregate_benchmark`는 `iteration-N/eval-<i>-<name>/<config>/run-1/grading.json` 구조만 읽는다. 결과 표는 `old_skill`을 먼저 놓아 Delta 부호가 반대로 나온다.
- 뷰어는 `generate_review.py … --static <iteration>/review.html`.

- 7차: codex-advisor(§2-3 #17) `dae4f7f`·`85f10d5`·`a3cfba4`(5.1.0). 8차: worktree-plus(§2-7 #1·#2) `ebbdffa`(3.1.1) + 검수 후속 `6ad0cdd`(3.1.2). 상세는 각 행.
- 미푸시 커밋 있음(8차 끝 기준 14개 + 이 원장 커밋) — 푸시 여부는 사용자에게 묻는다.
- ⚠️ 보고는 짧게, 한국어로: 버그 한 줄(사용자가 겪는 증상) + 질문 한 줄 + 추천 한 줄. 8차에도 "장황하게말하지마 다시보고해"를 들었다 — 검수 결과를 표·목록으로 길게 늘어놓은 뒤였다.

| # | 범위 | 막는 결정 |
|---|---|---|
| S1 ✅ `61b5ec0`·`ae776e2` | AGENTS.md·CLAUDE.md·release-workflow.md — §1-1 AGENTS 표 + §1-3 + §1-4 중 AGENTS 목적지. AGENTS 행과 짝인 gotchas 줄도 같은 커밋 | — |
| S2 ✅ `1d9efd7` | gotchas.md — §1-1 해당 행 + §1-4 gotchas 목적지. §1-4의 context 목적지 3개도 여기서 | — |
| S3 ✅ `d3c669c` | INDEX.md + §1-2 퇴적 삭제 + skill 가이드 2개 삭제(#13) + auto-optimize 참조 삭제, skill-creator-pro 2.0.6 | — |
| S4 ✅ `b74fb20` | §1-1 설계 기록 표(상태줄·배너·링크) + rubber-duck 용어집 병합(영어) + context 4개 용어집 형식 정리 + CONTEXT-MAP. rubber-duck-tutor 3.1.2 | — |
| 1부 결정 ✅ `b8b9b61`·`de3166e`·`d1b4bcc` | #16 load-secrets.sh 삭제, #15 버림, #12 메모리 2개 처리 + AGENTS `wiki/` | — |
| S5 | 원 작성 머신: 메모리 폴더 정리(`feedback_audit_scope` 포함 삭제), worktree | #4 |
| P1~P7 | 2부. 분할은 아래 표 | §1-5 #8~#11 |

| # | 2부 범위 | 막는 결정 |
|---|---|---|
| P1 | 실제 버그: ~~§2-1 #1·#4·#32~~ ✅ `5be2cec`(+`143aa9c`), ~~§2-2 #1~~ ✅ `59eb822`, ~~§2-3 #17~~ ✅ `dae4f7f`·`85f10d5`·`a3cfba4`, §2-4 #1·#21, ~~§2-5 #1~~ ✅ `ca54ade`, ~~§2-6 #3~~ ✅ `d9b5177`, ~~§2-7 #1·#2~~ ✅ `ebbdffa`, §2-7 #6 | — (Q11은 "우선순위 순 하나씩"으로 대체) |
| P2 | §2-1 vision-powers 나머지 — 2~3개로 다시 나눔 | #10 |
| P3 | §2-3 codex-advisor 나머지 | — |
| P4 | §2-4 rubber-duck-tutor | #8 |
| P5 | §2-2 skill-creator-pro(#15 `claude plugin eval` 분기 포함) | #9 |
| P6 | §2-5 claw-mux, §2-6 notebooklm-connector | #11(claw-mux #2 라이브 확인) |
| P7 | §2-7 나머지. vibeproxy-kit 행(#24 포함)은 맨 끝 — 다시 쓸 때 수정(#2 결정) | — |

- §2-5 #1(claw-mux `$SKILL_DIR`)·§2-7 #24(vibeproxy 백업 경로)의 수정안은 "references 파일은 치환 안 됨"(2026-09-24 확인)을 전제로 그대로 유효.

## 검수 기준

렌즈는 llm-wiki(`wiki/`)의 `concepts/agents-md`, `progressive-disclosure`, `principles-over-demonstrations`, `context-rot`, `summaries/context-engineering-claude5`, `nick-nisi-delete-skills`, `mattpocock-skills`. 요약:

| ID | 기준 |
|---|---|
| C1 | 충돌하는 지침 — 비용이 추론 예산으로 청구돼 eval에 안 보임. 최우선 |
| C2 | 낡음·틀림 — 없는 경로, 지난 버전, 거짓 상태줄, 옛 모델용 우회책 |
| C3 | 중복 — 같은 뜻이 2곳 이상. 원본 하나만 남긴다 |
| C4 | 환경 캐시·no-op — 레포를 보면 아는 것, 모델이 기본으로 하는 것 |
| C5 | 공개 계층 — 일부 경우만 필요한 내용이 상시 로드되는 곳에 있음 |
| C6 | 판단 기준이 맞는 자리에 절대 규칙(NEVER/MUST) |
| C7 | 예시·절차 과다 |
| C8 | 이유 없는 비자명 규칙 |
| C9 | 코드로 강제할 불변식이 산문에만 있음 / 코드가 이미 강제하는 걸 산문이 반복 |
| C10 | 포인터·description 품질 |
| C11 | 확인 불가능한 완료 조건 |

## 재검수 (2026-09-23)

HEAD `23c69ec` 기준으로 전 행을 다시 대조했다. 작성 직후 issue 016(codex-advisor 5.0.0)이 구현돼 codex 관련 행이 많이 바뀌었다.

- **삭제한 행** — 이미 해결: 1부 설계 기록 5행, §2-3 머리말 spark 건, claw-mux 기타(설치 캐시). 틀림: claw-mux #8, notebooklm #9. 삭제 사유는 각 표 아래에 남겼다.
- **수정안 교정** — 문제는 맞지만 수정안이 틀렸거나 범위가 모자란 행. 판단이 갈리는 것은 §1-5 #7~#12로 옮겼다.
- **줄 번호 갱신** — §2-3(리뷰 스킬 5개 재작성), INDEX.md(1줄 밀림), 위치 오기.
- **새 발견** — 2부 공통 관찰 "Bash 환경변수"·"reference 파일 치환(추측)", vision-powers #31, vibeproxy-kit #24, skill-creator-pro 기타.

## 렌즈 재검수 (2026-09-24, 1부 §1-1·§1-3·§1-4)

`writing-for-agents` 스킬 기준. 사실 판정은 그대로, 수정안의 **목적지·포인터·유지 판정**을 고쳤다.

- **흩어짐 → 한 곳으로** — 버전 지식 6곳(AGENTS:122·:140, gotchas:19·:21, validate 경고, 메모리 범프 규칙) → AGENTS Versioning 블록 하나. 테스트 교훈 4개(3곳으로 나뉘어 있던 것) → gotchas "Testing" 하나.
- **포인터** — gotchas 포인터가 hooks·scripts·testing을 안 부르면 §1-4로 옮긴 교훈에 닿지 못한다 → "Before any plugin change, read gotchas.md"(43줄이라 싸다).
- **no-op·강제 가능 → 삭제** — AGENTS:115(전역 `attribution` 설정이 이미 강제 ✅), :116(하네스 기본 지시가 "push only when asked" ✅), :139·gotchas:23 kebab-case(validate), :141 Descriptions(기본 행동), :142 줄바꿈(`.gitattributes` `* text=auto eol=lf` ✅).
- **부정형·절대 규칙** — Git Workflow "Never …"는 긍정형으로. :41 "Always start"와 :43-47 조건부 fetch를 한 조건문으로.
- **새 결정** — #13 skill 가이드 삭제, #14 버전 범프 시점(둘 다 결정됨). #5는 불필요로 종결.

---

# 1부 — 레포 문서

## 1-1. 틀림·충돌 (고칠 것)

### AGENTS.md · CLAUDE.md · settings

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| AGENTS.md:88-99 | 로컬 테스트 전 마켓 버전 disable 지시. 공식 `plugins.md:299`: `--plugin-dir` 로컬 복사본이 그 세션에서 우선. 테스트할 때만 필요한 내용(공개 계층) | (렌즈) 절 전체를 gotchas 신설 "Testing"으로 — `--plugin-dir` 우선 + §1-4 테스트 교훈 3개와 한곳에. AGENTS에서는 삭제 | ✅ |
| AGENTS.md:86 | `unset CLAUDECODE` 우회 불필요 — `CLAUDECODE=1`에서 `claude plugin validate .` 통과 | "Run `claude plugin validate .`"로 교체, `.claude/settings.json`의 `Bash(unset CLAUDECODE*)` allow 삭제 | ✅ |
| AGENTS.md:86 · :122 · :140 · gotchas.md:19 · :21 | validate가 로컬 플러그인마다 `No version specified` 경고 — 따라서 plugin.json에 넣으면 조용히 우선. 버전 지식이 이미 4곳에 흩어짐(단일 원본 위반) | (렌즈) AGENTS "Versioning" 블록 하나로 병합: 위치 규칙 + SemVer + "validate 경고는 정상, plugin.json에 넣으면 조용히 우선" + 수정 커밋에서 범프(#14). gotchas:19·:21 삭제 | ✅ |
| AGENTS.md:79-86 Workflow | (렌즈) 1단계가 :43-47 필수 fetch와 중복. 매 플러그인 수정마다 하는 버전 범프 단계가 없음 | 1단계 삭제(조건부 fetch 문장 하나로), "Bump the plugin's version in `marketplace.json` in the same commit" 단계 추가 | ✅ |
| AGENTS.md:11-12 | lab 목록 낡음 — `lab-harness-zero`는 `76a31f5`에서 제거, claw-mo·claw-mux는 `category: null` | 삭제(원본은 marketplace.json) | ✅ |
| AGENTS.md:139 · gotchas.md:23 | `lab-` 접두사 규칙 — 쓰는 플러그인 0개, e2e-test-runner는 `"category": "lab"`만. kebab-case는 validate가 잡는다(gotchas:23 스스로 기재) | (렌즈) 둘 다 삭제. lab 표시는 marketplace.json의 기존 항목이 보여준다 | ✅ |
| AGENTS.md:22 · :103 | `references/`를 gitignored라 함 — 실제는 git 추적 심링크 `references -> ../references` | "tracked symlink to shared `../references`. Read-only." | ✅ |
| AGENTS.md:74 · gotchas.md:29 | 플러그인 settings.json 지원 키 — 공식 `plugins-reference.md:1004`: `agent`, `subagentStatusLine` | gotchas:29 수정, AGENTS:74 삭제 | ✅ |
| AGENTS.md:60 | "all plugin development work → `/skill-creator-pro`" — 그 스킬은 marketplace·validate·README를 안 다룸 | **결정(#7, 2026-09-24)**: "Skill authoring and evals: `/skill-creator-pro`. Registration, README, validation: follow Workflow below." `claude plugin eval` 안내는 AGENTS가 아니라 스킬에(§2-2 #15) | 🔹 |
| AGENTS.md:82 | "Read **only** those files" ↔ :43-45 공식 문서 필수 fetch, CLAUDE.md "read gotchas before structural change" | **삭제**(2026-09-24). 에이전트 행동이 아니라 사용자 행동 서술이고 완료 조건 없음 | 🔹 |
| AGENTS.md:3 · :36 | GEMINI.md 없음. issues 001-010은 짝 spec 없음 | :3 둘째 문장 삭제, :36 "paired by number from 011" | 🔹 |
| AGENTS.md:3-5 | (렌즈) 관리자용 메모("map, not encyclopedia") — 매 턴 컨텍스트 비용 | HTML 주석으로(주입 전 제거됨, 공식 `memory.md:138`) | ✅ |
| AGENTS.md:41 ↔ :43-47 | (렌즈) "Always start with llms.txt"(절대) ↔ "Mandatory fetch when … Skip for minor edits"(조건부) — 같은 대상 | 조건부 포인터 하나로: "When creating plugins/components, changing schema, or reviewing a spec/issue that cites official docs: fetch llms.txt, then the page; verify each cited number." | ✅ |
| AGENTS.md:110 · :115 · :116 · :120 | (렌즈) :115 Co-Authored-By 금지 — 전역 `~/.claude/settings.json` `attribution` `""`이 이미 강제. :116 no auto-push — 하네스 기본 지시와 같음(no-op). :110·:120 "Never …" 부정형 | :115·:116 삭제. :110 → "Work on `develop`; `main` receives only `--no-ff` merges at release." 태그 규칙(:120-123)은 release-workflow.md로 | ✅ |
| AGENTS.md:141 · :142 | (렌즈) Descriptions "Clear, concise" — 기본 행동(no-op), 실질은 Workflow 4단계. Line endings — `.gitattributes`(`* text=auto eol=lf`)가 이미 강제 | 둘 다 삭제 | ✅ |
| CLAUDE.md:7 | 백틱 안 `` `@AGENTS.md` ``는 import 안 됨(memory.md) + 맵 목록이 AGENTS.md와 중복 | `@AGENTS.md` 한 줄만 남김. 단 CLAUDE.md:14의 gotchas 트리거("read before …")는 AGENTS 포인터로 옮긴다(§1-3) | ✅ |
| .claude/settings.local.json:12,18,19 | `git push`·`git merge`·`git tag` allow. gitignored, 원 작성 머신에만 있음 | 변경 불필요(#5 종결) — push 금지는 하네스 기본 지시 | ✅ |
| .claude/hooks/load-secrets.sh | settings 3곳(project·local·user) 어디에도 등록 안 됨 | **삭제**(#16, 2026-09-24). toolbox secret-setup의 같은 경로 언급은 유저 레포에 생성하는 파일이라 무관 | ✅ |

### docs/reference

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| skill-building-guide.md · skill-lessons-from-anthropic.md 전체 | Claude.ai PDF·X 글 옮김. 공식과 충돌 다수(Required Fields·1024자·5,000단어 ↔ 전부 선택·1,536자·500줄, 없는 파일 3개 참조, "CRITICAL:" 문체, Claude.ai·API 배포 절, `/skill-creator` 안내). `docs/context/skill-creator-pro.md:18-19`가 이미 "~95% 공식과 같음 → 빠진 부분만 증류" 판정 ✅. 작성 지식은 llm-wiki(`agents-md`·`progressive-disclosure`·`skill-formation`)에 있음 | **두 파일 삭제**(#13, 2026-09-24). 함께: AGENTS Knowledge Map :33-34·INDEX :13-14 행 삭제, `context/skill-creator-pro.md:18-19` 갱신, auto-optimize SKILL.md:59 참조 삭제(2부 skill-creator-pro) | ✅ |
| skill-lessons-from-anthropic.md:191 ↔ gotchas.md:13 | "Reference other skills **by name**" ↔ 플러그인 독립성. 공식에 `dependencies` 필드 존재(`plugins-reference.md:583`) | 파일은 삭제되므로 gotchas 쪽만: "hard dependency → `plugin.json` `dependencies`" 추가(§1-4 "Self-contained plugins" 절로) | ✅ |
| gotchas.md:27 | 플러그인 에이전트 지원 필드 목록 불완전(`name`, `description`, `effort` 누락, `isolation`은 `"worktree"`만) — `plugins-reference.md:72-73` | 목록 빼고 "ignored: `permissionMode`, `hooks`, `mcpServers`"만 | ✅ |
| gotchas.md:33 | ~200단어, 절반이 vision-powers 전용 artifact-design 논증 | 2줄로 축약("`allowed-tools` only pre-approves; declare `Skill(<name>)` for skills you load"), carve-out은 `docs/context/vision-powers.md`로 | 🔹 |

### docs/INDEX.md · 기타

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| INDEX.md:9, :13-14 | "Required reading"·"spec" — 두 문서는 Claude.ai PDF·X 글 옮김, 공식과 충돌 다수 | 두 행 삭제(#13). :9는 gotchas 행에 맞게 "Read before any plugin change" | 🔹 |
| INDEX.md:17 | "see CLAUDE.md for the entry point" — 진입점은 AGENTS.md:41 | "see AGENTS.md § Official Claude Code Docs" | 🔹 |
| INDEX.md:24 | `plugin-marketplaces.md` 설명 — 실제는 홍보 채널 목록, 파일명도 공식 페이지명과 겹침 | `docs/promotion-channels.md`로 이름 변경 | ✅ |
| INDEX.md:30-34 | `adr/`, `context/` 미등록 | 디렉터리 행 추가 | ✅ |
| INDEX.md:36 | superpowers 폐지 이력 | 삭제 | 🔹 |
| INDEX.md:5 | handoff 수명 규칙 없음 → 퇴적 원인. (렌즈) "register it in this index"가 파일 단위 등록을 불러 목록이 낡음. 설계 기록 상태줄 10건 낡음도 같은 원인(갱신 시점 규칙 없음) | "Handoffs are temporary: once absorbed into specs/issues/ADRs/commits, delete them." + "Register directories, not files." + "Update a spec/issue status line in the commit that completes it." | 🔹 |
| INDEX.md:46-63 | research·handoff 등록이 실제와 불일치 | §1-2 삭제 후 디렉터리 행으로 정리 | ✅ |
| release-workflow.md:20 | 레포 태그 번호 기준 없음(SemVer는 플러그인 버전용) | 기준 한 줄 추가: "Repo tag: minor if any plugin got a minor or major bump, else patch." (#6 결정) | ✅ |
| release-workflow.md:17-18 | (렌즈) 3·4단계 "릴리즈 때 범프할 플러그인을 묻고 범프" ↔ 메모리 `feedback_version_bump` "수정 커밋에서 범프, 묻지 않음". 이력에 둘 다 있음 ✅(`89cb4a7` 릴리즈 범프, `c865a28` 수정 커밋 범프) | #14 결정: 3단계 → "Check every plugin changed since `main` has a version bump", 4단계 범프 커밋 삭제. AGENTS 태그 규칙(:120-123)을 여기로 흡수 | ✅ |
| `.claude/worktrees/remove-test-3` | 살아 있는 git worktree(브랜치 `worktree-remove-test-3`) — docs 사본이 레포 grep 오염. 원 작성 머신에만 있음 | `git worktree remove` 결정(§1-5 #4) | ✅ |

### 설계 기록 (docs/specs · issues · adr · context)

기록 문서라 결정 근거·이력은 줄이지 않는다. 상태줄·뒤집힌 결정 표시·끊긴 링크만 고친다.

**상태줄이 사실과 다름**

| 문서 | 적힌 상태 | 실제 | 수정안 | 확인 |
|---|---|---|---|---|
| issue 001 | 구현 대기 | 완료 `4252baf`, AC 8/10 | "완료(4252baf) · eval·validate AC 2건 + ADR 0002 범위 follow-up 잔여" | 🔹 |
| issue 002 | 구현 대기, 체크박스 27개 전부 `[ ]` | 구현 `abb1db6`, CHANGELOG AC는 `e4ea197`로 무효 | 상태 갱신 + AC 체크 | ✅ |
| issue 003 | "다음 할 일은 릴리즈" | 릴리즈 `56e6138`(v1.76.0), duck-orient 한계는 `d1ac06a`로 해소 | First Action 교체, :581-586 "해소: d1ac06a" | 🔹 |
| issue 005 | 구현 대기, 체크박스 27개 `[ ]` | S1 출시 `08f3ee1`, S2(File Map)는 ADR 0010으로 폐기, S3~S6 미착수 | 상태 갱신 + S2 폐기 표시 | ✅ |
| issue 009 | 헤더 "커밋 40423bd" ↔ 본문 :85-90 "모두 미커밋" | 커밋됨, :255 결함은 `d1ac06a`로 해소 | 본문 스냅샷 표시 | 🔹 |
| issue 011 | ready-for-agent | 완료 `99ced96`(worktree-plus 3.1.0) | "완료" | ✅ |
| issue 012 | ready-for-agent | 완료 `92c01ce`(codex-advisor 4.7.0) | "완료 · spark 별칭은 `4e80b17`(5.0.0)에서 제거" | ✅ |
| issue 013 | ready-for-agent | S1~S3 완료 `761f101`(4.8.0), S4 미실행 | 상태 갱신 + AC 체크 | ✅ |
| issue 014 | "미푸시", :46 severity AC `[x]` | `c865a28`은 origin에 있음, `artifact-gate.js:416` gradient-text에 severity 없음 | :88·:153 "푸시됨", :46 `[ ]` | 🔹 |
| spec 016:7, :250-252 | "③은 ADR 후보", §ADR 후보 "ADR 0012를 쓴다" | ADR 0012 존재(`3f5ec7b`). §그릴 가이드·§핸드오프는 `085fc18`의 :265 역사 기록 배너로 해소 | :7·:250에 "ADR 0012로 확정" 표시 | 🔹 |

**뒤집힌 결정인데 표시 없음**

| 문서 | 뒤집은 쪽 | 수정안 | 확인 |
|---|---|---|---|
| issue 007:3, :68-70 | issue 010 / ADR 0009 (artifact-first 기본) | superseded 배너 | 🔹 |
| ADR 0002 | 0005·0007 (보일러플레이트 복귀, CDN 로컬 전용) | frontmatter `amended-by` + 배너(0007:2-13 형식) | 🔹 |
| ADR 0005 | 0007·0010 (File Map 삭제, CDN 로컬 전용) | 동일 | 🔹 |
| ADR 0004:39-41 "default model is gpt-5.5" | spec 012 D5 (기본 모델 없음) | "(Corrected by spec 012 D5)" | 🔹 |
| ADR 0009:81-83 fact-check 갭 | issue 010 S5(`b9d5ddf`)로 해소 | 구현 노트 한 줄 | 🔹 |

**충돌·중복·링크**

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| context/codex-advisor.md:22 | "landing via issue 006" — 출시됨 `a35c1b0` | "(issue 006)" | 🔹 |
| spec 016:184 | spec 012 D2 근거를 잘못 인용("companion과 동일 별칭") | 012:84-88 실제 문장으로 | 🔹 |
| context/rubber-duck-tutor.md ↔ plugins/rubber-duck-tutor/CONTEXT.md | 용어집 2개, Confrontation·Gap·Engagement 정의 불일치. 루트 `CONTEXT-MAP.md`는 plugin 쪽 1개만 가리킴 | `docs/context/` 정본으로 병합, plugin CONTEXT.md 삭제, CONTEXT-MAP이 `docs/context/*.md` 4개를 가리키게 | ✅ |
| context/rubber-duck-tutor.md:67 | Engagement = "트랜스크립트 기반 신호" ↔ engine.md:243-250 "live conversation, not re-parse transcript" | 대화 기반 정의로 교체 | 🔹 |
| context/rubber-duck-tutor.md:106 | 삭제된 handoff 파일 링크(`3eb1340`) | issue 003 + ADR 0008 링크로 | ✅ |
| context/skill-creator-pro.md:37 | "Keep eval harness" ↔ 같은 파일 :14, ADR 0001 "restore to official" | "Restore eval harness to official" | 🔹 |
| context/vision-powers.md:11-15 | Mermaid CDN이 기본인 것처럼 기술 ↔ ADR 0009 기본은 inline SVG | "(Local channel only: …)" | 🔹 |
| context/vision-powers.md:176-188 ↔ issue 014:127-134 | 구현 때 좁힌 결정(flowchart·state만 검사, phantom 클래스)이 이슈에만 있음 | ~~용어집에 반영~~ **반영 안 함**(2026-09-24) — 구현 세부라 용어집 대상 아님 | 🔹 |

재검수 삭제(issue 016 구현으로 해소): issue 016:55 "미커밋" · context/codex-advisor.md:57-99 "미구현 설계" — 출시됨, "Planned" 분리는 이제 거짓 · context/codex-advisor.md:65-66 · issue 016:190 — `1475e73`에서 교정 · issue 016:4 "스펙이 맞다" — 열린 결정이 스펙에 반영됨(`1475e73`·`085fc18`), 미결 배너는 이제 거짓 · spec 016:249 §그릴 가이드 — :265 역사 기록 배너로 해소.

## 1-2. 버릴 것 (퇴적)

| 파일 | 상태 근거 | 판정 |
|---|---|---|
| handoff/2026-05-05-claude-preset.md | 착수 안 함, 미확인 추정이 결정처럼 기재 | 삭제(#2 결정 2026-09-24) |
| handoff/2026-06-03-skill-creator-pro-v2-rebaseline.md | 완료 `29d2849`, 문서엔 "커밋 0개" ✅ | 삭제 |
| handoff/2026-06-06-doc-visual-artifact-redesign.md | 완료 `4252baf`, 잔여는 issue 001에 있음 | 삭제 |
| handoff/2026-06-14-vision-powers-audit.md | 완료 `9884796`·`b63f8a6` | `node --test <dir>` 교훈 흡수 후 삭제 |
| handoff/2026-06-20-vision-powers-visual-leverage.md | 완료 4.4.1, 버전·CHANGELOG 지시 틀림 | 삭제 |
| handoff/2026-06-27-vision-powers-review-fixes.md | 완료 `f38d79f`, 문서엔 "전부 미착수" | 삭제 |
| handoff/2026-06-27-vision-powers-structured-blocks.md | Phase 1 완료, 잔여 S3~S6은 issue 005 | 삭제 |
| handoff/plugin-diet.md | 완료, 표가 현재 코드와 불일치 | 삭제 |
| handoff/harness-zero/HANDOFF.md | 레포 떠남(`76a31f5`), 참조 문서 삭제됨 | 삭제 |
| handoff/new-vibe/HANDOFF.md | 대부분 반영 `544ca16`, 일부 결정 뒤집힘. Issue 7(`discover.sh:16` 경로 오염)은 미반영 ✅ | 삭제 — Issue 7은 §2-7 #24로 이동(#2 결정 2026-09-24) |
| handoff/vision-powers/environment-health-v2.15.md | 완료 `8c958fd`, 스킬 개명됨 | 삭제 |
| enhancement/2026-04-18-vision-powers-audit.md | 대상 파일·스킬 전부 없음 ✅ | 삭제 |
| enhancement/2026-04-23-rubber-duck-git-hook-latency.md | 해결 `d0d3ba1` | hook `if` 좁히기 교훈 흡수 후 삭제 |
| research/deeptutor-analysis.md | llm-wiki `summaries/deeptutor.md`가 더 새로움 ✅ | 삭제 |
| research/career-ops-analysis.md | llm-wiki `summaries/career-ops.md`와 중복 ✅ | 삭제 |
| research/ai-context-tools-comparison.md | 외부 도구 조사, 레포 무관 | 삭제(#3 결정 — llm-wiki `comparisons/code-understanding-tools.md`에 있음) |
| research/token-efficiency-tools-comparison.md | 외부 도구 조사, AGENTS.md에 없는 문구를 사실로 인용 | 삭제(#3 결정 — llm-wiki에 있음) |
| research/2026-04-23-vibeproxy-codex-reasoning-aliases.md | vibeproxy-kit payload.override 설계 근거(`f8b0785`) | 유지 + 상단에 "§10 적용됨" + INDEX 등록 |

## 1-3. AGENTS.md 줄이기 (153줄)

| 섹션 | 판정 | 이유 |
|---|---|---|
| Repository Overview 플러그인 목록(:10-12) | 삭제 | marketplace.json이 원본, 이미 낡음 |
| Directory Structure(:14-23), Plugin Component Structure(:62-75) | 삭제, :77 한 줄만 유지 | `ls`로 보이는 트리, 공식 컴포넌트(`workflows/`, `output-styles/` 등) 누락으로 이미 낡음 |
| Knowledge Map 표(:27-37) | (렌즈) "조건 → 대상" 포인터로 재작성. 필수만: gotchas(Before any plugin change), release-workflow(When the user asks to release or tag), specs/issues, INDEX. skill 가이드 2행 삭제(#13) | 현재는 무엇(what)만 있고 언제(when)가 없음. release 포인터 3곳 중복(:35, :125, CLAUDE.md) |
| Official Docs(:39-56) | :41·:43-47은 조건부 포인터 하나로(§1-1), :49 페이지 나열 삭제, :51 Codex 링크는 `context/codex-advisor.md`로, :53-56 대용량 파일 규칙은 **유지** | :53-56은 작업 도중에 닥치는 상황이라 gotchas로 빼면 포인터가 제때 안 걸림 |
| Plugin Development Workflow(:58-99) | §1-1 수정 반영: 1·2단계 삭제, 버전 범프 단계 추가, Local Testing → gotchas "Testing" | |
| references/ 섹션(:101-105) | 한 줄로 | |
| Git Workflow(:107-125) | :110 긍정형, :115·:116 삭제, 태그 규칙·pre-flight(:120-123)는 release-workflow.md로, 포인터 1개 | 중복·no-op·부정형 |
| Plugin Data Paths(:127-134) | 삭제, "Before any plugin change, read `docs/reference/gotchas.md`." 한 줄 | gotchas:9·39와 중복. (렌즈) 포인터가 hooks·scripts·testing을 불러야 §1-4 교훈에 닿음 — 갈래를 나열하느니 "any plugin change"(43줄이라 싸다) |
| Coding Style(:136-142) | Language + Versioning 블록(§1-1)만 남기고 + §1-4 원칙 2줄(deterministic, 로직은 스크립트에) | :139 validate, :141 no-op, :142 `.gitattributes`가 이미 강제 |
| Plugin README Style(:144-153) | `docs/reference/readme-style.md`로 이동, Workflow 4단계에 포인터 | README 작업에만 필요 |
| 머리말(:3-5) | HTML 주석으로 | 관리자용 메모, 주석은 주입 전 제거 |

**유지해야 할 것:** AGENTS.md:43-45(인용 숫자를 공식 원문과 대조), :53-56(WebFetch 요약 사고), 버전 우선순위(gotchas:19 → AGENTS Versioning 블록으로 이동), gotchas.md:31(`Write(path)` 미동작), :43(리서치 결과 대조).

## 1-4. 메모리 이관 맵

메모리 위치: `~/.claude/projects/-Users-ljo-Desktop-project-zero-code-claude-code-zero/memory/` (27개, 원 작성 머신). 레포 문서는 영어로 작성. 아래 "살릴 내용" 요약만으로 레포 반영은 가능하고, 원문 대조와 폴더 정리는 원 작성 머신에서 한다. 다른 머신의 메모리(`/Users/leejuo/…`: `subagent-model-preference`, `wiki-is-symlink-to-llm-wiki`)는 이 맵에 없다(§1-5 #12).

**살릴 것**

| 메모리 | 살릴 내용 | 목적지 |
|---|---|---|
| project_rubber_duck_redesign | jq `.key // default`가 JSON `false`를 삼킴 → boolean은 raw 비교 | gotchas.md 신설 "Hooks & scripts"(렌즈: 테스트 교훈은 "Testing"으로 분리) |
| project_rubber_duck_redesign | `set -u` 아래 `${CLAUDE_PLUGIN_ROOT}` 무가드 참조 → hook 전체 사망. `[[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]` | gotchas.md "Hooks & scripts" |
| (enhancement 문서) | hook `if` 조건을 좁혀 프로세스 기동 전에 거르기 | gotchas.md "Hooks & scripts" |
| (handoff 문서) | `node --test <dir>`은 가짜 fail — 파일 경로를 지정 | gotchas.md 신설 "Testing" |
| project_worktree_plus_setup_skill | headless `-p` 쓰기 검증: `--permission-mode acceptEdits` + 프롬프트에 선승인 | gotchas.md "Testing" |
| project_vision_powers_artifact_channel | 설치 캐시가 레포보다 오래되면 일반 세션의 Skill 툴이 구 로직 실행(`--plugin-dir`은 로컬 우선) | gotchas.md "Testing"(AGENTS:88-99 이동분과 한 항목) |
| feedback_plugin_data_paths | 임시 파일·산출물도 `${CLAUDE_PLUGIN_DATA}`, CWD 금지 | gotchas.md:39 보강 |
| (재검수 발견, 2부 공통) | Bash 도구 환경의 `CLAUDE_PLUGIN_DATA`는 비었거나 남의 플러그인 폴더 ✅ → 스크립트엔 경로를 인자로 | gotchas.md:39 같은 항목에(렌즈: 동일 위치) |
| feedback_audit_scope | 최소 요구 버전은 유지, "tested against"는 재확인 절차 없으면 삭제. 릴리즈 노트 감사 때 억지 변경 금지 | (렌즈) gotcha 아님(조용한 실패가 아닌 드문 작업의 판단 규칙) → **버림**(#15, 2026-09-24). S5에서 메모리 파일 삭제 |
| feedback_verify_rules_against_references | 내부 문서의 FORBIDDEN 규칙도 코드로 강제 전 references와 대조 | gotchas.md:43 병합 |
| feedback_deterministic_over_clever | 로직 배치는 프롬프트보다 hook/스크립트 고정 코드 우선, 가지 기각 전 최선 변형 검토 | (렌즈) 두 뜻 분리: 앞은 AGENTS Coding Style("Prefer deterministic code — hooks, scripts — over prompt instructions for anything checkable"), 뒤("기각 전 최선 변형")는 협업 규칙 → #1 묶음 |
| feedback_plugin_scope | 플러그인엔 기능 범위에 해당하는 지식만 | (렌즈) gotchas:11(설치본 격리)·:13(독립성)과 같은 개념 → gotchas 신설 "Self-contained plugins" 한 제목 아래 셋 + `dependencies`(§1-1) |
| feedback_version_bump | 플러그인 수정 커밋에 버전 범프 포함, 따로 묻지 않음 | AGENTS Versioning 블록 + Workflow 범프 단계. release-workflow.md 3·4단계와 충돌 → #14로 해소 |
| project_vision_powers_artifact_channel | `artifact-gate.js`는 HTML을 텍스트로만 읽음 — 통과 ≠ 렌더 정상 | docs/context/vision-powers.md |
| project_rubber_duck_redesign | 단일턴 trigger eval은 auto-detect형 스킬에 부적합 | docs/context/skill-creator-pro.md |
| feedback_no_unilateral_decisions · feedback_grill_plan_edits_to_doc · feedback_removal_scope · (015·013 메모의 질문 스타일) | 보고 ≠ 승인 / 그릴 중엔 이슈 문서에 작업으로 / 가리킨 레이어만 삭제 / 질문은 하나씩 짧게 | AGENTS.md(§1-5 #1) |

**삭제할 것** — 레포에 이미 있음: `project_references_folder_purpose`, `feedback_issue_docs_location`, `feedback_release_pull_first`, `feedback_readme_style`, `reference_origin_docs`. 끝났거나 낡음: `project_diff_visual_catch_up`, `project_worktree_plus_setup_skill`(교훈 이관 후), `project_vision_powers_artifact_channel`(교훈 이관 후), `project_rubber_duck_redesign`(교훈 이관 후), `project_codex_advisor_105`, `project_skill_creator_pro_status`, `project_codex_advisor_016`(이슈 016에 있음). 다른 레포: `project_harness_engineer`, `reference_harness_landscape`, `project_health_visual_skill`, `project_backend_diagram_015`. 판단 필요: `project_product_demo_video`.

## 1-5. 결정 필요

1. ~~협업 규칙(§1-4 마지막 행 4개 + `deterministic_over_clever` 뒷부분 "기각 전 최선 변형") 위치 — 전역 `~/.claude/CLAUDE.md` vs AGENTS.md~~ — **결정(2026-09-24): AGENTS.md.** 두 머신이 git으로 공유. 다른 레포엔 적용 안 됨을 감수
2. ~~handoff 중 살릴 것 — `claude-preset` 아이디어(삭제/spec), new-vibe Issue 7~~ — **결정(2026-09-24):** claude-preset 삭제. Issue 7은 실제 버그 → §2-7 #24에 합치고 vibeproxy-kit 작업은 2부 맨 끝(플러그인은 유지)
3. ~~research 2개 llm-wiki 이동~~ — **결정(2026-09-24): 삭제.** 위키에 이미 있음
4. `.claude/worktrees/remove-test-3` 제거 여부 (원 작성 머신)
5. ~~`settings.local.json` `git push` allow → ask 전환 여부~~ — **종결(2026-09-24): 불필요.** push 금지는 하네스 기본 지시
6. ~~release-workflow 레포 태그 번호 기준~~ — **결정(2026-09-24): 기존 관행 명문화.** 이번 릴리즈에 minor·major로 오른 플러그인이 있으면 태그 minor, patch만이면 태그 patch(v1.83.0 ← codex 5.0.0, v1.83.1 ← 5.0.2)
7. ~~AGENTS.md:60(모든 플러그인 작업 → `/skill-creator-pro`) — 제안 문구(§1-1)로 할지~~ — **결정(2026-09-24): 제안 문구대로.** 공식 skill-creator 대신 pro를 가리킨다(본문 동일 + 플러그인 스킬용 35줄, 결함은 §2-2에서 수정). 플러그인 스킬의 동작 검증(`claude plugin eval`)은 스킬에 넣는다(§2-2 #15). :82는 삭제
8. rubber-duck #2 수정안 — (a) 원안: 4번을 "already committed session edits"로 재정의 (b) 3·4번 순서 교환. (a)는 미커밋 세션 편집을 `/duck-review`로 보내 duck-verify:4("code just written")와 어긋나고, (b)는 Mode Map(:18-19) 순서와 맞는다
9. skill-creator-pro #9 — `claude`/`anthropic` 예약 규칙 유지 여부. API·claude.ai 스킬엔 유효한 규칙이라 #11(Claude.ai 절 삭제, ADR 0001) 결정과 묶인다
10. vision-powers #7 — doc-visual의 md 게시 예외를 인정하려면 channel-decision.md의 권위인 ADR 0009 §3 개정이 따라온다. 개정할지, doc-visual의 md 게시를 없앨지
11. 실행 확인 필요(결정 아님): claw-mux #2(라이브 pane에서 `❯` 오판 재현) — 남음. ~~2부 공통 "reference 파일 치환"~~ 확인됨(치환 안 됨, 2026-09-24)
12. ~~다른 머신 메모리 2개 이관 여부~~ — **결정(2026-09-24, 이 머신 `/Users/leejuo`에서 처리):** `subagent-model-preference` 버림(Fable 세션 전제), `wiki-is-symlink-to-llm-wiki` → AGENTS.md `references/ · wiki/` 절 반 줄(llm-wiki 레포에서 수정). 두 메모리 파일 삭제함. 원문: — `subagent-model-preference`(→ 전역 선호. 근거가 "세션이 Fable 5"라 지금도 유효한지 확인), `wiki-is-symlink-to-llm-wiki`(→ 전역 `~/.claude/CLAUDE.md` 후보: `wiki -> ../llm-wiki/wiki` 심링크가 claude-code-zero·excalidraw-architect·link-dive 3개 레포에 있음 ✅). 전역 CLAUDE.md는 이 머신에 아직 없음 ✅
13. ~~skill 가이드 2개(skill-building-guide·skill-lessons) 줄 단위 수정 vs 삭제~~ — **결정(2026-09-24): 삭제.** §1-1 docs/reference 행
14. ~~버전 범프 시점: 수정 커밋(메모리) vs 릴리즈 때 묻기(release-workflow 3단계)~~ — **결정(2026-09-24): 수정 커밋.** release-workflow 3단계는 범프 누락 확인으로
15. ~~`feedback_audit_scope` 메모리(최소 요구 버전 유지, "tested against"는 재확인 절차 없으면 삭제) — 렌즈 제안대로 버릴지~~ — **결정(2026-09-24): 버림.** 파일 삭제는 S5(원 작성 머신)
16. ~~`.claude/hooks/load-secrets.sh` 삭제 여부~~ — **결정(2026-09-24): 삭제.** — git 추적 파일, settings 3곳(project·local·user) 어디에도 등록 안 됨(2026-09-24 이 머신에서 재확인 ✅). §1-1 "삭제 후보" 행

## 1-6. 수정 순서

1. 틀림·충돌·상태줄 수정 (§1-1)
2. 퇴적 삭제 (§1-2, 결정 #2·#3 반영)
3. AGENTS.md·CLAUDE.md 줄이기 + 메모리 이관 (§1-3, §1-4, 결정 #1 반영)
4. 메모리 폴더 정리 (레포 밖, 원 작성 머신)

---

# 2부 — 플러그인

수정 시 플러그인마다 버전 범프가 따라온다. 공통 관찰:

- **description 비용:** `disable-model-invocation: true` 스킬은 description이 컨텍스트에 안 들어간다(skills.md:509). 매 세션 비용은 모델 호출형만 해당 — codex-advisor 10개 1,974자, skill-creator-pro 2개 760자, vision-powers `diff-visual` 531자·`doc-visual` 399자가 큼.
- **본문 길이:** 공식 팁 500줄 초과 — vision-powers `context-health-visual` 557·`plugin-visual` 553·`diff-visual` 543, `skill-creator-pro` 520, rubber-duck `engine.md` 375(모든 /duck-* 실행마다 로드).
- **설치본 격리 위반 패턴:** 여러 플러그인이 레포 전용 경로(`docs/…`, `references/…`, research §번호)를 가리킴 — 설치본엔 없음(gotchas "Installed plugin isolation").
- **Bash 환경변수 (재검수 추가):** `CLAUDE_PLUGIN_ROOT`·`CLAUDE_PLUGIN_DATA`는 Bash 도구 환경에 없다(plugins-reference.md:765). SKILL.md·에이전트 본문의 `${…}`는 치환되지만, Bash로 실행된 스크립트가 `process.env`/`os.environ`으로 읽으면 안 된다. 2026-09-23 세션 Bash엔 다른 플러그인 값 `CLAUDE_PLUGIN_DATA=~/.claude/plugins/data/codex-openai-codex`가 들어 있었다 ✅ — 비어 있는 게 아니라 **남의 폴더**를 가리킨다. 해당: vision-powers #4, vibeproxy-kit #24, rubber-duck-tutor #21. 경로는 인자로 넘긴다.
- **reference 파일 치환 (재검수 추가, 2026-09-24 확인 ✅ — 치환 안 됨):** 설치본 `claw-mo/2.8.2/references/shared.md`에 `${CLAUDE_PLUGIN_DATA}`가 문자 그대로 있고 Read는 디스크 내용을 그대로 돌려준다. 같은 날 Bash 환경: `CLAUDE_PLUGIN_ROOT` 빈 값, `CLAUDE_PLUGIN_DATA`=`…/data/codex-openai-codex`(남의 폴더) 재현. 공식은 치환 위치를 "the skill's markdown content"와 `allowed-tools`로만 적는다(skills.md:416). Read로 여는 references 파일의 `${CLAUDE_PLUGIN_ROOT}`·`${CLAUDE_PLUGIN_DATA}`·`${CLAUDE_SKILL_DIR}`는 치환되지 않을 가능성이 있다 — 그대로 Bash에 넣으면 빈 값이거나 위의 남의 값. 해당 파일: claw-mo `references/shared.md`, codex-advisor `references/companion-usage.md`·`evaluation.md`, rubber-duck `skills/ducking/engine.md`, vibeproxy-kit `references/model-selection.md`·`write-guide.md`, vision-powers `references/design-system/{channel-decision,structured-blocks,visual-self-audit}.md`·`plugin-visual/.../analysis-criteria.md`. 실행 확인 후(§1-5 #11) 공통 처리.

## 2-1. vision-powers

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | context-health-visual/SKILL.md:154-155 | `trigger-collision-inspector` 에이전트가 `skills/context-health-visual/agents/`에 있음 — 플러그인 에이전트는 루트 `agents/`만 로드, §5 호출 실패 | 루트 `agents/`로 이동, `vision-powers:trigger-collision-inspector`로 호출, :550·health-criteria:282 경로 수정 | ✅ |
| 2 | high | plugin-visual/.../analysis-criteria.md:185,189-190, env-fit-diagnosis.md:66,87-91, report-template.md:121 | "2% of context window, 16,000 fallback" — 공식 1%(skills.md:1083), context-health-visual과도 충돌 | 1% + 오버라이드 설정으로 교체, 공유 파일 하나만 가리키게. #3 먼저(가리킬 health-criteria가 아직 틀림) | ✅ |
| 3 | high | context-health-visual/SKILL.md:133,430,436-437, health-criteria.md:138-139,150-154,177, context-health-visual/scripts/env-health-scan.js:1152 | "8,000-char fallback", "dynamically shortened" — 현 공식: 덜 쓰는 스킬 description부터 제거, 신규 설정(`skillListingBudgetFraction`·`skillOverrides`·`skillListingMaxDescChars`) 미반영. 스캔 스크립트는 `SLASH_COMMAND_TOOL_CHAR_BUDGET`만 읽음 | 현 공식 기준으로 교체 + 스크립트가 세 설정도 읽게 | 🔹 |
| 4 | high | report-manager/SKILL.md:157(+:19,:57,:85), scripts/config.js:44, list-reports.js:23, render-report.js:83, log-report.js:22 | "`$CLAUDE_PLUGIN_DATA` is a shell env var, not a SKILL.md substitution" — 공식 skills.md:414-416은 치환함. 반대로 스크립트 4개는 `process.env.CLAUDE_PLUGIN_DATA`를 읽는데 Bash 환경엔 이 변수가 없거나 남의 값(2부 공통 "Bash 환경변수") | gotcha 삭제, SKILL.md는 `${CLAUDE_PLUGIN_DATA}`로 통일 + 스크립트는 경로를 인자로 받게 | ✅ |
| 5 | high | report-manager:97,124-153, fact-check:66-87,260, marketplace desc, README:86,106,108 | ✎ 섹션 피드백 UI를 심는 생성 스킬이 없음, ADR 0007이 Artifact에서 제거 → 수확 경로 전부 죽음 | 피드백 수확 절·감지 절·description·README 문구 삭제 | 🔹 |
| 6 | high | context-health-visual/SKILL.md:412,492-495 | `sections-data.json`에서 `body` 제거하라는 프라이버시 가드 — 그 파일 없음(:247). 스캔은 `excerpt`(env-health-scan.js:1324)·`raw`(:1101)를 냄 | 스캔 스크립트가 본문 필드를 안 내게 보장, SKILL.md는 한 줄 | 🔹 |
| 7 | high | channel-decision.md:32-34 ↔ doc-visual:43,76-77,132-162 | "md never changes / stays local" ↔ doc-visual은 md를 `--artifact`로 게시. channel-decision:9-10은 ADR 0009를 권위로 둠 | §1-5 #10 결정 후: 예외 인정이면 ADR 0009 §3 개정 + SSOT 표 예외 행 + doc-visual:43·76-77 삭제 | 🔹 |
| 8 | high | plugin-visual:509, agents/coherence-reviewer.md | `--verify` 플래그·coherence-reviewer 호출이 어디에도 없음 — 에이전트 description 229자만 매 세션 비용 | :509 삭제, 에이전트 삭제(또는 호출 단계 명시) | 🔹 |
| 9 | high | analysis-criteria.md:145,180-181,206, env-fit-diagnosis.md:69,76, report-template.md:122 | "MCP tool definitions load at session start, capped at 10%" — 공식: 기본 전부 deferred(mcp.md tool search). MEMORY.md를 deferred로 분류 | health-criteria §2·§7 모델로 교체(#3 이후) | 🔹 |
| 10 | high | fact-check/SKILL.md:46-47 | diff-visual 리포트 감지를 "Diff Visual" 제목으로 — 현재 제목은 "— Catch-up". "Doc Visual"(:47)도 실제로 안 나옴 | 파일명 접미사 규칙으로(report-manager:160과 동일, `.artifact` 접미사 제거 포함) | 🔹 |
| 11 | high | agents/security-auditor.md:94-119, plugin-visual:524 | "22 hook events as of 2026-03" — 현재 33개. :524가 가리키는 security-rules.md 이벤트 목록도 없음 | 이벤트 표 → 판단 기준(차단 가능/컨텍스트 주입/도구 출력 관찰). 에이전트 도구가 Read/Glob/Grep뿐이라 hooks.md URL 포인터는 못 따라감 — 필요한 목록은 호출 측이 넘긴다 | 🔹 |
| 12 | high | analysis-criteria.md:149-158 ↔ plugin-visual:8,:531 | "All checks run in a single bash block" — `grep`/`ls`가 allowed-tools에 없어 권한 프롬프트로 멈춤(:531 스스로 185s 대기 관측). MCP 체크가 grep하는 `~/.claude/.mcp.json`은 공식 위치 아님(`~/.claude.json`, `.mcp.json`) | `env-fit-scan.js --requirements` 인자로 이동, MCP 경로 교정. 이후 `Bash(which *)`도 미사용(#30과 함께 삭제) | 🔹 |
| 13 | high | agents/security-auditor.md:40 | `security-rules.md` Context Modifiers 참조 — 에이전트는 경로를 못 받음, 9개 중 4개만 복제 | 에이전트 본문에 `${CLAUDE_PLUGIN_ROOT}/…/security-rules.md` 직접 기재(에이전트 본문은 치환됨, plugins-reference.md:769), 에이전트 내 중복 표 삭제 | 🔹 |
| 14 | med | mermaid-patterns.md:484, feature-architect:277, plugin-visual:359,:530 | 노드 한도 15-20/~15/25 ↔ density-rules 9(게이트 강제) | 포인터로 통일 | 🔹 |
| 15 | med | agents/feature-architect.md:250 | violet classDef ↔ semantic-tokens.md:69 금지, 게이트는 4개 hex만 검사 | slate로 교체 | 🔹 |
| 16 | med | mermaid-patterns.md:386,408 | "ELK default" ↔ :27 "Only import when needed", 템플릿은 ADR 0002로 삭제 | 절 삭제 | 🔹 |
| 17 | med | context-health-visual:18 ↔ :344-345,:521-522 | observational 섹션 5개 vs 4개 | "6 graded + 5 observational"로 통일, :344 "10 diagnostic sections"도 11로 | 🔹 |
| 18 | med | doc-visual:4-7, diff-visual:4-9, report-manager:4-5, plugin.json/marketplace | description 동의어 나열, diff-visual 531자는 본문 반복, plugin.json(676자)·marketplace(1004자) 불일치 | 짧게 재작성 + 두 매니페스트 동기화 | ✅(길이) |
| 19 | med | doc-visual:94-121,319-355, diff-visual:354-398,491-519, plugin-visual:413-490, context-health-visual:326-407 | Artifact 채널 블록 ~70줄 × 4 복제 | `references/design-system/artifact-channel.md` 하나로, channel-decision.md(ADR 0009 SSOT)에서 링크 | 🔹 |
| 20 | med | 5개 스킬 local 채널 규칙 | 로컬 규칙·CSS·self-audit 5곳 중복, 일부는 게이트가 이미 강제 | `local-channel.md` 포인터, channel-decision.md에서 링크 | 🔹 |
| 21 | med | 4개 스킬 "Config precedence" 7줄 | channel-decision.md 복제 | channel-decision.md 포인터로 삭제. (`config.js channel` 서브커맨드안은 channel-decision:77-80 "config.js는 단순 키-값"과 충돌해 뺌) | 🔹 |
| 22 | med | context-health-visual:426-541 등 | Gotchas 115줄 대부분 health-criteria 중복·유지보수자 메모 | 런타임 사실은 criteria로, 유지보수 메모는 docs로 → 세 파일 500줄 미만 | 🔹 |
| 23 | med | feature-architect:157-177,354-399 ↔ analysis-criteria:69-119 | 품질 기준 이중화, 체크리스트 14 vs 7로 갈라짐 | analysis-criteria SSOT | 🔹 |
| 24 | med | 여러 스킬 | 개발 흔적("S2–S4", "issue 007 S4.5")과 설치본에 없는 경로(`docs/…`, `references/Kami/…`) | 삭제, 필요한 이유는 인라인 한 문장 | 🔹 |
| 25 | med | fact-check:171-173, report-manager:100,161 | 템플릿 시절 클래스(`ve-card`, `--i`) | "match existing markup" 한 줄 | 🔹 |
| 26 | low | 5개 스킬 | 8 Tells 재나열, 목록 갈라짐(report-manager:101은 7개, "borrowed costume" 누락) | anti-slop-tells.md 포인터 | 🔹 |
| 27 | low | diff-visual:188,400-405 | "Use extended thinking", 측정 기록 — no-op | 삭제 | 🔹 |
| 28 | low | env-fit-diagnosis.md:43 | "Six Diagnostic Analyses" — 실제 8개, `skills-lock.json`은 공식 문서·디스크 어디에도 없음(실제 파일은 `~/.claude/plugins/installed_plugins.json`) | "Eight", 3G 축소 | 🔹 |
| 29 | low | doc-visual:204 ↔ :210 | "read them each time" ↔ "no need to look up" | 규칙 목록 삭제 | 🔹 |
| 30 | low | plugin-visual:516,:8 | 쓰지 않는 `echo $(date)` gotcha와 `Bash(echo *)` grant | 삭제 | 🔹 |
| 31 | low | doc-visual:118-120,326, diff-visual:384-386,495, context-health-visual:357-359,380, plugin-visual:448-450,465, fact-check:243-244, report-manager:119, scripts/write-artifact-sidecar.js (재검수 추가) | Artifact 툴 `favicon` 파라미터는 deprecated, `icon`으로 대체(툴 스키마) | `icon`으로 교체, sidecar 필드·`list-reports.test.js` 함께 | ✅ |
| 32 | med | scripts/artifact-gate.js:416 (S4 발견) | `checkGradientText`의 `gradient-text` 위반에 `severity` 없음 — issue 014 S2 AC 미충족 | `severity` 추가 | 🔹 |

README 충돌: "4 specialized agents"(실제 3개, 하나는 미호출 — #1·#8 적용 후 plugin-visual이 쓰는 건 2개), "Skips gracefully when claude-in-chrome unavailable"(render-report.js는 로컬 Chrome 바이너리 사용). 위치 README:17, :104.
유지: diff-visual:170-178(검증된 이름만 다이어그램에), :238-240(extraction law), channel-decision.md:82-97, mermaid-patterns.md:448-459·505-515, context-health-visual:496-507.


**P1 처리 (2026-09-24 5차, `/grill-with-docs`로 한 질문씩 결정)**
- #1 ✅ `5be2cec` — 루트 `agents/`로 이동, `vision-powers:trigger-collision-inspector`로 호출. `claude -p --plugin-dir ./plugins/vision-powers`로 로드 확인.
- #4 ✅ `5be2cec` — `config.js`·`list-reports.js`·`render-report.js`는 `--data-dir <경로>` 필수(없으면 exit 2), env·`~/.claude-code-zero` fallback 삭제. SKILL.md 호출부는 `--data-dir "${CLAUDE_PLUGIN_DATA}"`, report-manager의 `$CLAUDE_PLUGIN_DATA`는 `${…}`로, 틀린 gotcha 삭제. references 2곳(channel-decision·visual-self-audit)은 짧은 이름 + `<plugin data dir>`. 호출부 없던 `log-report.js` 삭제. Bash의 `CLAUDE_PLUGIN_DATA`가 codex 폴더였던 원인: openai-codex 1.0.6 `scripts/session-lifecycle-hook.mjs`가 SessionStart에서 `CLAUDE_ENV_FILE`에 자기 경로를 export — codex가 없어도 Bash엔 원래 없으므로 우리 버그는 그대로. codex 폴더에 쌓였던 `audit-*.png` 6장 삭제.
- #32 ✅ `5be2cec` — `severity: 'error'` + 테스트 조건. 테스트 3파일 73개 통과.
- 추가 발견 ✅ `143aa9c`(4.9.2) — `reports_dir` 설정은 list-reports만 따르고 생성 스킬은 무시 → 키 삭제("스킬 7곳이 설정을 읽게"안은 기각: 문서 안내·사용자 없음).

## 2-2. skill-creator-pro

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | skill-creator-pro/SKILL.md:446 (+:245, :406 같은 CWD 의존) | `python ${CLAUDE_SKILL_DIR}/scripts/package_skill.py` — :17 `from scripts.quick_validate import`라 `ModuleNotFoundError`(공식은 `python -m`). 실행 재현됨. `-m`으로 가도 PyYAML 필요(quick_validate.py:9) | ✅ `59eb822`(2.0.7) — "from `${CLAUDE_SKILL_DIR}`: `python -m scripts.package_skill <absolute/path>`"(cwd가 바뀌므로 절대 경로). PyYAML 있는 venv에서 패키징 성공 확인. PyYAML 없는 머신은 **그대로 둠**(2026-09-24 결정: 에러가 드러나 `pip install`로 대응 가능, 이 절은 `present_files` 있는 Claude.ai·Cowork 전용, 공식도 동일) | ✅ |
| 2 | high | auto-optimize/SKILL.md:70-71,337,340 | 작업 디렉터리를 스킬 옆 `autoresearch-*/`에 — 플러그인 스킬이면 배포본에 섞임, skill-creator-pro:181과 규칙 불일치 | `${CLAUDE_PLUGIN_DATA}/autoresearch-<name>/` | 🔹 |
| 3 | high | auto-optimize:3 ↔ skill-creator-pro:3 | 트리거 4개 겹침 — "improve my skill"이 무인 제자리 수정 루프로 갈 수 있음 | auto-optimize는 "hands-off 요청 시에만", skill-creator-pro의 공식에 없는 "Also trigger on…" 삭제(472→~340자) | 🔹 |
| 4 | high | auto-optimize:68 ↔ :109,:219 | 기준선 3-5회 vs 실험 N회 — max_score 비교 불가 | 기준선도 실험과 같은 횟수 | 🔹 |
| 5 | med | skill-creator-pro:259,:300-304 | `kill $VIEWER_PID` — 셸 변수가 호출 간 유지 안 됨, 포트 충돌은 스크립트가 이미 처리 | PID를 echo 후 리터럴로 kill, 이유절 삭제 | 🔹 |
| 6 | med | auto-optimize:121,128-130 | 대시보드가 file://에서 `results.json` fetch — 브라우저가 차단(실측: headless Chrome `TypeError: Failed to fetch`) | 결과 인라인 + meta refresh, 명세는 references로 | 🔹 |
| 7 | med | auto-optimize:72,:219 | 실행 주체 미명시 — eval을 아는 세션이 직접 돌리면 오염 | 매 실행 fresh subagent | 🔹 |
| 8 | med | skill-creator-pro:96 | `${CLAUDE_PLUGIN_DATA}` 지시 — 사용자 스킬 대부분은 personal/project라 치환 안 됨 | 플러그인/개인 스킬 분기 | 🔹 |
| 9 | med | skill-creator-pro:436,:438 | Claude Code 기준 누락 — 예약 `synced`(skills.md:130), 이름 충돌 우선순위(skills.md:161-170, 플러그인 스킬은 네임스페이스). `claude`·`anthropic` 예약은 API·claude.ai 스킬엔 유효 | `synced`·우선순위 추가. `claude`/`anthropic` 규칙 유지 여부는 §1-5 #9 | 🔹 |
| 10 | med | auto-optimize:351-363,:267,:335-347 | 예시·반복 문단·Output Files 중복 | 삭제, changelog 템플릿은 references로 | 🔹 |
| 11 | med | skill-creator-pro/SKILL.md(520줄) | 자기 규칙(:108)과 공식 500줄 초과 | pro 추가분부터 삭제, Claude.ai 절 삭제는 ADR 0001과 부딪혀 결정 필요 | 🔹 |
| 12 | low | auto-optimize:261 | "NEVER STOP" ↔ :215 "ALL CAPS 금지" | 이유 붙인 기준 문장으로 | 🔹 |
| 13 | low | auto-optimize:58-59,:380 | 레포 전용 경로 참조, "step 2" 오기 | 삭제, "Step 3". (:59는 S3에서 삭제됨, 2.0.6) | 🔹 |
| 14 | low | README.md:23 | 없는 기능 "confidence scoring" | 삭제 | 🔹 |
| 15 | med | skill-creator-pro(eval 절) | 공식은 플러그인에 실린 스킬의 동작 검증에 `claude plugin eval`을 권함(skills.md:831, v2.1.269+). skill-creator의 `evals/evals.json`과 형식 비호환(plugin-evals.md:15). 스킬은 이를 모름 | 플러그인 스킬이면 `claude plugin eval`로 안내하는 분기 추가(#7 결정). 500줄 초과(#11)와 함께 줄 수 관리 | ✅ |

기타: agents 3개·schemas.md·scripts는 공식과 동일(ADR 0001 준수). 기록 안 된 fork 2개 — `eval-viewer/generate_review.py:279-291` `</script>` 이스케이프, `eval-viewer/viewer.html`의 sandboxed iframe(.html 출력 실시간 렌더). 공식 `LICENSE.txt`(Apache-2.0) 누락. → ADR/README에 fork 기록, LICENSE 추가.

## 2-3. codex-advisor

issue 016(codex-advisor 5.0.0, `05b74a7`)이 리뷰 스킬 5개(review·adversarial·rescue·verify·research)를 다시 썼다. 이 절의 줄 번호는 `23c69ec` 기준이다. (재검수 삭제: 머리말의 `codex-review:73` spark 건 — `4e80b17`에서 해소.)

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | codex-verify:100→283,304,319, research:95→263,284,299, rescue:231→296,310, transfer:40→72 | `$CODEX_COMPANION`을 앞 Bash 호출에서 설정하고 뒤 호출에서 사용 — 셸 변수 비유지, verify/research는 Phase 1.5 질문이 끼어 반드시 다른 호출. rescue:285-286은 스스로 "shell variables do not survive across calls"라 적어 놓고 어김 | 매 블록 첫 줄에서 재해석(또는 #7 스크립트로 흡수) | 🔹 |
| 2 | high | codex-status:19-21, result:19-21, cancel:28 | `status $ARGUMENTS` 따옴표 없이 전달 ↔ companion-usage.md:321 whitelist 규칙 | Phase 1 whitelist + 값별 따옴표 | ✅ |
| 3 | med | codex-cancel:14-19,:37, status:55, result:56 | companion 실제 동작과 다른 설명(id 없으면 활성 job 1개일 때만 취소 — companion 1.0.6 `job-control.mjs:281-305`, `--all`은 상한만 해제) | 실제 동작으로 교체 | 🔹 |
| 4 | med | companion-usage.md:352,:367 | 알 수 없는 플래그 "FATAL" ↔ 각 SKILL.md는 AskUserQuestion | AskUserQuestion으로 통일 | 🔹 |
| 5 | med | rescue:53,226,265,458-459, review:31,43,273, adversarial:30,41,184, verify:282,434, research:262,421 | companion `:NNN` 줄 인용 — 핀과 안 맞는 옛 번호, companion-usage.md와 값이 둘(rescue:226 `:758-790` ↔ companion-usage `:762-823`) | SKILL.md 인용 삭제, companion-usage.md §3 포인터 | 🔹 |
| 6 | med | review:80, rescue:75, verify:173, research:162, adversarial:102 | "Advisory stderr warnings (slug not in cache)" — spec 012에서 삭제된 기능. 스크립트 stderr는 usage와 config 읽기 오류뿐 | 절 삭제 | 🔹 |
| 7 | med | rescue:266-311, verify:283-320, research:263-300, companion-usage.md | 실행·jobId 파싱·대기 루프 복사 + 관련 gotcha 반복. 016의 prepare-verifier.py는 Phase 4만 다룸 | `scripts/codex-task.sh launch/wait`로 이동 | 🔹 |
| 8 | med | rescue:305,321, verify:314, research:294, companion-usage.md:301 | `/codex:status` 안내 — Official 플러그인 비활성 권장과 충돌, 플러그인명 지목 | `/codex-status` | 🔹 |
| 9 | med | companion-usage.md:309 | "enable the Official plugin" ↔ ADR 0006 자체 hook | 자체 hook 기준으로 | 🔹 |
| 10 | med | codex-transfer:3 | description 361자, 모델이 스스로 호출할 흐름 아님 | `disable-model-invocation: true` + 짧은 description | ✅(길이) |
| 11 | med | review:43-44, adversarial:41-42, rescue:457, setup:126 | `--model`/`--effort` 근거 4곳 + companion-usage 중복 | SKILL.md엔 한 줄 포인터 | 🔹 |
| 12 | low | companion-usage.md:302 | effort 값 검증 — companion에 전달 안 됨, 용어집 "Do not reintroduce"와 충돌 | 행 삭제 | 🔹 |
| 13 | low | codex-result:3, cancel:3 | 동의어 나열 | 한 문장 | 🔹 |
| 14 | low | adversarial:11-12,:354 | "invents more than plain review does" 근거 없이 2회(`bcd42f9` 재작성 후) | 삭제 | 🔹 |
| 15 | low | companion-usage.md:14,:155,:296 | "1.0.0+" ↔ README "v1.0.4+", "still present in 1.0.5" 확인 스탬프 | :14 삭제, 스탬프 삭제(:9 핀은 유지) | 🔹 |
| 16 | low | review:272 | 없는 "the plan" 참조 | 삭제 | 🔹 |
| 17 | med | scripts/apply-codex-config.py (S4 발견) | ~~최상위 키가 없으면 파일 끝(마지막 `[table]` 안)에 붙음, 테이블 안 같은 키를 잡음~~ ✅ `dae4f7f`(5.0.3). 7차에 Codex 공식 문서(config-basic·config-reference·config-advanced·config-sample·environment-variables)로 케이스 전수 분석 → 추가로 고침: 작은따옴표 값·따옴표 키 미인식 → 키 중복 → config 파손, `CODEX_HOME` 무시, 여러 줄 문자열 속 `[x]`, 인라인 주석 유실. tomllib(3.11+)로 결과 검증 후 쓰기. 공식 샘플 config에서 옛 스크립트는 effort를 `[windows]`에 넣었음 ✅. 7차 검수 후 `85f10d5`(5.0.4): tomllib가 못 읽는 TOML 1.1 config(Codex 0.156.1은 받음 ✅)에 거짓 거부 → 원본이 읽힐 때만 검증 + 요청 키 외 불변 확인. 호출 스킬 5개에 "실패 시 중단" 명시·낡은 "stderr advisories" 문구 삭제 — 단 e2e(codex-verify, 1회)에선 옛 스킬도 스스로 멈춤 → 버그 재현 안 됨, 명확화 수준. 상위 계층 → `a3cfba4`(5.1.0): 프로젝트 `.codex/config.toml`이 전역을 이김, 스레드 `model`·턴 `effort` 값은 프로젝트를 이김 — app-server 실측 ✅. 스크립트가 cwd→프로젝트 루트(`project_root_markers`, 기본 `.git`)의 프로젝트 config를 찾아 요청 키를 덮으면 `Run flags:`(task: model·effort, review·adversarial: model) 또는 `Note:`(review effort) 출력, 스킬은 그 플래그를 companion 명령에 붙임. companion `task --effort`는 none~xhigh만 받음(max·ultra 거부) → 덮는 경우에만 플래그 전달해 기본 경로 불변. e2e(codex-verify, 새/5.0.4 각 1회): 새 스킬만 `--effort` 전달 ✅. `--profile`·`-c`는 사용자가 직접 치는 것이라 대상 아님 | (완료) | ✅ 테스트 10개 + 공식 샘플·실제 config 사본 |

기타: `codex-setup:32-40` 인증 확인은 companion `setup --json`의 `authStatus`로 대체 가능. rescue:461 "Exploring biases the double-check"는 Verifier 도입 후 낡은 이유 문장(:23-26은 `bcd42f9`에서 교정됨).

## 2-4. rubber-duck-tutor

ADR 0003·0008은 재논의하지 않음.

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | hooks/post-push.sh:66, post-pr.sh:66, engine.md:289 | `resolve-gap.sh "<the exact gap text recent-gaps.sh printed>"` — 출력이 `날짜<TAB>gap`이라 그대로 넘기면 no-op → ship-point gap이 영원히 해소 안 됨 | "gap text with the leading date and tab removed" | ✅(문구) 🔹(실행 재현) |
| 2 | high | duck/SKILL.md:29-30 | 3번(`git diff --stat` 미커밋)이 4번(세션 편집 미커밋)을 먼저 잡아 `/duck-verify`로 거의 라우팅 안 됨(새 untracked 파일만 있는 세션만 4번 도달) | §1-5 #8 결정 — (a) 4번 재정의 (b) 3·4번 교환. 중복 Mode Map 표 삭제는 공통 | 🔹 |
| 3 | high | ducking/references/exercise-patterns.md:48 ↔ :176, engine.md:347 | "막히면 코드 보여줘라" ↔ "어느 단계에서도 코드 금지" | :48 삭제, 1-3줄 문법만 허용 | 🔹 |
| 4 | high | engine.md:173 ↔ :188,:198 | 증명 안 된 hunch를 log-gap에 기록 → 다음에 틀린 gap으로 출제 | hunch는 별도 줄, log-gap 금지 | 🔹 |
| 5 | high | engine.md:103,105 | 모델 재량 제안 지시 ↔ ADR 0003, "regardless" ↔ `enabled:false` 즉시 중단 | 재량 부분 삭제, config 체크 우선 | 🔹 |
| 6 | high | references/orientation-guide.md:3,72, log-gap.sh:7, exercise-patterns.md:3 | 유저 레포에 `/duck orient refresh` 문구 기록 — 이 명령은 동작 안 함. "main SKILL.md" 문구는 orientation-guide 아닌 exercise-patterns.md:3 등 | `/duck-orient refresh`, "main SKILL.md" → `engine.md` | 🔹 |
| 7 | high | plugin CONTEXT.md ↔ docs/context/rubber-duck-tutor.md | 용어집 이중·정의 충돌 (1부 설계 기록 표와 동일 건) | 1부에서 처리 | ✅ |
| 8 | med | engine.md:133,:163 | quick check "~30초" ↔ 필수 Confidence·Uncertainty 체크 | quick은 둘 다 생략 | 🔹 |
| 9 | med | engine.md:337 ↔ :38,:64-69, duck-orient:19 | 한 메시지 질문 2개, "before anything else" 두 곳(engine·duck-orient:19) | :337 삭제, 순서 한 줄 명시 | 🔹 |
| 10 | med | engine.md:216-333 | ship-point 3절 118줄(engine의 31%) — 어떤 모드도 실행 안 함, hook은 engine 안 읽음. 슬라이스 이력(:259, :279) 섞임 | 이력 제거 후 `references/ship-point.md`로. #12와 함께(포인터가 끊기지 않게) | 🔹 |
| 11 | med | engine.md:227-233 ↔ post-push/post-pr:66 | "keep in sync" 사본 drift — hook엔 injection·N+1·hook contract 누락, tie-break는 hook에만 | `lib.sh` 함수 하나를 SSOT로, sync 주석은 grep 테스트로 | 🔹 |
| 12 | med | post-push.sh:62, post-pr.sh:62 | 경로 없는 "see the plugin engine doc" 포인터 — ship 시점에 engine 읽기 유도(ADR 0003 근거와 충돌) | 괄호 정의 인라인, 포인터 삭제 | 🔹 |
| 13 | med | engine.md:210-211 | `lib.sh duck__check_rate_limit`(lib.sh:67)가 이미 강제하는 세션 한도 | :210-211만 삭제. :209(사용자 거절)·:214는 다른 곳에서 강제 안 되므로 유지 | 🔹 |
| 14 | med | engine.md:340-361 | "wrong is wrong" 3회, 질문 1개 규칙 반복, exercise-patterns 복사 | 포인터 1줄. 단 :359("no general-knowledge questions")는 다른 곳에 없어 유지 | 🔹 |
| 15 | med | engine.md:41 ↔ :90, verify:40 | "Never solve, never hint" ↔ 스스로 교정·설명 지시 | "답을 내놓은 뒤에만 한 문장으로 정답" | 🔹 |
| 16 | med | duck-prebuild:102 | "Continue until all decisions are covered" — intensity 예산과 충돌 | 예산 소진까지 위험 순 | 🔹 |
| 17 | med | duck/SKILL.md:36,:46,:50 | auto-detect 후 인라인 실행 vs 명령 안내 미정, 없는 "fallback" 섹션 | 한 규칙으로 | 🔹 |
| 18 | low | 6개 스킬 description | 전부 `disable-model-invocation`이라 모델 트리거 문구 무의미(coach 504자) | 120자 이하 메뉴 라벨 | ✅ |
| 19 | low | engine.md:221,:239, hooks:66 | 외부 스킬(`code-review`) 이름 지목 | "out of scope for duck" | 🔹 |
| 20 | low | README.md:45-47 | engine 동작과 다른 설명 3줄 | 실제 동작으로 | 🔹 |
| 21 | high | ducking/scripts/ 7개(`log-gap`·`recent-gaps`·`resolve-gap`·`log-telemetry`·`ignore-streak`·`telemetry-summary`·`read-config`) + hooks/lib.sh (2026-09-24 발견) | 데이터 경로를 `${CLAUDE_PLUGIN_DATA:-~/.claude/data/rubber-duck-tutor}`로 env에서 읽음(2부 공통 "Bash 환경변수"). hook이 부르면 플러그인 폴더, 모델이 Bash로 부르면 폴백 폴더(또는 남의 플러그인 폴더)로 갈라짐. 예: `outcome` 기록(Bash) ↔ `ignore-streak`(hook)이 다른 파일을 읽어 streak이 늘 0 → scoreboard 모드가 안 켜짐(추측: 실행 재현 전, 코드 판독) | 경로를 인자로(P1 결정 패턴). 호출부: hook은 `${CLAUDE_PLUGIN_DATA}` 전달, SKILL.md·hook 주입문은 `${CLAUDE_PLUGIN_DATA}` 치환 | ✅(코드) |

유지: engine.md:93-99(Skeptical Grading), coach:57(연습 통과로만 gap 해소), exercise-patterns.md:163,:180, duck-verify:12-16.

## 2-5. claw-mux

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | claw-mux/SKILL.md:102,118,173-179, terminal-io.md, sync-and-automation.md:45, cmux-browser:97-110, cmux-markdown:95-96 | `$SKILL_DIR` 25곳 — 공식 치환 변수는 `${CLAUDE_SKILL_DIR}`, 셸 env도 비어 `/scripts/…` 실행 실패 | SKILL.md 본문은 `${CLAUDE_SKILL_DIR}`로 교체. references(terminal-io.md 5곳, sync-and-automation.md:45)는 치환 안 될 수 있으므로(2부 공통 "reference 파일 치환") SKILL.md에 스크립트 경로를 한 번 제시하고 references는 상대 경로로 | ✅ **완료**(2026-09-24, `ca54ade`, 1.2.1). 링크 표 19곳은 상대 경로(`references/…`, `templates/…`, 공식 예시와 같은 형식), SKILL.md 스크립트 호출 2곳은 `${CLAUDE_SKILL_DIR}`, references 5곳은 `poll-screen.sh`로 줄이고 SKILL.md가 전체 경로를 한 번 제시 |
| 2 | med | terminal-io.md:146, SKILL.md:107-108 | Claude Code 완료 감지를 `╭─`/`❯`로 — 작업 중에도 렌더돼 오판 (추측 — poll-screen.sh:26-27이 스크롤백 어디든 `❯`를 매칭. 라이브 pane 확인 필요, §1-5 #11) | `cmux wait-for -S task-done` 방식 | 🔹 |
| 3 | med | notifications.md:82-91 | Stop hook `stop_reason` 분기 — 공식 입력에 없음, 유저 settings 편집은 범위 밖 | 절 삭제 또는 `last_assistant_message` | 🔹 |
| 4 | med | SKILL.md:62-69,71-125,127-144,13-21 | wait-for 줄 3회, 사이드바 명령 3회, 환경 체크 3회 | 전략 표 + 1줄, ~100줄로 | 🔹 |
| 5 | med | SKILL.md:75,:162, terminal-io.md:150,:193 | "foreground sleep over 2 seconds 차단" 미확인 수치 3곳 + 서로 충돌 | "run_in_background 또는 Monitor" 한 곳 | 🔹 |
| 6 | med | cmux-markdown:117 ↔ :44,:120 | atomic replace 지원 ↔ 재생성 시 재연결 안 됨(:44에 이미 시간 기준 규칙) | 시간 기준 한 줄, 스킬 ~20줄로 축소 | 🔹 |
| 7 | med | cmux-browser:20-30,61-71,83-89,112-121 | 같은 워크플로 3회, Limits 중복 | Core Workflow 하나만 | 🔹 |
| 9 | low | SKILL.md:3, README.md:37 | claw-mux description에 트리거 없음(cmux-browser:3엔 이미 "Use when…"), README가 disable-model-invocation과 충돌 | 트리거 문장, `/cmux-markdown` 안내 | 🔹 |

재검수 삭제: #8 `--workspace`/`--window` — `cmux markdown --help`·`cmux browser --help`(0.64.25)에 있음, 최상위 `cmux help` 요약에만 없었다. 기타(설치 캐시 1.2.0 description 불일치) — 현재 캐시가 레포와 같음.

## 2-6. notebooklm-connector

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | agents/chrome-mcp-query.md:16-18 | `permissionMode: bypassPermissions` — 플러그인 에이전트에선 무시(plugins-reference.md:73), 작성자는 켜진 줄 앎 | 삭제, README에 allow 규칙 안내 | ✅ |
| 2 | high | notebooklm-manager/SKILL.md:18, references/gotchas.md:31 | "Chrome MCP tools aren't in allowed tool set — calling will error" — 공식: allowed-tools는 제한 아님 | 이유를 "에이전트가 탭·폴링·에러를 소유"로 교체, 중복 삭제 | 🔹 |
| 3 | high | hooks/ensure-skill-loaded.sh:5,10 | regex `노트북`(=laptop)·`notebook.*list` 등 과매칭 + "MUST invoke" — **이번 세션에서 NotebookLM과 무관한 프롬프트에 실제 발동 관측**. 2026-09-23 재검수 세션에서도 재현(서브에이전트 보고 메시지에 발동) | ~~`notebooklm` 중심으로 좁히고 조건부 문구~~ **hook 삭제**(2026-09-24, `d9b5177`, 1.3.2). 스킬 description이 같은 트리거(URL·NotebookLM 언급)를 이미 말함. 원 목적(`982f6a1` "후속 메시지에서 스킬 재호출")은 키워드 없는 후속 메시지엔 어차피 안 걸림. 재호출의 실익(`allowed-tools` 승인이 다음 메시지에 풀림, skills.md:528)은 #1의 README allow 규칙 안내로 | ✅ |
| 4 | med | hooks/hooks.json:27, SKILL.md:18,72,116 | matcher `Task` — 도구명은 `Agent`로 바뀜. `Task` alias는 settings·에이전트 정의에만 명시(sub-agents.md:481), hook matcher는 `tool_name` 정확 매칭(hooks.md:287-291) (추측) | `"Agent\|Task"`, 본문 `Agent`로 — 어느 쪽이든 안전 | 🔹 |
| 5 | med | follow-up-reminder.sh:21 ↔ SKILL.md:114 | hook이 config를 읽지 않음. 다만 "per Section 5" 문구가 :114 skip을 포함해 "매번 강제"는 과장 | "unless auto_coverage is false" | 🔹 |
| 6 | med | agents/chrome-mcp-query.md:216,231-233,311, SKILL.md:97 | textarea maxLength 분기 — gotchas:17 "no maxLength" → 절대 실행 안 됨 | 분기·출력 줄 삭제, SKILL.md:97 함께 | 🔹 |
| 7 | med | SKILL.md:166-193,197-200 | hook 내부 마이그레이션 설명 28줄, 모델 할 일 없음 | 한 줄 | 🔹 |
| 8 | med | SKILL.md:101-108 ↔ agents:76-83 | 복구 6단계 동일 복제 | 에이전트 출력 SSOT | 🔹 |
| 10 | low | plugin.json ↔ marketplace.json | description 문구 다름 | 동기화 | 🔹 |
| 11 | low | hooks/setup-data.sh:70 | PreToolUse `{"decision":"approve"}` deprecated(hooks.md:1848) | 현 형식으로 | 🔹 |

재검수 삭제: #9 — agent:373은 추가 *javascript_tool* 호출만 금지. :367(tabs_context 재시도)·:369(스크린샷 폴백)와 충돌 없음.

## 2-7. claw-mo · toolbox · vibeproxy-kit · worktree-plus · e2e-test-runner

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | worktree-plus/skills/worktree-setup/SKILL.md:94 | "migration re-trigger by restarting" — `setup-check.sh:40-41` fast path가 migration 블록보다 먼저 exit | `git config --global` 수동 명령 안내, v3.0.0 migration 절 축소 검토 | ✅ **완료**(2026-09-24, `ebbdffa`, 3.1.1). 94줄만 교체 — `git config --global` 수동 안내 + 재시작이 안 되는 이유 + prefix `-` 규칙. 검수 eval(새 11/11, 옛 7/12)에서 빈 prefix에도 `-`를 붙이라는 문구 결함 발견 → 비어 있지 않을 때만 `-`, 빈 값은 `""`로 수정(3.1.2). 영향은 드문 경로(플래그 없는데 env var 남음). 마이그레이션 절 축소는 안 함 |
| 2 | high | worktree-plus/.../SKILL.md:75 | "`dirBase`: no tilde expansion (stays literal)" — 실제 `worktree-create.sh:43-45`가 `exit 1` | "`~` values are rejected — write an absolute path" | ✅ **완료**(2026-09-24, `ebbdffa`, 3.1.1). README:110은 이미 "use an absolute path"라 그대로 |
| 3 | high | e2e-test-runner/skills/e2e-test/SKILL.md:39 | `--resultsPath ./e2e-results` 고정 → 기본값 `./e2e-results/${Date.now()}`(args.ts:22) 무력화, 매 실행 덮어씀, Quick Start `--baseline` 경로가 존재 불가 | 플래그 삭제, 출력된 경로 읽기. SKILL 5-6단계도 함께 | 🔹 |
| 4 | high | claw-mo/skills/claw-mo-open/SKILL.md:73-78 | 런타임은 파일만 watch하는데 config엔 `*.md` 저장 → 다음 `/claw-mo-up`이 drift로 `--clear`(shared.md:98,134-135 패턴 비교). dir 모드도 `dir/*.md`로 drift (코드 읽기로 확인) | 저장값을 실제 시작 형태와 일치 | 🔹 |
| 5 | high | vibeproxy-kit/skills/setup-aliases/SKILL.md:232 ↔ :291 ↔ :303 | merged-config 재생성 시점 "launch만" vs "launch or toggle" | 사실 하나로 확정, Phase 9 한 곳에 | 🔹 |
| 6 | med | e2e-test-runner/hooks/hooks.json:9,14 | `timeout: 120000`·`5000` — 단위가 초(hooks.md:430) → 약 33시간 | `180`/`5` | ✅ |
| 7 | med | e2e-test-runner SKILL.md:29-36,67-68 + hooks | 의존성 체크 3곳 | SKILL은 fallback 1줄 | 🔹 |
| 8 | med | toolbox/skills/secret-setup/SKILL.md:218 | 검증 단계 `cat "$MOCK_ENV"` — 실값이 컨텍스트에 찍힘 | `cut -d= -f1`(이름만) + `bash -n` | 🔹 |
| 9 | med | vibeproxy-kit setup-aliases (여러 줄) | 같은 규칙 2-5회 + references 반복 | SSOT 지정, Gotchas 대부분 삭제 | 🔹 |
| 10 | med | vibeproxy-kit setup-aliases:62-75,101-135,307-317 | 317줄, 조건부 onboarding·Scripts 표 | `references/onboarding.md`, 표 삭제 | 🔹 |
| 11 | med | claw-mo/references/shared.md:3 ↔ 스킬들 | "do not duplicate" 선언과 달리 스킬마다 복제 | 스킬 Gotchas 복제분 삭제, autosync는 references로 | 🔹 |
| 12 | med | toolbox/skills/handoff/SKILL.md:105-116 | 검증 규칙 3회, Gotchas가 Principles 재진술 | Gotchas 절 삭제 | 🔹 |
| 13 | med | toolbox/skills/secret-setup:177-208,234-244 | MCP 분기·중복 gotcha | references로, 중복 삭제 | 🔹 |
| 14 | low | claw-mo-open:56-60 ↔ manage:98, shared.md:159,171 | curl API vs "mo CLI 우선" | `mo -w`로 | 🔹 |
| 15 | low | claw-mo-up:3 ↔ claw-mo-open:3 | 트리거 겹침 | 분리 | 🔹 |
| 16 | low | vibeproxy-kit setup-aliases:239 ↔ :153 | "Do not skip" ↔ Remove 경로 | 예외 명시 | 🔹 |
| 17 | low | vibeproxy-kit references/effort-levels.md:9-31, model-selection.md:86 | 모델 표 노후 가능 (추측), 설치본에 없는 research §9.2 인용 | 확인일 명시, 인용 삭제 | 🔹 |
| 18 | low | worktree-setup:117,:193 | compound 명령 권한 설명 틀림, 중복 | 삭제 | 🔹 |
| 19 | low | secret-setup:237 | "`CLAUDE_ENV_FILE` only in SessionStart" — Setup·CwdChanged·FileChanged도 가능 | 수정 | 🔹 |
| 20 | low | toolbox handoff:82 | 다른 플러그인 스킬명(`/tdd`, `/diagnose`) 지목 | 일반 문구 | 🔹 |
| 21 | low | vibeproxy-kit·notebooklm README | 모드 수·동작 불일치 | 수정 | 🔹 |
| 22 | low | toolbox fetch-sitemap:87-93,107-112 | curl 플래그 설명·예시 중복 | 삭제 | 🔹 |
| 23 | low | vibeproxy-kit plugin.json(151자) ↔ marketplace(198자) | description 불일치 | 동기화 | 🔹 |
| 24 | med | vibeproxy-kit/skills/setup-aliases/scripts/write_user_config.py:62, references/write-guide.md:53-58 (재검수 추가), scripts/discover.sh:16(new-vibe handoff Issue 7 — 실제로 codex 폴더를 읽은 기록) | 백업·상태 경로 기본값을 `os.environ["CLAUDE_PLUGIN_DATA"]`에서 읽음 — Bash 환경엔 없거나 남의 값(2부 공통 "Bash 환경변수"). write-guide.md가 `"backup_dir": "${CLAUDE_PLUGIN_DATA}/backups"`를 넘기지만 references 파일이라 치환 안 될 수 있음 → 백업이 다른 플러그인 폴더로 | 백업 경로를 SKILL.md(치환됨)에서 명시적으로 넘기고, 스크립트는 env 폴백 삭제 | ✅(env) (추측)(치환) |
| 25 | high | worktree-plus/hooks/scripts/worktree-create.sh:47,56 | 절대 경로 `dirBase`는 `<dirBase>/<name>`이라 레포 구분이 없다. 두 레포가 같은 worktree 이름을 쓰면 뒤 레포가 앞 레포의 worktree를 "Reusing existing worktree"로 받아, 다른 레포에서 작업하게 된다. worktree-setup 스킬은 전역 절대 경로 설정을 돕기까지 한다 | (미정) 재사용 전에 그 worktree가 같은 레포 것인지 확인(`git rev-parse --git-common-dir` 비교), 또는 절대 경로 아래 레포별 하위 폴더 | ✅ 8차 격리 실행으로 재현(레포 A·B, name=fix → B가 A의 worktree를 받음) |
| 26 | low | worktree-plus/skills/worktree-setup/SKILL.md:94 | "exits before it whenever its hooks are already registered" — 정확히는 현재 plugin root로 등록됐을 때. 플러그인 업데이트 뒤 첫 세션엔 마이그레이션이 돈다. "재시작으로는 안 된다"는 결론은 맞음 | "registered for the installed version" | ✅ 8차 격리 실행 |
| 27 | low | worktree-plus/skills/worktree-setup/SKILL.md Value validation | 빈 `branchPrefix`가 "접두사 없음"이라는 설명이 없다 — 코드는 `=""` → `<name>`(`worktree-create.sh` 주석). 8차 eval에서 두 실행이 모두 "확인 못 함"으로 적음 | Value validation에 한 줄 | ✅ |

유지: worktree-setup:172-173(개행 없는 append 병합, include·link 중복 시 link 무음 skip), notebooklm references/gotchas.md:7-11(form_input 무음 실패), vibeproxy-kit setup-aliases:304(name/alias 반전 시 merge no-op), claw-mo shared.md:75-83·117(`--clear` 입력 대기 hang, 경로 정규화 비교).
