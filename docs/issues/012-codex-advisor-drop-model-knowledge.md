# 이슈 012 — codex-advisor 모델 지식 폐기 구현 (슬라이스 S1~S3)

> 상태: **ready-for-agent** — 구현 착수 전 · 생성: 2026-07-17
> 스펙 (PRD): `docs/specs/012-codex-advisor-drop-model-knowledge.md` — 문제 정의, 유저 스토리,
> 구현/테스트 결정, 확정 사실표 전부 스펙 참조
> 대상 플러그인: `plugins/codex-advisor/` (v4.6.2 → v4.7.0)
> Seam: `scripts/apply-codex-config.py`의 CLI 경계 단일. `HOME`을 임시 디렉터리로 돌려 검증 —
> codex 실행 불필요. 훅·프롬프트·companion 호출 무변경.
> 용어집: `docs/context/codex-advisor.md` — **Model/effort routing** 절

## Slices (tracer bullets)

각 슬라이스는 단독 데모/검증 가능. 의존 순서: S1 → S2 → S3.

### S1 — 캐시 읽기·검증 삭제 (스토리 1, 2, 3, 8, 9, 10, 11, 12)

**What to build**: `scripts/apply-codex-config.py`에서 codex 지식 판정을 전부 제거 — `STANDARD_EFFORTS`
상수, `~/.codex/models_cache.json` 조회, "not in local cache" 경고, 모델별 `supported_reasoning_levels`
대조 경고, `default_reasoning_level` 공시, 딸린 `import json`·독스트링. `MODEL_ALIASES`(`spark`)는
유지 — 판정이 아니라 편의이고, 틀리면 codex가 실행 시점에 잡는다(스펙 D2). TOML 읽기/원자적 쓰기,
stdout 한 줄 포맷은 계약이므로 불변. 163줄 → 100줄 안팎(75줄 맞추려 계약 코드 더 지우지 말 것).

**Acceptance criteria** (seam은 positional — `apply-codex-config.py "<model>" "<effort>"`. 아래
`--model`/`--effort`는 스킬 계층 표기이고, 스크립트 직접 검증 시 빈 문자열 인자 사용):
- [ ] effort `ultra` (`apply-codex-config.py "" ultra`) — stderr 비어 있고 config.toml에 `model_reasoning_effort = "ultra"`
- [ ] model `gpt-5.6-sol` (캐시에 없는 슬러그) — stderr 비어 있고 그대로 저장
- [ ] model `spark` → `gpt-5.3-codex-spark`로 확장 저장 (별칭 회귀)
- [ ] 캐시 파일을 심어둔 상태와 없는 상태의 출력이 **동일** — 캐시 의존 소멸 증명
- [ ] `model_context_window` 등 기존 키 원문 보존 + 원자적 쓰기 유지
- [ ] config.toml 없음 / 파손 / 빈 파일 — 크래시 없이 생성·저장
- [ ] stdout `Model: <before> -> <after> | Effort: <before> -> <after>` 포맷 불변 (스킬이 verbatim relay)
- [ ] 인자 개수 오류 시 기존대로 exit 2
- [ ] `grep -rn 'models_cache\|STANDARD_EFFORTS' plugins/codex-advisor/` = 0건

**Blocked by**: None — can start immediately.

### S2 — 유저 대면 문서에서 목록·"tested against" 제거 (스토리 4, 5, 6, 7, 14, 15)

**What to build**: README·`skills/codex-setup/SKILL.md`·`skills/codex-rescue/SKILL.md`에서 모델 슬러그
목록과 effort 목록을 삭제하고 조회 안내(`/model`)로 교체. **"the script surfaces both an effort-set
warning and a model-specific support warning" 문장은 S1 직후 거짓이 되므로 반드시 제거.** 예시 명령의
슬러그는 1개(`gpt-5.6-sol`)만 — 예시지 호환성 주장 아님. "tested through 1.0.5" / "Tested against
Codex CLI 0.125" 삭제. **최소 요구 버전(companion 1.0.4+, `/codex-transfer` v1.0.5+)은 유지** — 유저가
행동하는 진짜 계약이다(스펙 D4의 ①/② 구분). **범위 밖**: `references/companion-usage.md`,
`hooks/session-start.mjs` 주석, `codex-transfer` SKILL의 버전 표기 — 버전 핀 문서/실측 주석/최소
요구라 남긴다(스펙 D4 "②가 아닌 것", S3 허용 잔존).

**Acceptance criteria**:
- [ ] 세 문서에 모델/effort 목록 없음 — 대신 `/model` 조회 안내
- [ ] 없어진 경고를 기술하는 문장이 남아 있지 않음
- [ ] `grep -rn 'Tested against\|tested through' plugins/codex-advisor/` = 0건
- [ ] README Prerequisites에 최소 요구 버전(1.0.4+, transfer 1.0.5+)이 **남아 있음** — ②만 지우고
      ①을 같이 지우지 않았는지 확인
- [ ] 예시 명령의 모델 슬러그가 고유값 1종(`gpt-5.6-sol`) — 등장 위치 여러 곳이어도 전부 같은 값

**Blocked by**: S1 — 문서가 S1 이후의 동작(경고 없음)을 기술하므로.

### S3 — 매니페스트·용어집·AGENTS.md·메모리·버전 (스토리 13, 16, 17)

**What to build**: `plugin.json`·`marketplace.json` **양쪽** description에서 `(gpt-5.5)` 제거,
`plugin.json` keywords에서 `"gpt-5.5"` 제거(AGENTS.md 규칙 — description은 두 곳 동시 갱신).
용어집 **Model/effort routing** 절에 "판정하지 않는다" 원칙 한 줄 추가(다음 에이전트가 검증을
되살리지 않게), **Provenance debt** 절의 `"our default model is gpt-5.5"` 근거 제거 — 두 겹으로
틀렸다(두 세대 뒤처졌고, 애초에 플러그인엔 default model이 없다). `AGENTS.md`의 Codex 문서 링크를
`https://learn.chatgpt.com/docs/llms.txt`로(정밀 사실은 스펙 D6 — 구 llms.txt는 200 생존, 308은
페이지 단위). `marketplace.json` 4.6.2 → 4.7.0.
`feedback_audit_scope` 메모리에 D4 판례 반영 — 안 하면 다음 세션이 도장을 다시 찍는다.

**Acceptance criteria**:
- [ ] `grep -rn 'gpt-5\.5\|gpt-5\.4\|gpt-5\.2\|0\.125\|1\.0\.5' plugins/codex-advisor/` — 허용 잔존만:
      ① 최소 요구 버전 — README의 `v1.0.5+`, `codex-transfer` SKILL의 "older than 1.0.5"
      ② `references/companion-usage.md` 전체 — 라인 번호까지 companion 1.0.5에 핀된 해부 문서,
         버전 표기가 유효성 조건(스펙 D4 "②가 아닌 것")
      ③ `hooks/session-start.mjs`의 1.0.5 주석 — 특정 버전 실측 기록
      그 외 0건. (`gpt-5.3-codex-spark`는 이 패턴에 안 걸림 — 잔존 목록에 불필요)
- [ ] `grep -rn 'developers\.openai\.com' . --exclude-dir=docs --exclude-dir=.git` = 0건
- [ ] 용어집에 "판정하지 않는다" 원칙 존재; Provenance debt에 gpt-5.5 근거 없음
- [ ] `marketplace.json` 버전 4.7.0
- [ ] `feedback_audit_scope` 메모리에 D4 판례 반영됨
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

**Blocked by**: S1, S2.
