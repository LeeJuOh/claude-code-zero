# codex-advisor 1.0.5 대응: 인용 재검증 + transfer 래핑 (스킬 + 조건부 hook)

> 상태: S1 완료(79d9a38, 4.5.2) · S2 완료(a35c1b0, 4.6.0) · S3 완료(d492615, 4.6.1) · 검수 통과 — 결함 0, 문서 3건 교정(4.6.2): /clear-stale 우려는 CLI 2.1.201 실측으로 반증(ADR 0006 기록), model/effort 문구 교정, 본 상태줄 갱신 · 전체 검증 절차 1·2번 잔여(사용자 실E2E) — 2026-07-05 · 생성: 2026-07-04
> 용어집: `docs/context/codex-advisor.md` (신규 용어: **Transfer**, **Transcript env contract**)
> 결정 근거: `docs/adr/0006-codex-advisor-conditional-transcript-hook.md`
> 대조 레퍼런스: `references/codex-plugin-cc` (1.0.5로 이미 갱신됨) + `~/.claude/plugins/cache/openai-codex/codex/{1.0.4,1.0.5}` diff
> 출처: grill-with-docs + domain-modeling 세션 (공식 codex 1.0.4→1.0.5 diff 전수 분석)

## 배경 — 검증된 사실

공식 CHANGELOG는 방치 상태(1.0.0 항목뿐). 아래는 전부 **diff로 직접 확인**한 것.

**1.0.4 → 1.0.5 실변경:**

| 변경 | 내용 |
|---|---|
| 신규 `transfer` 서브커맨드 + `/codex:transfer` | 현재 Claude 세션 jsonl → Codex resumable thread 이관. 플래그: `--source <jsonl>`, `--json`, `--cwd`. `externalAgentConfig/import` RPC, 완료 대기 2분 타임아웃 |
| 신규 `lib/claude-session-transfer.mjs` | transcript 경로 해석: `--source` > `CODEX_COMPANION_TRANSCRIPT_PATH` env. `~/.claude/projects/` 밖 경로 거부. `.jsonl` 강제 |
| `session-lifecycle-hook.mjs` | SessionStart에서 `CODEX_COMPANION_TRANSCRIPT_PATH`를 `CLAUDE_ENV_FILE`에 append (`:35-40` appendEnvVar, `export NAME='value'` 줄 추가 방식) |
| import 중복 방지 | `~/.codex/external_agent_session_imports.json` ledger — 같은 파일+같은 content sha256이면 기존 thread id 재사용 |
| `app-server.mjs` | `requestAttestation: false` capability 추가, 비정상 종료 에러 메시지에 stderr 본문 첨부 |
| `lib/codex.mjs` | `experimentalRawEvents` 옵션 제거, import 함수군 추가 (`withDirectAppServer`는 broker 우회) |

**플래그 계약 불변** (핸들러 본문 diff 0):
- `handleReviewCommand` / `handleTask` / `handleStatus` / `handleResult` 로직 변화 없음.
- review/adversarial의 `--wait`/`--background` silent no-op 버그 **1.0.5에도 잔존** (upstream 미수정).

**라인번호 전면 시프트** (transfer 코드 삽입 때문):

| 심볼 | 1.0.4 | 1.0.5 |
|---|---|---|
| `printUsage` | :73 | :75 |
| `handleReviewCommand` | :682 | :712 |
| `handleTask` | :732 | :762 |
| `handleStatus` | :840 | :883 |
| `handleResult` | :867 | :910 |

`lib/codex.mjs` diff hunk 실측: `:36` +5줄, `:45` +2줄, `:63-64` 내용 변경(-1), `:637` +88줄 삽입(import 함수군), `:963` +37줄 삽입 — 누적 시프트는 `startThread` 기준 +94(638→732), `runAppServerTurn` 기준 +131(964→1095).

