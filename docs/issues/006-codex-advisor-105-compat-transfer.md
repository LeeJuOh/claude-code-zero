# codex-advisor 1.0.5 대응: 인용 재검증 + transfer 래핑 (스킬 + 조건부 hook)

> 상태: 구현 대기 · 생성: 2026-07-04
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

`lib/codex.mjs`도 `:34`/`:43`/`:60` 부근 및 `:635` 이후 +88줄, `:961` 이후 +37줄 시프트 — `startThread` 인용(`:56-66`)과 `:916-921` 인용 재확인 필요.

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
- `plugins/codex-advisor/references/companion-usage.md` — 라인 인용 전체 + "verified against 1.0.4" → 1.0.5. §3의 upstream no-op 버그 서술에 "1.0.5에도 미수정" 명기
- `plugins/codex-advisor/skills/codex-setup/SKILL.md` (`:130` 부근 `codex-companion.mjs:684` 등)
- `plugins/codex-advisor/skills/codex-review/SKILL.md`, `codex-adversarial/SKILL.md` ("v1.0.4" 문구 + `lib/codex.mjs:56-66` 인용)
- `plugins/codex-advisor/README.md` (`:98, :131-132` — "v1.0.4+" 요구 문구는 유지하되 tested 도장 갱신)
- `docs/context/codex-advisor.md` — 본문 인용 (`codex-companion.mjs:239-245`, `:613-619`, `lib/args.mjs:48-49` 등) 재확인·갱신
- `plugins/codex-advisor/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — "Tested against codex@openai-codex 1.0.5 and Codex CLI <재확인한 버전>"

### Acceptance criteria

- [ ] `grep -rn "1\.0\.4" plugins/codex-advisor docs/context/codex-advisor.md` 잔존 = 버전 히스토리 서술("v1.0.4+에서 --model 전파" 류)뿐, 도장·verified-against 없음
- [ ] 갱신된 라인 인용 전수가 `references/codex-plugin-cc`(1.0.5) 실제 라인과 일치
- [ ] 두 description 모두 "Tested against codex@openai-codex 1.0.5"
- [ ] description의 Codex CLI 버전이 `codex --version` 실측값으로 구체 기재 (플레이스홀더 잔존 금지)
- [ ] review `--wait`/`--background` no-op 잔존 사실이 companion-usage.md §3에 반영

---

## S2 — `codex-transfer` thin 스킬

**Blocked by**: S1 (companion-usage.md가 1.0.5 기준이어야 transfer 표 추가가 안 꼬임)

### What to build

세션 이관용 신규 스킬. 기존 스킬 대비 구조 최소 — 검증(더블체크) 단계 없음 (이관 후 Claude 퇴장이므로 분류할 결과물이 없음, 용어집 **Transfer** 항목 참조).

- Phase 구조: ANALYZE(화이트리스트: `--source <path>`, `--json`) → 실행(`transfer --json` 단발, Pattern A/B 불필요 — 동기 완료 ≤2분) → 결과 표출(**thread id와 `codex resume <id>` 명령을 원문 보존**해 표시).
- env 부재 + `--source` 부재 시: 명확한 에러 안내 — "공식 플러그인 enable 또는 `--source` 지정" (S3 완료 후엔 이 경로 자체가 사라짐).
- `companion-usage.md` §2에 transfer 플래그 표 추가 (`--source` value / `--json` bool / `--cwd` value), §6에 에러 행 추가:
  - `Could not identify the current Claude transcript` → setup/transcript-missing
  - `Codex can import Claude sessions only from` → bad-input (projects 밖 경로)
  - `Timed out waiting for Codex to finish importing` → wait-timeout (2분)
  - 동일 파일+동일 내용 재이관 → 기존 thread id 반환은 **정상 동작** (ledger dedup, 에러 아님)으로 문서화
- README transfer 섹션 (rescue와의 차이 — 하청 vs 이민 — 한 줄 대비 포함), plugin.json/marketplace.json description의 skills 목록에 transfer 추가.
- 버전 범프 **4.6.0** (신규 스킬 = minor)을 이 슬라이스 커밋에 포함 ([[version-bump-with-fix]] — 기능이 들어가는 커밋이 범프를 진다). S1만 단독 릴리즈하게 되는 경우엔 S1에서 4.5.2 패치.

### Acceptance criteria

- [ ] 공식 플러그인 enabled 상태에서 `/codex-transfer` → `codex resume <id>` 명령 원문 보존 출력
- [ ] `--source <jsonl>` 수동 지정 경로 동작
- [ ] 화이트리스트 밖 토큰 → 기존 §7 규칙대로 FATAL (companion에 전달 금지)
- [ ] README·두 description에 transfer 반영
- [ ] marketplace.json 4.6.0 (이 커밋에 포함)

---

## S3 — 조건부 SessionStart hook (transcript env 자체 주입)

**Blocked by**: S2

### What to build

이 플러그인의 **첫 hook** — 착수 전 `docs/reference/gotchas.md` 정독 필수.

- `hooks/hooks.json`: SessionStart 단일 항목, `timeout: 5`.
- hook 스크립트 로직 (고정 코드, 조기탈출 순서 엄수):
  1. `CLAUDE_ENV_FILE` env 미설정 → exit 0
  2. env 파일에 `CODEX_COMPANION_TRANSCRIPT_PATH` 이미 존재 (공식 hook 선점 = enabled) → exit 0
  3. stdin JSON의 `transcript_path`가 존재하고 `.jsonl` → `export CODEX_COMPANION_TRANSCRIPT_PATH='<경로>'` 한 줄 append (공식과 동일 env 이름 — companion이 그대로 소비)
  4. stdout 출력 절대 없음 (SessionStart stdout은 컨텍스트 주입됨 — 토큰 0 유지)
- 실행 순서 레이스로 공식과 중복 기록돼도 무해 (같은 값, 마지막 export 승리) — 스크립트 주석 아닌 이 이슈/ADR에만 기록.
- S2의 "env 부재 시 수동 안내" 경로를 "기본 환경에선 hook이 보장하므로 미발생, `CLAUDE_ENV_FILE` 미지원 환경에서만 `--source` 폴백"으로 갱신. **경로 삭제 금지** — 가드 1(`CLAUDE_ENV_FILE` 미설정 → exit 0) 때문에 여전히 도달 가능한 케이스.

### Acceptance criteria

- [ ] 공식 disabled → 새 세션 → `/codex-transfer` 인자 없이 전자동 동작
- [ ] 공식 enabled → 우리 hook이 env 파일에 줄 추가 안 함 (선점 가드 동작 확인)
- [ ] codex 무관 세션에서 부작용 0 — stdout 없음, 즉시 종료
- [ ] S2의 에러 안내 문구가 hook 반영으로 갱신됨 (`--source` 폴백 서술 유지, 삭제 아님)
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

---

## 전체 검증 절차

1. `claude plugin disable codex-advisor@claude-code-zero` 후 `claude --plugin-dir ./plugins/codex-advisor` 로컬 테스트 (캐시 승리 gotcha 회피)
2. 공식 enabled / disabled 두 상태 × `/codex-transfer` 각 1회 실제 이관 → `codex resume` 로 히스토리 보이는지 육안 확인
3. `unset CLAUDECODE && claude plugin validate .`
