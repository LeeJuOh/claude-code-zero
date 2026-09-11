# 에이전트 문서 검수 — 레포 문서 + 플러그인 (2026-09-11)

> 상태: **검수 완료 · 수정 전** · 수정 순서: 1부(레포 문서) 먼저, 2부(플러그인)는 그 뒤
> 줄 번호 기준: 커밋 `21a87ab` — 수정 전에 해당 줄을 다시 열어 확인할 것
> 확인 표기: ✅ 직접 재확인(공식 문서 grep·git·실행) · 🔹 검수 에이전트가 grep/실행으로 확인 · (추측) 미확인
> 계기: auto memory를 껐다(`~/.claude/settings.json` `autoMemoryEnabled: false`). 메모리 파일은 남지만 로드되지 않으므로, 살릴 내용은 매 세션 읽히는 레포 문서로 옮기고 그 김에 레포 문서의 틀림·중복·퇴적을 정리한다.

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

---

# 1부 — 레포 문서

## 1-1. 틀림·충돌 (고칠 것)

### AGENTS.md · CLAUDE.md · settings

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| AGENTS.md:94-99 | 로컬 테스트 전 마켓 버전 disable 지시. 공식 `plugins.md:299`: `--plugin-dir` 로컬 복사본이 그 세션에서 우선 | "A `--plugin-dir` copy overrides a same-named marketplace install for that session." 한 줄로 교체 | ✅ |
| AGENTS.md:86 | `unset CLAUDECODE` 우회 불필요 — `CLAUDECODE=1`에서 `claude plugin validate .` 통과 | "Run `claude plugin validate .`"로 교체, `.claude/settings.json`의 `Bash(unset CLAUDECODE*)` allow 삭제 | ✅ |
| AGENTS.md:86 · :140 | validate가 로컬 플러그인마다 `No version specified` 경고 — 따라서 plugin.json에 넣으면 조용히 우선(gotchas:19) | "Expected warning … ignore; adding it silently overrides marketplace.json." 한 줄 추가 | ✅ |
| AGENTS.md:11-12 | lab 목록 낡음 — `lab-harness-zero`는 `76a31f5`에서 제거, claw-mo·claw-mux는 `category: null` | 삭제(원본은 marketplace.json) | ✅ |
| AGENTS.md:139 · gotchas.md:23 | `lab-` 접두사 규칙 — 쓰는 플러그인 0개, e2e-test-runner는 `"category": "lab"`만 | gotchas 한 곳에 "Mark experimental plugins with `\"category\": \"lab\"`", AGENTS 문구 삭제 | ✅ |
| AGENTS.md:22 · :103 | `references/`를 gitignored라 함 — 실제는 git 추적 심링크 `references -> ../references` | "tracked symlink to shared `../references`. Read-only." | ✅ |
| AGENTS.md:74 · gotchas.md:29 | 플러그인 settings.json 지원 키 — 공식 `plugins-reference.md:926`: `agent`, `subagentStatusLine` | gotchas:29 수정, AGENTS:74 삭제 | ✅ |
| AGENTS.md:60 | "all plugin development work → `/skill-creator-pro`" — 그 스킬은 marketplace·validate·README를 안 다룸 | "Skill authoring and evals: `/skill-creator-pro`. Registration, README, validation: follow Workflow below." | 🔹 |
| AGENTS.md:82 | "Read **only** those files" ↔ :43-45 공식 문서 필수 fetch, CLAUDE.md "read gotchas before structural change" | "Start from the files the user names; widen only to gotchas.md and the official pages required above." | 🔹 |
| AGENTS.md:3 · :36 | GEMINI.md 없음. issues 001-010은 짝 spec 없음 | :3 둘째 문장 삭제, :36 "paired by number from 011" | 🔹 |
| CLAUDE.md:7 | 백틱 안 `` `@AGENTS.md` ``는 import 안 됨(memory.md) + 맵 목록이 AGENTS.md와 중복 | `@AGENTS.md` 한 줄만 남김 | ✅ |
| .claude/settings.local.json:12,18,19 | `git push`·`git merge`·`git tag` allow — AGENTS "No auto-push"가 산문으로만 존재(C9) | `git push`를 `permissions.ask`로 옮길지 결정(§1-5 #5) | ✅ |
| .claude/hooks/load-secrets.sh | settings 3곳(project·local·user) 어디에도 등록 안 됨 | 삭제 후보 | ✅ |

### docs/reference

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| skill-lessons-from-anthropic.md:191 | "Reference other skills **by name**" ↔ gotchas:13 플러그인 독립성. 공식에 `dependencies` 필드 존재(`plugins-reference.md:553`) | :191 삭제, gotchas:13에 "hard dependency → `plugin.json` `dependencies`" 추가 | ✅ |
| skill-lessons-from-anthropic.md:207-209 | `/skill-creator` 안내 ↔ 레포는 `/skill-creator-pro` | 삭제 또는 "In this repo use `/skill-creator-pro`." | 🔹 |
| skill-building-guide.md:35-61, :417 | "Required Fields", "Under 1024 characters", "under 5,000 words" — 공식: 전부 선택(`skills.md:315`), 1,536자(:324), 500줄(:460) | 공식 frontmatter 참조 한 줄로 교체, :417 "under 500 lines" | ✅ |
| skill-building-guide.md:3, :50 | 없는 파일 3개 참조(`skill-supporting-files.md`, `skill-allowed-tools.md`, `command-proxy-pattern.md`) | 문장 삭제, :50 → "see gotchas.md 'Skill allowed-tools'" | ✅ |
| skill-building-guide.md:198-219 | "Combat Model Laziness"·"CRITICAL:" ↔ skill-creator-pro SKILL.md:318 "ALWAYS/NEVER in all caps … yellow flag" | 삭제 | 🔹 |
| skill-building-guide.md:21, :332-369, :403-410 | Claude.ai 업로드·API 배포 — 이 레포와 무관, 공식 `skills.md:351-358`과도 어긋남 | 삭제 | 🔹 |
| gotchas.md:27 | 플러그인 에이전트 지원 필드 목록 불완전(`name`, `description`, `effort` 누락, `isolation`은 `"worktree"`만) — `plugins-reference.md:68` | 목록 빼고 "ignored: `permissionMode`, `hooks`, `mcpServers`"만 | ✅ |
| gotchas.md:33 | ~200단어, 절반이 vision-powers 전용 artifact-design 논증 | 2줄로 축약("`allowed-tools` only pre-approves; declare `Skill(<name>)` for skills you load"), carve-out은 `docs/context/vision-powers.md`로 | 🔹 |

### docs/INDEX.md · 기타

| 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|
| INDEX.md:9, :13 | "Required reading"·"spec" — 두 문서는 Claude.ai PDF·X 글 옮김, 공식과 충돌 다수 | "Optional background; official skills.md wins on conflict" | 🔹 |
| INDEX.md:17 | "see CLAUDE.md for the entry point" — 진입점은 AGENTS.md:41 | "see AGENTS.md § Official Claude Code Docs" | 🔹 |
| INDEX.md:24 | `plugin-marketplaces.md` 설명 — 실제는 홍보 채널 목록, 파일명도 공식 페이지명과 겹침 | `docs/promotion-channels.md`로 이름 변경 | ✅ |
| INDEX.md:30-34 | `adr/`, `context/` 미등록 | 디렉터리 행 추가 | ✅ |
| INDEX.md:36 | superpowers 폐지 이력 | 삭제 | 🔹 |
| INDEX.md:5 | handoff 수명 규칙 없음 → 퇴적 원인 | "Handoffs are temporary: once absorbed into specs/issues/ADRs/commits, delete them." 추가 | 🔹 |
| INDEX.md:45-62 | research·handoff 등록이 실제와 불일치 | §1-2 삭제 후 디렉터리 행으로 정리 | ✅ |
| release-workflow.md:20 | 레포 태그 번호 기준 없음(SemVer는 플러그인 버전용) | 기준 한 줄 추가 — 기준 자체는 사용자 결정 | 🔹 |
| `.claude/worktrees/remove-test-3` | 살아 있는 git worktree(브랜치 `worktree-remove-test-3`) — docs 사본이 레포 grep 오염 | `git worktree remove` 결정(§1-5 #4) | ✅ |

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
| issue 012 | ready-for-agent | 완료 `92c01ce`(codex-advisor 4.7.0) | "완료 · spark 유지는 spec 016 D4가 뒤집을 예정" | ✅ |
| issue 013 | ready-for-agent | S1~S3 완료 `761f101`(4.8.0), S4 미실행 | 상태 갱신 + AC 체크 | ✅ |
| issue 014 | "미푸시", :46 severity AC `[x]` | `c865a28`은 origin에 있음, `artifact-gate.js:416` gradient-text에 severity 없음 | :88·:153 "푸시됨", :46 `[ ]` | 🔹 |
| issue 016:55 | "미커밋" | `21a87ab`로 커밋 | 문구 수정 | 🔹 |
| spec 016:7, :225, :265, :301 | "ADR 후보", 핸드오프 "미커밋", 015 언급 | ADR 0012 존재(`3f5ec7b`), 015는 `4ec5c58`로 레포 밖 이동 | §핸드오프에 "종료됨" 배너 | 🔹 |

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
| context/codex-advisor.md:57-99, :170 | 미구현 spec 016 설계(Verifier, Hypothesis exclusion, Autonomy policy)를 현재 동작처럼 기술 — 실제 `agents/` 없음, `codex-verify` `--no-preview` 존재 | "## Planned — spec 016 (not implemented)" 절로 분리 | ✅ |
| context/codex-advisor.md:65-66 · issue 016:190 | "question ends the turn" — issue 016 Q10이 원인 설명을 반박 | "a question returns as a `completed` turn with the work undone" | 🔹 |
| context/codex-advisor.md:21-22 | "landing via issue 006" — 출시됨 `a35c1b0` | "(issue 006)" | 🔹 |
| issue 016:4 | "스펙과 이 문서가 다르면 스펙이 맞다" — 이슈 검수(Q6·Q17)가 스펙 D3 전제를 반박한 상태 | "§착수 전 결정의 열린 항목이 스펙 D절보다 우선" + 스펙 D3·D6에 미결 배너 | ✅ |
| spec 016:249, :212 | §그릴 가이드가 확정 D2·D3와 모순 | 제목에 "(그릴 전 원안 — 확정은 D1~D3)" | 🔹 |
| spec 016:158 | spec 012 D2 근거를 잘못 인용 | 012:84-90 실제 문장으로 | 🔹 |
| context/rubber-duck-tutor.md ↔ plugins/rubber-duck-tutor/CONTEXT.md | 용어집 2개, Confrontation·Gap·Engagement 정의 불일치. 루트 `CONTEXT-MAP.md`는 plugin 쪽 1개만 가리킴 | `docs/context/` 정본으로 병합, plugin CONTEXT.md 삭제, CONTEXT-MAP이 `docs/context/*.md` 4개를 가리키게 | ✅ |
| context/rubber-duck-tutor.md:67 | Engagement = "트랜스크립트 기반 신호" ↔ engine.md:243-250 "live conversation, not re-parse transcript" | 대화 기반 정의로 교체 | 🔹 |
| context/rubber-duck-tutor.md:106 | 삭제된 handoff 파일 링크(`3eb1340`) | issue 003 + ADR 0008 링크로 | ✅ |
| context/skill-creator-pro.md:37 | "Keep eval harness" ↔ 같은 파일 :14, ADR 0001 "restore to official" | "Restore eval harness to official" | 🔹 |
| context/vision-powers.md:11-15 | Mermaid CDN이 기본인 것처럼 기술 ↔ ADR 0009 기본은 inline SVG | "(Local channel only: …)" | 🔹 |
| context/vision-powers.md:176-188 ↔ issue 014:127-134 | 구현 때 좁힌 결정(flowchart·state만 검사, phantom 클래스)이 이슈에만 있음 | 용어집에 반영 | 🔹 |

## 1-2. 버릴 것 (퇴적)

| 파일 | 상태 근거 | 판정 |
|---|---|---|
| handoff/2026-05-05-claude-preset.md | 착수 안 함, 미확인 추정이 결정처럼 기재 | 삭제 또는 spec 이동(§1-5 #2) |
| handoff/2026-06-03-skill-creator-pro-v2-rebaseline.md | 완료 `29d2849`, 문서엔 "커밋 0개" ✅ | 삭제 |
| handoff/2026-06-06-doc-visual-artifact-redesign.md | 완료 `4252baf`, 잔여는 issue 001에 있음 | 삭제 |
| handoff/2026-06-14-vision-powers-audit.md | 완료 `9884796`·`b63f8a6` | `node --test <dir>` 교훈 흡수 후 삭제 |
| handoff/2026-06-20-vision-powers-visual-leverage.md | 완료 4.4.1, 버전·CHANGELOG 지시 틀림 | 삭제 |
| handoff/2026-06-27-vision-powers-review-fixes.md | 완료 `f38d79f`, 문서엔 "전부 미착수" | 삭제 |
| handoff/2026-06-27-vision-powers-structured-blocks.md | Phase 1 완료, 잔여 S3~S6은 issue 005 | 삭제 |
| handoff/plugin-diet.md | 완료, 표가 현재 코드와 불일치 | 삭제 |
| handoff/harness-zero/HANDOFF.md | 레포 떠남(`76a31f5`), 참조 문서 삭제됨 | 삭제 |
| handoff/new-vibe/HANDOFF.md | 대부분 반영 `544ca16`, 일부 결정 뒤집힘. Issue 7(`discover.sh:16` 경로 오염)은 미반영 ✅ | Issue 7 처리 결정 후 삭제(§1-5 #2) |
| handoff/vision-powers/environment-health-v2.15.md | 완료 `8c958fd`, 스킬 개명됨 | 삭제 |
| enhancement/2026-04-18-vision-powers-audit.md | 대상 파일·스킬 전부 없음 ✅ | 삭제 |
| enhancement/2026-04-23-rubber-duck-git-hook-latency.md | 해결 `d0d3ba1` | hook `if` 좁히기 교훈 흡수 후 삭제 |
| research/deeptutor-analysis.md | llm-wiki `summaries/deeptutor.md`가 더 새로움 ✅ | 삭제 |
| research/career-ops-analysis.md | llm-wiki `summaries/career-ops.md`와 중복 ✅ | 삭제 |
| research/ai-context-tools-comparison.md | 외부 도구 조사, 레포 무관 | llm-wiki 소관(§1-5 #3) |
| research/token-efficiency-tools-comparison.md | 외부 도구 조사, AGENTS.md에 없는 문구를 사실로 인용 | llm-wiki 소관(§1-5 #3) |
| research/2026-04-23-vibeproxy-codex-reasoning-aliases.md | vibeproxy-kit payload.override 설계 근거(`f8b0785`) | 유지 + 상단에 "§10 적용됨" + INDEX 등록 |

## 1-3. AGENTS.md 줄이기 (153줄)

| 섹션 | 판정 | 이유 |
|---|---|---|
| Repository Overview 플러그인 목록(:10-12) | 삭제 | marketplace.json이 원본, 이미 낡음 |
| Directory Structure(:14-23), Plugin Component Structure(:62-75) | 삭제, :77 한 줄만 유지 | `ls`로 보이는 트리, 공식 컴포넌트(`workflows/`, `output-styles/` 등) 누락으로 이미 낡음 |
| Knowledge Map 표(:27-37) | 유지 | 목차 역할 |
| Official Docs(:39-56) | :49 페이지 나열 삭제, :51 Codex 링크는 `context/codex-advisor.md`로, :53-56 대용량 파일 규칙은 **유지** | :53-56은 실제 사고 기반 gotcha |
| Plugin Development Workflow(:58-99) | §1-1 수정 반영 | |
| references/ 섹션(:101-105) | 한 줄로 | |
| Git Workflow(:107-125) | pre-flight(:123) 삭제, release-workflow.md 포인터만 | 중복 |
| Plugin Data Paths(:127-134) | 삭제, "Before editing plugin structure, versions, or data paths: read gotchas.md" 한 줄 | gotchas:9·19·39와 중복 |
| Coding Style(:136-142) | 유지 + §1-4 설계 원칙 3줄 추가 | |
| Plugin README Style(:144-153) | `docs/reference/readme-style.md`로 이동, Workflow 4단계에 포인터 | README 작업에만 필요 |

**유지해야 할 것:** AGENTS.md:43-45(인용 숫자를 공식 원문과 대조), :53-56(WebFetch 요약 사고), gotchas.md:19(version 우선순위), :31(`Write(path)` 미동작), :43(리서치 결과 대조).

## 1-4. 메모리 이관 맵

메모리 위치: `~/.claude/projects/-Users-ljo-Desktop-project-zero-code-claude-code-zero/memory/` (27개). 레포 문서는 영어로 작성.

**살릴 것**

| 메모리 | 살릴 내용 | 목적지 |
|---|---|---|
| project_rubber_duck_redesign | jq `.key // default`가 JSON `false`를 삼킴 → boolean은 raw 비교 | gotchas.md 신설 "Hooks & scripts" |
| project_rubber_duck_redesign | `set -u` 아래 `${CLAUDE_PLUGIN_ROOT}` 무가드 참조 → hook 전체 사망. `[[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]` | gotchas.md "Hooks & scripts" |
| (enhancement 문서) | hook `if` 조건을 좁혀 프로세스 기동 전에 거르기 | gotchas.md "Hooks & scripts" |
| (handoff 문서) | `node --test <dir>`은 가짜 fail — 파일 경로를 지정 | gotchas.md "Hooks & scripts" |
| project_worktree_plus_setup_skill | headless `-p` 쓰기 검증: `--permission-mode acceptEdits` + 프롬프트에 선승인 | gotchas.md "Hooks & scripts"(또는 Testing) |
| project_vision_powers_artifact_channel | 설치 캐시가 레포보다 오래되면 일반 세션의 Skill 툴이 구 로직 실행(`--plugin-dir`은 로컬 우선) | gotchas.md Loading 절, AGENTS.md:94 교정과 같은 자리 |
| feedback_plugin_data_paths | 임시 파일·산출물도 `${CLAUDE_PLUGIN_DATA}`, CWD 금지 | gotchas.md:39 보강 |
| feedback_audit_scope | 최소 요구 버전은 유지, "tested against"는 재확인 절차 없으면 삭제. 릴리즈 노트 감사 때 억지 변경 금지 | gotchas.md Versioning 절 |
| feedback_verify_rules_against_references | 내부 문서의 FORBIDDEN 규칙도 코드로 강제 전 references와 대조 | gotchas.md:43 병합 |
| feedback_deterministic_over_clever | 로직 배치는 프롬프트보다 hook/스크립트 고정 코드 우선, 가지 기각 전 최선 변형 검토 | AGENTS.md Coding Style |
| feedback_plugin_scope | 플러그인엔 기능 범위에 해당하는 지식만 | AGENTS.md Coding Style |
| feedback_version_bump | 플러그인 수정 커밋에 버전 범프 포함, 따로 묻지 않음 | AGENTS.md Versioning |
| project_vision_powers_artifact_channel | `artifact-gate.js`는 HTML을 텍스트로만 읽음 — 통과 ≠ 렌더 정상 | docs/context/vision-powers.md |
| project_rubber_duck_redesign | 단일턴 trigger eval은 auto-detect형 스킬에 부적합 | docs/context/skill-creator-pro.md |
| feedback_no_unilateral_decisions · feedback_grill_plan_edits_to_doc · feedback_removal_scope · (015·013 메모의 질문 스타일) | 보고 ≠ 승인 / 그릴 중엔 이슈 문서에 작업으로 / 가리킨 레이어만 삭제 / 질문은 하나씩 짧게 | §1-5 #1 결정 |

**삭제할 것** — 레포에 이미 있음: `project_references_folder_purpose`, `feedback_issue_docs_location`, `feedback_release_pull_first`, `feedback_readme_style`, `reference_origin_docs`. 끝났거나 낡음: `project_diff_visual_catch_up`, `project_worktree_plus_setup_skill`(교훈 이관 후), `project_vision_powers_artifact_channel`(교훈 이관 후), `project_rubber_duck_redesign`(교훈 이관 후), `project_codex_advisor_105`, `project_skill_creator_pro_status`, `project_codex_advisor_016`(이슈 016에 있음). 다른 레포: `project_harness_engineer`, `reference_harness_landscape`, `project_health_visual_skill`, `project_backend_diagram_015`. 판단 필요: `project_product_demo_video`.

## 1-5. 결정 필요

1. 협업 규칙 4개(§1-4 마지막 행) 위치 — 전역 `~/.claude/CLAUDE.md`(프로젝트 무관) vs AGENTS.md
2. handoff 중 살릴 것 — `claude-preset` 아이디어(삭제/spec), new-vibe Issue 7(`discover.sh:16` 경로 오염이 버그면 issue로)
3. research 2개 llm-wiki 이동 — llm-wiki `raw/`는 사용자만 채우는 규칙. 삭제 or 사용자가 직접 드롭
4. `.claude/worktrees/remove-test-3` 제거 여부
5. `settings.local.json` `git push` allow → ask 전환 여부
6. release-workflow 레포 태그 번호 기준

## 1-6. 수정 순서

1. 틀림·충돌·상태줄 수정 (§1-1)
2. 퇴적 삭제 (§1-2, 결정 #2·#3 반영)
3. AGENTS.md·CLAUDE.md 줄이기 + 메모리 이관 (§1-3, §1-4, 결정 #1 반영)
4. 메모리 폴더 정리 (레포 밖)

---

# 2부 — 플러그인

수정 시 플러그인마다 버전 범프가 따라온다. 공통 관찰:

- **description 비용:** `disable-model-invocation: true` 스킬은 description이 컨텍스트에 안 들어간다(skills.md:494). 매 세션 비용은 모델 호출형만 해당 — codex-advisor 10개 1,974자, skill-creator-pro 2개 760자, vision-powers `diff-visual` 531자·`doc-visual` 399자가 큼.
- **본문 길이:** 공식 팁 500줄 초과 — vision-powers `context-health-visual` 557·`plugin-visual` 553·`diff-visual` 543, `skill-creator-pro` 520, rubber-duck `engine.md` 375(모든 /duck-* 실행마다 로드).
- **설치본 격리 위반 패턴:** 여러 플러그인이 레포 전용 경로(`docs/…`, `references/…`, research §번호)를 가리킴 — 설치본엔 없음(gotchas "Installed plugin isolation").

## 2-1. vision-powers

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | context-health-visual/SKILL.md:154-155 | `trigger-collision-inspector` 에이전트가 `skills/context-health-visual/agents/`에 있음 — 플러그인 에이전트는 루트 `agents/`만 로드, §5 호출 실패 | 루트 `agents/`로 이동, `vision-powers:trigger-collision-inspector`로 호출, :550·health-criteria:282 경로 수정 | ✅ |
| 2 | high | plugin-visual/.../analysis-criteria.md:185, env-fit-diagnosis.md:66,87-91, report-template.md:121 | "2% of context window, 16,000 fallback" — 공식 1%(skills.md:1056), context-health-visual과도 충돌 | 1% + 오버라이드 설정으로 교체, 공유 파일 하나만 가리키게 | ✅ |
| 3 | high | context-health-visual/SKILL.md:430,436-437, health-criteria.md:138-139 | "8,000-char fallback", "dynamically shortened" — 현 공식: 덜 쓰는 스킬 description부터 제거, 신규 설정(`skillListingMaxDescChars` 등) 미반영 | 현 공식 기준으로 교체 | 🔹 |
| 4 | high | report-manager/SKILL.md:157(+:19,:57,:85) | "`$CLAUDE_PLUGIN_DATA` is a shell env var, not a SKILL.md substitution" — 공식 skills.md:401은 치환함 | gotcha 삭제, `${CLAUDE_PLUGIN_DATA}`로 통일 | ✅ |
| 5 | high | report-manager:97,124-153, fact-check:66-87,260, marketplace desc | ✎ 섹션 피드백 UI를 심는 생성 스킬이 없음, ADR 0007이 Artifact에서 제거 → 수확 경로 전부 죽음 | 피드백 수확 절·감지 절·description 문구 삭제 | 🔹 |
| 6 | high | context-health-visual/SKILL.md:412,492-495 | `sections-data.json`에서 `body` 제거하라는 프라이버시 가드 — 그 파일 없음(:247) | 스캔 스크립트가 본문 필드를 안 내게 보장, SKILL.md는 한 줄 | 🔹 |
| 7 | high | channel-decision.md:32-34 ↔ doc-visual:76-77,132-162 | "md never changes / stays local" ↔ doc-visual은 md를 `--artifact`로 게시 | SSOT 표에 doc-visual 예외 행, doc-visual:76-77 삭제 | 🔹 |
| 8 | high | plugin-visual:509, agents/coherence-reviewer.md | `--verify` 플래그·coherence-reviewer 호출이 어디에도 없음 — 에이전트 description 229자만 매 세션 비용 | :509 삭제, 에이전트 삭제(또는 호출 단계 명시) | 🔹 |
| 9 | high | analysis-criteria.md:180-181,206, env-fit-diagnosis.md:69,76 | "MCP tool definitions load at session start, capped at 10%" — 공식: 기본 전부 deferred. MEMORY.md를 deferred로 분류 | health-criteria §2·§7 모델로 교체 | 🔹 |
| 10 | high | fact-check/SKILL.md:46-47 | diff-visual 리포트 감지를 "Diff Visual" 제목으로 — 현재 제목은 "— Catch-up" | 파일명 접미사 규칙으로(report-manager:160과 동일) | 🔹 |
| 11 | high | agents/security-auditor.md:94-119, plugin-visual:524 | "22 hook events as of 2026-03" — 현재 33개 | 이벤트 표 → 판단 기준(차단 가능/컨텍스트 주입/도구 출력 관찰) + hooks.md 포인터 | 🔹 |
| 12 | high | analysis-criteria.md:149-158 ↔ plugin-visual:8,:531 | "All checks run in a single bash block" — `grep`/`ls`가 allowed-tools에 없어 권한 프롬프트로 멈춤(:531 스스로 185s 대기 관측) | `env-fit-scan.js --requirements` 인자로 이동 | 🔹 |
| 13 | high | agents/security-auditor.md:40 | `security-rules.md` Context Modifiers 참조 — 에이전트는 경로를 못 받음, 9개 중 4개만 복제 | 프롬프트에 파일 경로 전달, 에이전트 내 중복 표 삭제 | 🔹 |
| 14 | med | mermaid-patterns.md:484, feature-architect:277, plugin-visual:359,:530 | 노드 한도 15-20/~15/25 ↔ density-rules 9(게이트 강제) | 포인터로 통일 | 🔹 |
| 15 | med | agents/feature-architect.md:250 | violet classDef ↔ semantic-tokens.md:69 금지, 게이트는 4개 hex만 검사 | slate로 교체 | 🔹 |
| 16 | med | mermaid-patterns.md:386,408 | "ELK default" ↔ :27 "Only import when needed", 템플릿은 ADR 0002로 삭제 | 절 삭제 | 🔹 |
| 17 | med | context-health-visual:18 ↔ :344-345,:521-522 | observational 섹션 5개 vs 4개 | "6 graded + 5 observational"로 통일 | 🔹 |
| 18 | med | doc-visual:4-7, diff-visual:4-9, report-manager:4-5, plugin.json/marketplace | description 동의어 나열, diff-visual 531자는 본문 반복, plugin.json(676자)·marketplace(1004자) 불일치 | 짧게 재작성 + 두 매니페스트 동기화 | ✅(길이) |
| 19 | med | doc-visual:94-121,319-355, diff-visual:354-398,491-519, plugin-visual:413-490, context-health-visual:326-407 | Artifact 채널 블록 ~70줄 × 4 복제 | `references/design-system/artifact-channel.md` 하나로 | 🔹 |
| 20 | med | 5개 스킬 local 채널 규칙 | 로컬 규칙·CSS·self-audit 5곳 중복, 일부는 게이트가 이미 강제 | `local-channel.md` 포인터 | 🔹 |
| 21 | med | 4개 스킬 "Config precedence" 7줄 | channel-decision.md 복제 | 삭제 또는 `config.js channel` 서브커맨드로 | 🔹 |
| 22 | med | context-health-visual:426-541 등 | Gotchas 115줄 대부분 health-criteria 중복·유지보수자 메모 | 런타임 사실은 criteria로, 유지보수 메모는 docs로 → 세 파일 500줄 미만 | 🔹 |
| 23 | med | feature-architect:157-177,354-399 ↔ analysis-criteria:69-119 | 품질 기준 이중화, 체크리스트 14 vs 7로 갈라짐 | analysis-criteria SSOT | 🔹 |
| 24 | med | 여러 스킬 | 개발 흔적("S2–S4", "issue 007 S4.5")과 설치본에 없는 경로(`docs/…`, `references/Kami/…`) | 삭제, 필요한 이유는 인라인 한 문장 | 🔹 |
| 25 | med | fact-check:171-173, report-manager:100,161 | 템플릿 시절 클래스(`ve-card`, `--i`) | "match existing markup" 한 줄 | 🔹 |
| 26 | low | 5개 스킬 | 8 Tells 재나열, 목록 갈라짐 | anti-slop-tells.md 포인터 | 🔹 |
| 27 | low | diff-visual:188,400-405 | "Use extended thinking", 측정 기록 — no-op | 삭제 | 🔹 |
| 28 | low | env-fit-diagnosis.md:43 | "Six Diagnostic Analyses" — 실제 8개, `skills-lock.json` (추측: 없는 파일) | "Eight", 3G 축소 | 🔹 |
| 29 | low | doc-visual:204 ↔ :210 | "read them each time" ↔ "no need to look up" | 규칙 목록 삭제 | 🔹 |
| 30 | low | plugin-visual:516,:8 | 쓰지 않는 `echo $(date)` gotcha와 `Bash(echo *)` grant | 삭제 | 🔹 |

README 충돌: "4 specialized agents"(실제 3개, 하나는 미호출), "Skips gracefully when claude-in-chrome unavailable"(render-report.js는 로컬 Chrome 바이너리 사용).
유지: diff-visual:170-178(검증된 이름만 다이어그램에), :238-240(extraction law), channel-decision.md:82-97, mermaid-patterns.md:448-459·505-515, context-health-visual:496-507.

## 2-2. skill-creator-pro

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | skill-creator-pro/SKILL.md:446 | `python ${CLAUDE_SKILL_DIR}/scripts/package_skill.py` — :17 `from scripts.quick_validate import`라 `ModuleNotFoundError`(공식은 `python -m`) | "from `${CLAUDE_SKILL_DIR}`: `python -m scripts.package_skill <path>`" | ✅(import 줄) 🔹(실행) |
| 2 | high | auto-optimize/SKILL.md:70-71,337,340 | 작업 디렉터리를 스킬 옆 `autoresearch-*/`에 — 플러그인 스킬이면 배포본에 섞임, skill-creator-pro:181과 규칙 불일치 | `${CLAUDE_PLUGIN_DATA}/autoresearch-<name>/` | 🔹 |
| 3 | high | auto-optimize:3 ↔ skill-creator-pro:3 | 트리거 4개 겹침 — "improve my skill"이 무인 제자리 수정 루프로 갈 수 있음 | auto-optimize는 "hands-off 요청 시에만", skill-creator-pro의 공식에 없는 "Also trigger on…" 삭제(472→~340자) | 🔹 |
| 4 | high | auto-optimize:68 ↔ :109,:219 | 기준선 3-5회 vs 실험 N회 — max_score 비교 불가 | 기준선도 실험과 같은 횟수 | 🔹 |
| 5 | med | skill-creator-pro:259,:300-304 | `kill $VIEWER_PID` — 셸 변수가 호출 간 유지 안 됨, 포트 충돌은 스크립트가 이미 처리 | PID를 echo 후 리터럴로 kill, 이유절 삭제 | 🔹 |
| 6 | med | auto-optimize:121,128-130 | 대시보드가 file://에서 `results.json` fetch — 브라우저가 차단(추측, 미실측) | 결과 인라인 + meta refresh, 명세는 references로 | 🔹 |
| 7 | med | auto-optimize:72,:219 | 실행 주체 미명시 — eval을 아는 세션이 직접 돌리면 오염 | 매 실행 fresh subagent | 🔹 |
| 8 | med | skill-creator-pro:96 | `${CLAUDE_PLUGIN_DATA}` 지시 — 사용자 스킬 대부분은 personal/project라 치환 안 됨 | 플러그인/개인 스킬 분기 | 🔹 |
| 9 | med | skill-creator-pro:436,:438 | `claude`·`anthropic` 예약 이름, built-in 조용한 충돌 — 공식: 예약은 `synced`, 플러그인 스킬은 네임스페이스 | 공식 기준으로 교체 | 🔹 |
| 10 | med | auto-optimize:351-363,:267,:335-347 | 예시·반복 문단·Output Files 중복 | 삭제, changelog 템플릿은 references로 | 🔹 |
| 11 | med | skill-creator-pro/SKILL.md(520줄) | 자기 규칙(:108)과 공식 500줄 초과 | pro 추가분부터 삭제, Claude.ai 절 삭제는 ADR 0001과 부딪혀 결정 필요 | 🔹 |
| 12 | low | auto-optimize:261 | "NEVER STOP" ↔ :215 "ALL CAPS 금지" | 이유 붙인 기준 문장으로 | 🔹 |
| 13 | low | auto-optimize:58-59,:380 | 레포 전용 경로 참조, "step 2" 오기 | 삭제, "Step 3" | 🔹 |
| 14 | low | README.md:23 | 없는 기능 "confidence scoring" | 삭제 | 🔹 |

기타: agents 3개·schemas.md·scripts는 공식과 동일(ADR 0001 준수). 예외 `eval-viewer/generate_review.py:279-291` `</script>` 이스케이프는 기록 안 된 fork — ADR/README에 한 줄.

## 2-3. codex-advisor

spec/issue 016이 이미 다루는 항목(Phase 4, `--no-preview`, rescue 3블록, evaluation.md, spark 등)은 제외. 단 `codex-review:73` "Alias `spark` auto-expands"는 016 S6 수용기준 grep에 안 걸리므로 S6에 추가 필요.

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | codex-verify:232,253,265, research:231,252,264, rescue:283,297, transfer:40→72 | `$CODEX_COMPANION`을 앞 Bash 호출에서 설정하고 뒤 호출에서 사용 — 셸 변수 비유지, verify/research는 Phase 1.5 질문이 끼어 반드시 다른 호출 | 매 블록 첫 줄에서 재해석(또는 #7 스크립트로 흡수) | 🔹 |
| 2 | high | codex-status:19-21, result:19-21, cancel:28 | `status $ARGUMENTS` 따옴표 없이 전달 ↔ companion-usage.md:321 whitelist 규칙 | Phase 1 whitelist + 값별 따옴표 | ✅ |
| 3 | med | codex-cancel:14-19,:37, status:55, result:56 | companion 실제 동작과 다른 설명(id 없으면 활성 job 1개일 때만 취소, `--all`은 상한만 해제) | 실제 동작으로 교체 | 🔹 |
| 4 | med | companion-usage.md:351-353,:367 | 알 수 없는 플래그 "FATAL" ↔ 각 SKILL.md는 AskUserQuestion | AskUserQuestion으로 통일 | 🔹 |
| 5 | med | rescue·review·adversarial·verify·research의 `:NNN` 줄 인용 | 핀(1.0.5)과 안 맞는 옛 번호, companion-usage.md와 값이 둘 | SKILL.md 인용 삭제, companion-usage.md §3 포인터 | 🔹 |
| 6 | med | review:79, rescue:75, verify:134, research:134, adversarial:76 | "Advisory stderr warnings (slug not in cache)" — spec 012에서 삭제된 기능 | 절 삭제 | 🔹 |
| 7 | med | rescue:253-262,283-298, verify, research, companion-usage.md | 실행·jobId 파싱·대기 루프 4파일 복사 + 관련 gotcha 7곳 반복 | `scripts/codex-task.sh launch/wait`로 이동 | 🔹 |
| 8 | med | rescue:292, verify:260, research:259 | `/codex:status` 안내 — Official 플러그인 비활성 권장과 충돌, 플러그인명 지목 | `/codex-status` | 🔹 |
| 9 | med | companion-usage.md:309 | "enable the Official plugin" ↔ ADR 0006 자체 hook | 자체 hook 기준으로 | 🔹 |
| 10 | med | codex-transfer:3 | description 361자, 모델이 스스로 호출할 흐름 아님 | `disable-model-invocation: true` + 짧은 description | ✅(길이) |
| 11 | med | review:41-43, adversarial:39-41, rescue:377, setup:126 | `--model`/`--effort` 근거 4곳 + companion-usage 중복 | SKILL.md엔 한 줄 포인터 | 🔹 |
| 12 | low | companion-usage.md:302 | effort 값 검증 — companion에 전달 안 됨, 용어집 "Do not reintroduce"와 충돌 | 행 삭제 | 🔹 |
| 13 | low | codex-result:3, cancel:3 | 동의어 나열 | 한 문장 | 🔹 |
| 14 | low | adversarial:11-13,:248-250 | "hallucinates more" 근거 없이 4회 | 삭제 | 🔹 |
| 15 | low | companion-usage.md:14,:155,:296 | "1.0.0+" ↔ README "v1.0.4+", "still present in 1.0.5" 확인 스탬프 | :14 삭제, 스탬프 삭제(:9 핀은 유지) | 🔹 |
| 16 | low | review:205-207 | 없는 "the plan" 참조 | 삭제 | 🔹 |

기타: `codex-setup:33-40` 인증 확인은 companion `setup --json`의 `authStatus`로 대체 가능. ADR 0012 적용 시 rescue:23-25·:381 이유 문장도 S5a 정리 범위.

## 2-4. rubber-duck-tutor

ADR 0003·0008은 재논의하지 않음.

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | hooks/post-push.sh:66, post-pr.sh:66, engine.md:289 | `resolve-gap.sh "<the exact gap text recent-gaps.sh printed>"` — 출력이 `날짜<TAB>gap`이라 그대로 넘기면 no-op → ship-point gap이 영원히 해소 안 됨 | "gap text with the leading date and tab removed" | ✅(문구) 🔹(실행 재현) |
| 2 | high | duck/SKILL.md:29-30 | 3번(미커밋)이 4번(세션 편집 미커밋)을 먼저 잡아 `/duck-verify`로 절대 라우팅 안 됨 | 4번을 "already committed session edits"로, 중복 Mode Map 표 삭제 | 🔹 |
| 3 | high | ducking/references/exercise-patterns.md:48 ↔ :176, engine.md:347 | "막히면 코드 보여줘라" ↔ "어느 단계에서도 코드 금지" | :48 삭제, 1-3줄 문법만 허용 | 🔹 |
| 4 | high | engine.md:173 ↔ :188,:198 | 증명 안 된 hunch를 log-gap에 기록 → 다음에 틀린 gap으로 출제 | hunch는 별도 줄, log-gap 금지 | 🔹 |
| 5 | high | engine.md:103,105 | 모델 재량 제안 지시 ↔ ADR 0003, "regardless" ↔ `enabled:false` 즉시 중단 | 재량 부분 삭제, config 체크 우선 | 🔹 |
| 6 | high | references/orientation-guide.md:72 | 유저 레포에 `/duck orient refresh` 문구 기록 — 이 명령은 동작 안 함 | `/duck-orient refresh`, "main SKILL.md" → `engine.md` | 🔹 |
| 7 | high | plugin CONTEXT.md ↔ docs/context/rubber-duck-tutor.md | 용어집 이중·정의 충돌 (1부 설계 기록 표와 동일 건) | 1부에서 처리 | ✅ |
| 8 | med | engine.md:133,:163 | quick check "~30초" ↔ 필수 Confidence·Uncertainty 체크 | quick은 둘 다 생략 | 🔹 |
| 9 | med | engine.md:337 ↔ :38,:64-69 | 한 메시지 질문 2개, "before anything else" 두 곳 | :337 삭제, 순서 한 줄 명시 | 🔹 |
| 10 | med | engine.md:216-333 | ship-point 3절 118줄(engine의 31%) — 어떤 모드도 실행 안 함, hook은 engine 안 읽음. 슬라이스 이력 섞임 | 이력 제거 후 `references/ship-point.md`로 | 🔹 |
| 11 | med | engine.md:227-233 ↔ post-push/post-pr:66 | "keep in sync" 사본 drift — hook엔 injection·N+1·hook contract 누락, tie-break는 hook에만 | `lib.sh` 함수 하나를 SSOT로, sync 주석은 grep 테스트로 | 🔹 |
| 12 | med | post-push.sh:62, post-pr.sh:62 | 경로 없는 "see the plugin engine doc" 포인터 — ship 시점에 engine 읽기 유도(ADR 0003 근거와 충돌) | 괄호 정의 인라인, 포인터 삭제 | 🔹 |
| 13 | med | engine.md:210-211 | `lib.sh duck__check_rate_limit`가 이미 강제하는 세션 한도 | 절 삭제 | 🔹 |
| 14 | med | engine.md:340-361 | "wrong is wrong" 3회, 질문 1개 규칙 반복, exercise-patterns 복사 | 포인터 1줄 | 🔹 |
| 15 | med | engine.md:41 ↔ :90, verify:40 | "Never solve, never hint" ↔ 스스로 교정·설명 지시 | "답을 내놓은 뒤에만 한 문장으로 정답" | 🔹 |
| 16 | med | duck-prebuild:102 | "Continue until all decisions are covered" — intensity 예산과 충돌 | 예산 소진까지 위험 순 | 🔹 |
| 17 | med | duck/SKILL.md:36,:46,:50 | auto-detect 후 인라인 실행 vs 명령 안내 미정, 없는 "fallback" 섹션 | 한 규칙으로 | 🔹 |
| 18 | low | 6개 스킬 description | 전부 `disable-model-invocation`이라 모델 트리거 문구 무의미(coach 504자) | 120자 이하 메뉴 라벨 | ✅ |
| 19 | low | engine.md:221,:239, hooks:66 | 외부 스킬(`code-review`) 이름 지목 | "out of scope for duck" | 🔹 |
| 20 | low | README.md:45-47 | engine 동작과 다른 설명 3줄 | 실제 동작으로 | 🔹 |

유지: engine.md:93-99(Skeptical Grading), coach:57(연습 통과로만 gap 해소), exercise-patterns.md:163,:180, duck-verify:12-16.

## 2-5. claw-mux

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | claw-mux/SKILL.md:102,118,173-179, terminal-io.md, sync-and-automation.md:45, cmux-browser:97-110, cmux-markdown:95-96 | `$SKILL_DIR` 25곳 — 공식 치환 변수는 `${CLAUDE_SKILL_DIR}`, 셸 env도 비어 `/scripts/…` 실행 실패 | `${CLAUDE_SKILL_DIR}`로 일괄 교체 | ✅ |
| 2 | med | terminal-io.md:146, SKILL.md:107-108 | Claude Code 완료 감지를 `╭─`/`❯`로 — 작업 중에도 렌더돼 오판 (추측) | `cmux wait-for -S task-done` 방식 | 🔹 |
| 3 | med | notifications.md:82-91 | Stop hook `stop_reason` 분기 — 공식 입력에 없음, 유저 settings 편집은 범위 밖 | 절 삭제 또는 `last_assistant_message` | 🔹 |
| 4 | med | SKILL.md:62-69,71-125,127-144,13-21 | wait-for 줄 3회, 사이드바 명령 3회, 환경 체크 3회 | 전략 표 + 1줄, ~100줄로 | 🔹 |
| 5 | med | SKILL.md:75,:162, terminal-io.md:150,:193 | "foreground sleep over 2 seconds 차단" 미확인 수치 3곳 + 서로 충돌 | "run_in_background 또는 Monitor" 한 곳 | 🔹 |
| 6 | med | cmux-markdown:117 ↔ :41,:120 | atomic replace 지원 ↔ 재생성 시 재연결 안 됨 | 시간 기준 한 줄, 스킬 ~20줄로 축소 | 🔹 |
| 7 | med | cmux-browser:20-30,61-71,83-89,112-121 | 같은 워크플로 3회, Limits 중복 | Core Workflow 하나만 | 🔹 |
| 8 | med | cmux-markdown:26,82-88, cmux-browser:39 | `--workspace`/`--window` 플래그 — `cmux help`(0.64.22)에 없음 | 실행 확인 후 삭제 | 🔹 |
| 9 | low | SKILL.md:3, cmux-browser:3, README.md:44 | description에 트리거 없음, README가 disable-model-invocation과 충돌 | 트리거 문장, `/cmux-markdown` 안내 | 🔹 |

기타: 설치 캐시 1.2.0 description이 레포와 다른데 버전 범프 없음(`566d51b`) — 기존 유저 미반영.

## 2-6. notebooklm-connector

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | agents/chrome-mcp-query.md:16-18 | `permissionMode: bypassPermissions` — 플러그인 에이전트에선 무시(plugins-reference:68), 작성자는 켜진 줄 앎 | 삭제, README에 allow 규칙 안내 | ✅ |
| 2 | high | notebooklm-manager/SKILL.md:18, references/gotchas.md:31 | "Chrome MCP tools aren't in allowed tool set — calling will error" — 공식: allowed-tools는 제한 아님 | 이유를 "에이전트가 탭·폴링·에러를 소유"로 교체, 중복 삭제 | 🔹 |
| 3 | high | hooks/ensure-skill-loaded.sh:5,10 | regex `노트북`(=laptop)·`notebook.*list` 등 과매칭 + "MUST invoke" — **이번 세션에서 NotebookLM과 무관한 프롬프트에 실제 발동 관측** | `notebooklm` 중심으로 좁히고 조건부 문구 | ✅ |
| 4 | med | hooks/hooks.json:27, SKILL.md:18,72,116 | matcher `Task` — 도구명은 `Agent`로 바뀜, hook matcher에 alias 적용 여부 미명시 (추측) | `"Agent\|Task"`, 본문 `Agent`로 | 🔹 |
| 5 | med | follow-up-reminder.sh:21 ↔ SKILL.md:114 | hook이 `auto_coverage: false`를 무시하고 매번 강제 | "unless auto_coverage is false" | 🔹 |
| 6 | med | agents/chrome-mcp-query.md:216,231-233,311 | textarea maxLength 분기 — gotchas:17 "no maxLength" → 절대 실행 안 됨 | 분기·출력 줄 삭제 | 🔹 |
| 7 | med | SKILL.md:166-193,197-200 | hook 내부 마이그레이션 설명 28줄, 모델 할 일 없음 | 한 줄 | 🔹 |
| 8 | med | SKILL.md:101-108 ↔ agents:76-83 | 복구 6단계 동일 복제 | 에이전트 출력 SSOT | 🔹 |
| 9 | med | agents:367,369 ↔ :373 | JS 에러 시 재시도 ↔ 추가 호출 금지 | 한 규칙으로 | 🔹 |
| 10 | low | plugin.json ↔ marketplace.json | description 문구 다름 | 동기화 | 🔹 |
| 11 | low | hooks/setup-data.sh:70 | PreToolUse `{"decision":"approve"}` deprecated | 현 형식으로 | 🔹 |

## 2-7. claw-mo · toolbox · vibeproxy-kit · worktree-plus · e2e-test-runner

| # | sev | 위치 | 문제 | 수정안 | 확인 |
|---|---|---|---|---|---|
| 1 | high | worktree-plus/skills/worktree-setup/SKILL.md:94 | "migration re-trigger by restarting" — `setup-check.sh:40-41` fast path가 migration 블록보다 먼저 exit | `git config --global` 수동 명령 안내, v3.0.0 migration 절 축소 검토 | 🔹 |
| 2 | high | worktree-plus/.../SKILL.md:75 | "`dirBase`: no tilde expansion (stays literal)" — 실제 `worktree-create.sh:43-45`가 `exit 1` | "`~` values are rejected — write an absolute path" | ✅ |
| 3 | high | e2e-test-runner/skills/e2e-test/SKILL.md:39 | `--resultsPath ./e2e-results` 고정 → 타임스탬프 하위 디렉터리 무력화, 매 실행 덮어씀, Quick Start `--baseline` 경로가 존재 불가 | 플래그 삭제, 출력된 경로 읽기 | 🔹 |
| 4 | high | claw-mo/skills/claw-mo-open/SKILL.md:73-78 | 런타임은 파일만 watch하는데 config엔 `*.md` 저장 → 다음 `/claw-mo-up`이 drift로 `--clear` (추론) | 저장값을 실제 시작 형태와 일치 | 🔹 |
| 5 | high | vibeproxy-kit/skills/setup-aliases/SKILL.md:232 ↔ :291 ↔ :303 | merged-config 재생성 시점 "launch만" vs "launch or toggle" | 사실 하나로 확정, Phase 9 한 곳에 | 🔹 |
| 6 | med | e2e-test-runner/hooks/hooks.json:9,14 | `timeout: 120000`·`5000` — 단위가 초(hooks.md:430) → 약 33시간 | `180`/`5` | ✅ |
| 7 | med | e2e-test-runner SKILL.md:29-36,67-68 + hooks | 의존성 체크 3곳 | SKILL은 fallback 1줄 | 🔹 |
| 8 | med | toolbox/skills/secret-setup/SKILL.md:218 | 검증 단계 `cat "$MOCK_ENV"` — 실값이 컨텍스트에 찍힘 | `cut -d= -f1`(이름만) + `bash -n` | 🔹 |
| 9 | med | vibeproxy-kit setup-aliases (여러 줄) | 같은 규칙 2-5회 + references 반복 | SSOT 지정, Gotchas 대부분 삭제 | 🔹 |
| 10 | med | vibeproxy-kit setup-aliases:62-75,101-135,307-317 | 317줄, 조건부 onboarding·Scripts 표 | `references/onboarding.md`, 표 삭제 | 🔹 |
| 11 | med | claw-mo/references/shared.md:3 ↔ 스킬들 | "do not duplicate" 선언과 달리 스킬마다 복제 | 스킬 Gotchas 복제분 삭제, autosync는 references로 | 🔹 |
| 12 | med | toolbox/skills/handoff/SKILL.md:105-116 | 검증 규칙 3회, Gotchas가 Principles 재진술 | Gotchas 절 삭제 | 🔹 |
| 13 | med | toolbox/skills/secret-setup:177-208,234-244 | MCP 분기·중복 gotcha | references로, 중복 삭제 | 🔹 |
| 14 | low | claw-mo-open:56-60 ↔ manage:137 | curl API vs "mo CLI 우선" | `mo -w`로 | 🔹 |
| 15 | low | claw-mo-up:3 ↔ claw-mo-open:3 | 트리거 겹침 | 분리 | 🔹 |
| 16 | low | vibeproxy-kit setup-aliases:239 ↔ :153 | "Do not skip" ↔ Remove 경로 | 예외 명시 | 🔹 |
| 17 | low | vibeproxy-kit references/effort-levels.md:9-31, model-selection.md:86 | 모델 표 노후 가능 (추측), 설치본에 없는 research §9.2 인용 | 확인일 명시, 인용 삭제 | 🔹 |
| 18 | low | worktree-setup:117,:193 | compound 명령 권한 설명 틀림, 중복 | 삭제 | 🔹 |
| 19 | low | secret-setup:237 | "`CLAUDE_ENV_FILE` only in SessionStart" — Setup·CwdChanged·FileChanged도 가능 | 수정 | 🔹 |
| 20 | low | toolbox handoff:82 | 다른 플러그인 스킬명(`/tdd`, `/diagnose`) 지목 | 일반 문구 | 🔹 |
| 21 | low | vibeproxy-kit·notebooklm README | 모드 수·동작 불일치 | 수정 | 🔹 |
| 22 | low | toolbox fetch-sitemap:87-93,107-112 | curl 플래그 설명·예시 중복 | 삭제 | 🔹 |
| 23 | low | vibeproxy-kit plugin.json(151자) ↔ marketplace(198자) | description 불일치 | 동기화 | 🔹 |

유지: worktree-setup:172-173(개행 없는 append 병합, include·link 중복 시 link 무음 skip), notebooklm references/gotchas.md:7-11(form_input 무음 실패), vibeproxy-kit setup-aliases:304(name/alias 반전 시 merge no-op), claw-mo shared.md:75-83·117(`--clear` 입력 대기 hang, 경로 정규화 비교).