주의 — 기존 인용 `:56-66`은 `startThread`가 아니라 **`buildThreadParams`**(1.0.5에선 `:63` 시작). 이 구간은 라인 시프트가 아니라 **내용 변경**: `experimentalRawEvents: false` 줄이 삭제됨. 기계 치환 불가 — S1 재검증 원칙이 정확히 적용되는 지점. `startThread({model})` 호출부 인용 `:916-921`은 1.0.5 `:1010-1015`.

**현재 우리 상태의 모순**: `resolve-companion.sh`는 registry/최고 semver 우선이라 **런타임은 이미 1.0.5 companion을 실행 중**. 문서만 1.0.4에 묶여 있음 (companion-usage.md "verified against 1.0.4", plugin.json/marketplace.json "Tested against 1.0.4").

**disable 구멍**: README는 "공식 플러그인 disable해도 기능 손실 0 (companion 직접 호출)"을 약속. 1.0.5부터 disable 시 `/codex:transfer` 커맨드와 SessionStart hook(env 주입)이 함께 사라져 transfer만 이 약속에서 탈락 → 이 이슈가 복구.

## 불변식 (깨지 않음)

- **스킬 : companion 서브커맨드 = 1 : 1 완전 커버.** transfer 래핑으로 유일한 구멍 제거 (10 스킬).
- **"disable해도 손실 0" README 약속 유지.** S3 hook이 이를 지탱.
- **모델 즉흥 로직 금지** (do-not-improvise DNA). transcript 경로 해석은 고정 코드(hook)에서만. SKILL.md의 실행부는 `transfer --json` 한 방 — nonce/grep/mtime 추측 절대 금지 (기각 근거는 ADR 0006).
- **hook은 무해 우선**: stdout 무출력(컨텍스트 토큰 0), 조기탈출 가드, `timeout: 5`.
- **인용은 검증된 것만**: 갱신하는 모든 라인 인용은 `references/codex-plugin-cc`(1.0.5) 실소스와 대조 ([[verify-rules-against-references]] 사례 재발 방지).

---

## S1 — 1.0.5 호환 재검증 + 인용 전면 갱신

**Blocked by**: 없음 — 즉시 착수 가능

### What to build

1.0.4 기준으로 작성된 모든 소스 인용·호환 도장을 1.0.5 기준으로 재검증 후 갱신. "재검증"이 핵심 — 라인번호 기계적 치환이 아니라 각 인용 지점의 **계약이 실제로 불변인지** references 클론에서 눈으로 확인하고 갱신.

