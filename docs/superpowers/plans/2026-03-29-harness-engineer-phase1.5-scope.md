# Harness Engineer Phase 1.5 Scope

> Phase 1에서 명시적으로 deferred된 항목 + 브레인스토밍에서 도출된 항목 정리.
> Phase 1 완료 후, Phase 2 (계약 기반 평가) 전에 진행.

**Phase 1 plan**: `2026-03-28-harness-engineer-phase1.md`
**Redesign spec**: `docs/superpowers/specs/2026-03-27-harness-engineer-redesign.md`

---

## Deferred from Phase 1

### 1. Cross-platform export (AGENTS.md, GEMINI.md)

**Source**: Phase 1 plan — Map architecture section

현재 `.harness/map.md`가 CC 전용 (`CLAUDE.md`에 `@.harness/map.md` import). Codex는 `AGENTS.md`, Gemini는 `GEMINI.md`를 읽으므로 export 필요.

**Scope**:
- `/harness init`이 `.harness/map.md` → `AGENTS.md`, `GEMINI.md`로 export
- map.md 변경 시 자동 sync (PostToolUse hook 또는 manual)
- `.harness/map.md`가 single source of truth, export는 파생본

### 2. Context budget enforcement (P14)

**Source**: Phase 1 plan — Scope section

`context_budget_percent` config는 Phase 1에서 placeholder로 존재. 실제 강제는 미구현.

**Scope**:
- SessionStart hook에서 전체 instruction 토큰 추정 (CLAUDE.md + map.md + 기타)
- context window의 N% 초과 시 경고
- 어떤 파일이 예산을 초과하는지 구체적으로 지적

### 3. PostToolUse(Bash) linter hook

**Source**: Phase 1 plan — Scope section

Bash 실행 후 린터 결과를 자동 피드백하는 hook.

**Scope**:
- `PostToolUse(Bash)` hook에서 test/lint 명령 감지
- 실패 시 에러 요약을 context에 주입
- config에서 린터 명령 지정 가능

### 4. map.md ↔ directory structure sync (Stop hook)

**Source**: Phase 1 plan — File Structure (stop-sync-check.sh commented out)

Stop agent hook에서 map.md가 현재 디렉토리 구조를 반영하는지 체크. Phase 1의 Stop hook 프롬프트에 이미 포함되어 있으나, 전용 스크립트(`stop-sync-check.sh`)는 미구현.

**Scope**:
- Stop agent hook을 전용 command hook으로 분리 (agent hook은 비용이 높음)
- 실제 디렉토리 구조와 map.md 내용 비교 로직

---

## From Brainstorming (2026-03-29)

### 5. SessionStart structure fingerprint (map drift detection)

**Source**: Brainstorming — "다른 플러그인이 쓴 문서도 맵에 반영되게 유도"

다른 플러그인(Superpowers 등)이 `docs/superpowers/` 같은 경로에 문서를 생성할 때, map.md가 이를 모르는 상태가 됨. SessionStart에서 감지 필요.

**Approach**:
- `.harness/structure.sha` — 디렉토리 구조의 해시 (fingerprint)
- `/harness init`과 `/harness organize` 실행 시 fingerprint 갱신
- SessionStart hook에서 현재 fingerprint와 비교, 다르면 경고
- `find . -type d -maxdepth 2 | sort | shasum` (빠르고 파싱 불필요)

**Why not in Phase 1**: Stop hook의 agent 체크가 "작업 중 생긴 drift"는 이미 잡음. SessionStart는 "세션 간 drift" (다른 세션/수동 변경)를 잡는 것으로, 우선순위가 낮음.

---

## Context: Positioning

harness-zero는 **Outer Loop + Orchestration Loop bridge**:
- Outer Loop: 레포 환경 세팅 + 유지 (init, organize, SessionStart/PreToolUse hooks)
- Orchestration bridge: 레포에 내장된 hooks가 orchestration 규율을 deterministic하게 강제 (Stop QA gate, reviewer.md)

Phase 1.5는 Outer Loop의 완성도를 높이는 항목들. Phase 2에서 Orchestration Loop로 본격 확장 (계약 기반 평가).

참고: Codagent 같은 독립 런타임과는 다른 레이어 — harness-zero는 CC 플러그인으로서 "설치만 하면 자동" 배포 모델 유지.

**Reference**: `Slot Machines and Safety Nets` (codagent.beehiiv.com, 2026-03-24) — 3중 루프 모델 (Outer/Orchestration/Inner)