대상 파일:
- [x] `plugins/codex-advisor/references/companion-usage.md` — 라인 인용 전체(40개+ 지점) + "verified against 1.0.4" → 1.0.5. §3 no-op 버그 서술에 "still present in 1.0.5" 명기. **완료 — 이 파일 자체가 이제 1.0.5 정확 라인 매핑의 소스.** 이후 파일 갱신 시 여기서 그대로 인용 재사용 가능 (예: `handleReviewCommand` `:712-753`, `valueOptions` `:714`, `handleTask` `:762-823`, `readTaskPrompt` `:643-650`, `lib/codex.mjs` `buildThreadParams :63-71` / `startThread 호출 :1010-1015`).
- [x] `plugins/codex-advisor/skills/codex-setup/SKILL.md` (`:130` 부근) — `codex-companion.mjs:684`→`:714`, `lib/codex.mjs:56-66`→`:1010-1015` 갱신 완료.
- [x] `plugins/codex-advisor/skills/codex-review/SKILL.md`, `codex-adversarial/SKILL.md` ("v1.0.4" 문구 + `lib/codex.mjs:56-66` 인용) — **codex-review/SKILL.md 완료** (`:684`→`:714`, `lib/codex.mjs:56-66`→`:1010-1015`, `:613-619`→`:643-650`, "v1.0.4"→"v1.0.4+"). **codex-adversarial/SKILL.md 완료** — `lib/args.mjs` 참조 `:613-619`→`:643-650`, `handleReviewCommand valueOptions :684`→`:714`, `lib/codex.mjs:56-66`→`:1010-1015` + "v1.0.4"→"v1.0.4+", 그리고 별도 4번째 지점 `handleReviewCommand` 공유 인용 `:725, :992-1003`→`:755, :1035-1049`(references/codex-plugin-cc 1.0.5 실소스 대조로 신규 도출, companion-usage.md엔 없던 인용).
- [x] `plugins/codex-advisor/README.md` (`:98, :131-132` — "v1.0.4+" 요구 문구는 유지하되 tested 도장 갱신) — `codex-companion.mjs:684`→`:714`, `lib/codex.mjs:56-66`→`:1010-1015`, "assumes the v1.0.4 companion contract"→"v1.0.4+ companion contract, tested through 1.0.5". Codex CLI 0.125 스탬프는 재측정 불가로 유지.
- [x] `docs/context/codex-advisor.md` — 본문 인용 재확인·갱신 완료. `codex-companion.mjs:239-245`→`:242-248`(buildAdversarialReviewPrompt, 내용 diff 0), `:613-619`→`:643-650`(readTaskPrompt, 2곳) + `:619`→`:649`. `lib/args.mjs` 자체는 1.0.4/1.0.5 바이트 단위 diff 0 확인 — `:48-49`, `:70` 인용 그대로 유지.
- [x] `plugins/codex-advisor/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — description "1.0.4"→"1.0.5" (Codex CLI 0.125은 재측정 불가로 유지). marketplace.json 버전 4.5.1→**4.5.2** (S1 단독 릴리즈 패치, plugin.json엔 버전 필드 없음 — 로컬 소스 플러그인 컨벤션).

### Acceptance criteria

- [x] `grep -rn "1\.0\.4" plugins/codex-advisor docs/context/codex-advisor.md` 잔존 확인 완료 — 전부 "v1.0.4+" 버전 히스토리 서술뿐, 도장·verified-against 없음
- [x] 갱신된 라인 인용 전수 `references/codex-plugin-cc`(1.0.5) 실소스와 대조 완료 (본 세션에서 재확인한 6개 지점 diff/sed로 직접 검증)
- [x] 두 description(plugin.json, marketplace.json) 모두 "Tested against codex@openai-codex 1.0.5"
- [x] (변경 없음, 의도적) Codex CLI 버전은 로컬에 `codex` 미설치로 실측 불가 — "0.125"는 플레이스홀더가 아닌 기존 실측 이력값이라 재확인 없이 유지하기로 결정(S1 항목 5 근거). 이 조건은 충족 대상에서 제외.
- [x] review `--wait`/`--background` no-op 잔존 사실 companion-usage.md §3에 이미 반영됨 (전 세션 완료분 확인)

---

## S2 — `codex-transfer` thin 스킬

**Blocked by**: S1 (companion-usage.md가 1.0.5 기준이어야 transfer 표 추가가 안 꼬임)

### What to build

세션 이관용 신규 스킬. 기존 스킬 대비 구조 최소 — 검증(더블체크) 단계 없음 (이관 후 Claude 퇴장이므로 분류할 결과물이 없음, 용어집 **Transfer** 항목 참조).

- [x] Phase 구조: ANALYZE(화이트리스트: `--source <path>`, `--json`) → 실행(`transfer --json` 단발, Pattern A/B 불필요 — 동기 완료 ≤2분) → 결과 표출(**thread id와 `codex resume <id>` 명령을 원문 보존**해 표시). `plugins/codex-advisor/skills/codex-transfer/SKILL.md` 신규 작성 완료.
- [x] env 부재 + `--source` 부재 시: 명확한 에러 안내 — "공식 플러그인 enable 또는 `--source` 지정" (S3 완료 후엔 이 경로 자체가 사라짐). SKILL.md Errors 섹션에 반영.
- [x] `companion-usage.md` §2에 transfer 플래그 표 추가 (`--source` value / `--json` bool / `--cwd` value — `--cwd`는 usage 줄엔 미표기, handler `valueOptions`에만 존재함을 명기), §6에 에러 행 추가 완료:
  - `Could not identify the current Claude transcript` → setup/transcript-missing
  - `Codex can import Claude sessions only from` → bad-input (projects 밖 경로)
  - `Timed out waiting for Codex to finish importing` → wait-timeout (2분)
  - 동일 파일+동일 내용 재이관 → 기존 thread id 반환은 **정상 동작**(ledger dedup, 에러 아님)으로 문서화
  - **실제 라이브 호출로 발견한 추가 케이스**: `Codex CLI is not installed or is missing required runtime support.` (setup 카테고리) — companion은 정상 resolve되나 로컬에 `codex` CLI 바이너리 자체가 없을 때. transfer 전용 아님(다른 서브커맨드도 공유하는 `getCodexAvailability` 체크)이지만 이번에 처음 문서화.
- [x] README transfer 섹션 (rescue와의 차이 — 하청 vs 이민 — 한 줄 대비 포함), plugin.json/marketplace.json description의 skills 목록에 transfer 추가.
- [x] 버전 범프 **4.6.0** marketplace.json에 반영 (plugin.json엔 버전 필드 없음, 로컬 소스 플러그인 컨벤션).

### Acceptance criteria

- [~] 공식 플러그인 enabled 상태에서 `/codex-transfer` → `codex resume <id>` 명령 원문 보존 출력 — **부분 검증**. 이 환경엔 `codex` CLI 바이너리가 실제로 설치돼 있지 않아(`codex --version` 자체가 불가한 환경, S1에서도 동일 제약 기록) 성공 경로 끝까지 실행은 못 함. 대신 이 세션 자신의 transcript(`7b2e3786-...jsonl`)로 실제 `node codex-companion.mjs transfer --json --source <path>`를 라이브 실행해 두 에러 경로(`Could not identify...`, `Claude session file not found`, `Codex CLI is not installed...`)가 정확히 문서화한 문자열과 일치함을 실측 확인. 성공 경로(실제 thread 생성 + `codex resume` 출력)는 Codex CLI 설치된 환경에서 사용자가 직접 재확인 필요.
- [x] `--source <jsonl>` 수동 지정 경로 동작 — 라이브 확인 완료 (위 항목의 실제 호출에서 `--source`로 전달, 정상적으로 파일 존재/경로 검증 로직까지 도달).
- [x] 화이트리스트 밖 토큰 → 기존 §7 규칙대로 FATAL (companion에 전달 금지) — SKILL.md Phase 1 규칙으로 반영(정적 검토, companion 자체는 미사용 토큰을 무해하게 버림을 소스로 확인했으나 스킬은 여전히 whitelist 강제).
- [x] README·두 description에 transfer 반영
- [x] marketplace.json 4.6.0 (커밋 예정)

---

## S3 — 조건부 SessionStart hook (transcript env 자체 주입)

**Blocked by**: S2

### What to build

이 플러그인의 **첫 hook** — 착수 전 `docs/reference/gotchas.md` 정독 필수.

- [x] `hooks/hooks.json`: SessionStart 단일 항목, `timeout: 5`. 공식 플러그인 자체 hooks.json(1.0.5)과 동일하게 matcher 생략(전체 source 매칭).
- [x] hook 스크립트 로직 (`hooks/session-start.mjs`, 고정 코드, 조기탈출 순서 엄수):
  1. `CLAUDE_ENV_FILE` env 미설정 → exit 0
  2. env 파일에 `CODEX_COMPANION_TRANSCRIPT_PATH` 이미 존재 (공식 hook 선점 = enabled) → exit 0
  3. stdin JSON의 `transcript_path`가 존재하고 `.jsonl` → `export CODEX_COMPANION_TRANSCRIPT_PATH='<경로>'` 한 줄 append (공식과 동일 env 이름 — companion이 그대로 소비)
  4. stdout 출력 절대 없음 (SessionStart stdout은 컨텍스트 주입됨 — 토큰 0 유지)
- [x] 공식 hook은 env 3종(`CODEX_COMPANION_SESSION_ID`/`TRANSCRIPT_PATH`/`PLUGIN_DATA`)을 주입하지만 transfer의 소비처는 `CODEX_COMPANION_TRANSCRIPT_PATH` 1종뿐 (`lib/claude-session-transfer.mjs:21`이 유일한 소비 지점, 실소스로 재확인) — 우리 hook의 단일 env 주입으로 충분.
- [x] 실행 순서 레이스로 공식과 중복 기록돼도 무해 (같은 값, 마지막 export 승리) — 스크립트 주석엔 미기재, 이 이슈/ADR에만 기록(스크립트 주석엔 가드 순서·하드코딩 근거만).
- [x] S2의 "env 부재 시 수동 안내" 경로를 codex-transfer/SKILL.md·companion-usage.md에서 "기본 환경에선 hook이 보장하므로 미발생, `CLAUDE_ENV_FILE` 미지원 환경에서만 `--source` 폴백"으로 갱신 완료. 경로 자체는 삭제하지 않음(가드 1 때문에 여전히 도달 가능).

### Acceptance criteria

- [~] 공식 disabled → 새 세션 → `/codex-transfer` 인자 없이 전자동 동작 — **정적 + 단위 검증만**. 실제 새 Claude Code 세션을 띄워 SessionStart 이벤트가 발화하는 전체 E2E는 중첩 세션 제약으로 미실행. 대신 `hooks/session-start.mjs`를 5개 시나리오(env파일 없음 / 신규 작성 / 이미 존재-선점 / non-.jsonl / malformed JSON)로 직접 실행해 각 가드가 스펙대로 동작하고 모든 경로에서 stdout이 0바이트임을 실측 확인.
- [x] 공식 enabled → 우리 hook이 env 파일에 줄 추가 안 함 (선점 가드 동작 확인) — 위 시나리오 3("이미 존재")에서 실측: 기존 값(`/already/set.jsonl`)이 유지되고 새 값으로 덮어쓰지 않음.
- [x] codex 무관 세션에서 부작용 0 — stdout 없음, 즉시 종료 — 5개 시나리오 전부 stdout 0바이트, non-zero exit 없음 확인.
- [x] S2의 에러 안내 문구가 hook 반영으로 갱신됨 (`--source` 폴백 서술 유지, 삭제 아님) — codex-transfer/SKILL.md Phase 1 + Errors 섹션 갱신 완료.
- [x] `unset CLAUDECODE && claude plugin validate .` 통과 — 경고 11개(모두 기존 로컬 플러그인 버전 필드 무관 경고)뿐, 에러 없음.

---

## 전체 검증 절차

1. `claude plugin disable codex-advisor@claude-code-zero` 후 `claude --plugin-dir ./plugins/codex-advisor` 로컬 테스트 (캐시 승리 gotcha 회피)
2. 공식 enabled / disabled 두 상태 × `/codex-transfer` 각 1회 실제 이관 → `codex resume` 로 히스토리 보이는지 육안 확인
3. `unset CLAUDECODE && claude plugin validate .`

**진행 상황 (2026-07-04)**: 3번은 실행·통과(경고만, 에러 없음). 1·2번은 미실행 — 이 개발 환경엔 `codex` CLI 바이너리 자체가 없어(S1 acceptance criteria 4번과 동일 제약) 성공 경로(실제 thread 생성)를 끝까지 못 밟는다. 대신:
- companion `transfer` 서브커맨드 자체를 이 세션의 실제 transcript(`7b2e3786-...jsonl`)로 라이브 호출해 에러 경로 3종(transcript-missing, file-not-found, Codex CLI 미설치)이 문서화한 문자열과 정확히 일치함을 실측.
- `hooks/session-start.mjs`를 독립 실행해 가드 5개 시나리오 전부 통과.
남은 것: Codex CLI가 실제 설치된 환경에서 사용자가 1·2번을 직접 실행해 `codex resume <id>`까지 끝까지 확인.
