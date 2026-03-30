# Harness Engineer — 참고 프로젝트 맵 v2

> 재설계 명세(`2026-03-27-harness-engineer-redesign.md`)의 **4층 구조**에 맞춰 매핑한 문서.
> 이전 맵(`harness-engineer-reference-map.md`)은 Phase 1~3 구조 기준이므로 참고용으로만 사용.

**분석 기준**: 2026-03-27 기준 `references/` 폴더 80+ 프로젝트 전수 스캔 + 기존 맵 20개 더블체크.
**범위**: 전수 스캔에서 35개를 상세 분석. 나머지는 harness-engineer와 관련성이 낮아 제외.

---

## 1. 4층 구조 × 참고 프로젝트 매핑

### 1층: 세팅 — `/harness init`

> 에이전트 친화적 레포의 "올바른 시작점"을 제공한다.

| 기능 | 참고 프로젝트 | 참고 포인트 | 참고 가치 |
|------|-------------|------------|----------|
| 레포 분석 → 구조 추천 | [aidlc-workflows] | 복잡도에 따른 적응형 검사 깊이. 3단계 워크플로우 (Inception→Construction→Operations) | ★★★ |
| 레포 분석 → 구조 추천 | [OpenSpec] | `openspec/changes/` 폴더 구조. proposal→spec→design→tasks 아티팩트 레이아웃 | ★★★★ |
| AGENTS.md 맵 생성 | [agents.md] | AGENTS.md 오픈 포맷 표준. 원칙 4의 근거 표준 | ★★★ |
| architecture.yaml 세팅 | [gitagent] | **RULES.md 하드 제약** (must-always/must-never) + **DUTIES.md 직무분리** (conflict matrix, enforcement level). 에이전트 정의의 가장 구조화된 형태 | ★★★★★ |
| architecture.yaml 세팅 | [agent-harness] | **자율성 레벨 L0-L3** (observe-only → low-risk → medium-risk → high-risk+human-review). 거버넌스 계층: 원칙→레벨→체크리스트 | ★★★★★ |
| reviewer.md 세팅 | [Spec Kit] | Constitution(프로젝트 원칙 정의) + 6단계 파이프라인. 채점 루브릭 구조 참고 | ★★★ |
| docs/plans/ 세팅 | [get-shit-done] | **`.planning/` 상태 디렉토리**: PROJECT.md, STATE.md, REQUIREMENTS.md, ROADMAP.md, decisions/, todos/, threads/, seeds/. 계획 상태 추적의 가장 성숙한 구현 | ★★★★★ |
| docs/decisions/ 세팅 | [Spec Kit] | Constitution + 기술 결정 기록 패턴 | ★★★ |
| issues/ 세팅 | [Backlog.md] | YAML 프론트매터, 자동 증가 ID (BACK-1), Definition of Done 체크리스트 | ★★★★★ |
| 3단계 계층적 로딩 구조 | [OpenViking] | **파일시스템 패러다임 컨텍스트 관리**: L0 추상 → L1 개요 → L2 상세. 원칙 14(점진적 노출) 구조의 참고 모델 | ★★★★ |
| 에이전트 CI/CD | [gitagent] | `gitagent validate`를 GitHub Actions에 넣어 에이전트 품질을 코드 품질처럼 관리. 브랜치 기반 에이전트 배포 (dev→staging→main) | ★★★★ |
| 스킬 품질 게이트 | [skill-doctor] | 스킬 정적 분석 + 0-100 품질 점수. 프론트매터 이슈, 깨진 참조, 약한 트리거, eval 스키마 검증 | ★★★★ |

### 2층: 유지 — 훅으로 원칙 실시간 강제/유도

> 1층에서 세팅한 환경이 시간이 지나도 자동으로 유지되게 한다.

| 기능 | 참고 프로젝트 | 참고 포인트 | 참고 가치 |
|------|-------------|------------|----------|
| SessionStart 훅 전체 | [compound-engineering] | 동일 형태(CC 플러그인)의 훅 구현 패턴. 네임스페이스 컨벤션 (`<plugin>:<category>:<agent>`) | ★★★ |
| SessionStart 훅 전체 | [claude-code-infrastructure-showcase] | **훅 기반 스킬 자동 활성화** (UserPromptSubmit, PostToolUse) + skill-rules.json. 6개월 실전 검증된 패턴 | ★★★★ |
| AGENTS.md 크기 감시 | [claude-code-organizer] | `@import` 확장 + HTML 주석 제거를 통한 상시 로드 vs 지연 토큰 측정. **ai-tokenizer ~99.8% 정확도** + bytes/4 폴백 | ★★★★★ |
| 컨텍스트 예산 감시 | [claude-code-organizer] | **11개 카테고리 컨텍스트 예산 분석** (skills, memories, MCP servers, rules, commands, agents, configs, hooks, plugins, plans, sessions). 항목별 토큰 어트리뷰션 (always-loaded vs deferred) | ★★★★★ |
| 컨텍스트 예산 감시 | [claude-devtools] | **7카테고리 토큰 브레이크다운** (CLAUDE.md, 언급 파일, 도구 출력, 확장 사고, 팀 조정, 사용자 메시지, 스킬). 컨텍스트 압축 시각화 (fill→compress→refill 사이클) | ★★★★★ |
| PreToolUse 아키텍처 검사 | [DeerFlow] | 스킬 온디맨드 로딩 패턴 (원칙 14). 런타임 강제 메커니즘 | ★★ |
| PreToolUse 아키텍처 검사 | [gstack] | **안전 가드레일 온디맨드**: `/careful` (파괴 명령 경고), `/freeze` (디렉토리 잠금), `/guard` (둘 다). 위험도별 가드레일 활성화/비활성화 | ★★★★ |
| PostToolUse 린터 확인 | [harness-kit] | "No Slop" 교리 — AI 출력이 사람 코드 품질 기준을 충족하도록 강제. 에이전트 친화적 에러 형식 | ★★★★ |
| 훅 엄격도 프로필 | [everything-claude-code] | **standard/strict/lenient** 훅 강제 레벨 + per-hook disable list | ★★★★ |
| 훅 엄격도 프로필 | [mission-control] | **Hook profiles** (minimal/standard/strict). 보안 감사 레벨에 따른 조절 | ★★★★ |
| 컨텍스트 요약 전략 | [DeerFlow] | **점진적 스킬 로딩** + 완료된 작업 자동 요약 + 중간 결과 파일시스템 오프로드. 컨텍스트 비대화 방지 | ★★★★ |
| 패턴 학습 → 훅화 | [everything-claude-code] | **인스팅트 시스템**: 프롬프트 패턴 학습 → 자동 라우팅 → 스킬화. 패턴이 반복되면 훅으로 승격 | ★★★★ |
| Hook 라이프사이클 | [agent-swarm] | 4 이벤트 (SessionStart, PreToolUse, PostToolUse, Stop) + Workflow DAG with 구조화된 I/O 스키마 | ★★★★ |
| 하네스 최신성 경고 | [gitagent] | **에이전트 버전 관리 via git**: 에이전트 변경도 코드 변경처럼 브랜치+PR. 하네스 변경 이력 추적 | ★★★ |

### 3층: 평가 — 계약 기반 자동 평가

> 만든 놈이 아닌 별도의 평가자가, 사전에 합의된 기준으로 검증한다.

| 기능 | 참고 프로젝트 | 참고 포인트 | 참고 가치 |
|------|-------------|------------|----------|
| 평가자 분리 (전체) | [mission-control] | **4층 에이전트 평가 프레임워크**: output evals (태스크 완료 vs golden datasets), trace evals (수렴/루프 감지), component evals (도구 신뢰도 p50/p95/p99 레이턴시), drift detection (4주 롤링 베이스라인 대비 10% 임계). **가장 정교한 평가 구현** | ★★★★★ |
| 평가자 분리 (전체) | [harness-kit] | **Reflection 리포트 6-part**: quality_assessment, slop_detection, improvements, agent_optimization, verdict, verdict_summary. TDD 강제 프리셋: test→implement→verify 게이트 with 컨텍스트 격리 | ★★★★★ |
| 계약 항목 1:1 검증 | [uditgoenka-autoresearch] | **기계적 메트릭 전용 검증** + 원자적 단일 변경 규율 + git as memory (커밋 후 검증) + 자동 롤백. 8가지 핵심 규율 | ★★★★ |
| 계약 항목 1:1 검증 | [pi-autoresearch] | 자율 최적화 루프 + MAD 기반 신뢰도 점수 + 백프레셔 검증 (회귀 방지) | ★★★ |
| Guard 분리 (회귀 검사) | [uditgoenka-autoresearch] | "기준을 충족하나?" (품질)와 "다른 게 깨졌나?" (회귀)를 분리. 두 관심사를 하나의 검사에 섞지 않음 | ★★★★ |
| Stuck 감지 | [uditgoenka-autoresearch] | 연속 N회 실패 → 접근 방식 자체를 재분석. 같은 실수 반복 방지 | ★★★★ |
| 재실행 루프 | [oh-my-claudecode] | **team-plan→prd→exec→verify→fix** bounded loop. 검증 실패 → 자동 진단 에이전트 → fix 계획 생성 → 재실행. 자동 모델 라우팅 (Haiku/Sonnet/Opus) | ★★★★★ |
| 재실행 루프 | [Chorus] | **Reversed Conversation** (AI 제안→사람 검증). 제안→승인→실체화 패턴: 드래프트는 승인 전까지 실체가 되지 않음. 요구사항 정교화 게이트 | ★★★★ |
| Trust 점수화 | [mission-control] | **Trust scoring 0-100** with posture metrics. 자율성 레벨을 정량적으로 추적 | ★★★★★ |
| 안티게이밍 | [desloppify] | **안티게이밍 점수 설계**: 에이전트가 메트릭을 조작하는 것을 방지. 기계적+LLM 하이브리드 분석 | ★★★★ |
| 결정론적 평가 파이프라인 | [gitagent] | **SkillsFlow**: YAML 기반 multi-step 워크플로우 (`skill:`, `agent:`, `tool:` 스텝), 의존성 순서, `${{ }}` 템플릿 데이터 흐름 | ★★★★ |
| 스킬 체이닝 | [gstack] | **출력→입력 연쇄**: `/office-hours` → design doc → `/plan-ceo-review` → `/plan-eng-review` → test plan → `/qa`. 이전 단계 출력을 다음 단계가 읽음 | ★★★★ |
| 에이전트 디스패치 | [Symphony] | Linear 이슈 폴링 → 격리된 에이전트 스폰 → PR 제출. **WORKFLOW.md-as-policy**: 에이전트 행동을 레포에 버전 관리 | ★★★ |
| 에이전트 디스패치 | [baton] | **이슈 폴링→워크스페이스 스폰→워크플로우 프롬프트 주입→라이프사이클 관리** (Go). tracker 통합 via 도구 주입 | ★★★★ |
| 에이전트 디스패치 | [agent-orchestrator] | **병렬 워크트리 격리 per task** + 자동 피드백 라우팅 (CI 실패, 리뷰 코멘트 → 에이전트). 에이전트/런타임/트래커 교체 가능 플러그인 아키텍처 | ★★★★★ |
| 이슈→에이전트→PR | [Linear-Coding-Agent-Harness] | 2-에이전트 패턴 (initializer + coding agent). 세션 상태를 이슈 코멘트로 영속. 보안 allowlist 모델 | ★★★★ |
| 멀티에이전트 조정 | [ccg-workflow] | **멀티모델 라우팅** (Claude=오케스트레이터, Codex=백엔드, Gemini=프론트). 품질 게이트 via 스킬. 제로-config 모델 라우팅 | ★★★★ |
| 학습 루프 | [hermes-agent] | **폐쇄 루프 학습**: 경험→스킬→개선. FTS5 세션 검색 + LLM 요약. 서브에이전트 병렬화 | ★★★★ |
| 커밋 후 검증 | [uditgoenka-autoresearch] | git commit 먼저 → 검증 → 실패 시 revert (이력 보존). reset이 아닌 revert로 학습 가능 | ★★★★ |

### 4층: 인터페이스 — 대시보드

> 사람이 하네스 시스템을 조종하는 곳.

| 기능 | 참고 프로젝트 | 참고 포인트 | 참고 가치 |
|------|-------------|------------|----------|
| 대시보드 서버 아키텍처 | [claude-code-organizer] | **무의존성 Node.js + 순수 HTML/CSS/JS**, SSE 하트비트 자동종료, 포트 충돌 재시도, REST API (`/api/scan`, `/api/move` 등). 경로 순회 보안. Undo/restore 지원 | ★★★★★ |
| 대시보드 기능 범위 | [mission-control] | 32패널, 101 REST 엔드포인트, WebSocket/SSE. Phase 2~3 기능을 이미 구현. **Skills Hub 보안 스캐너** (프롬프트 인젝션, 자격 증명 유출, 데이터 유출 감지) | ★★★★★ |
| 칸반 UI | [Backlog.md] | 반응형 웹 칸반 + 드래그앤드롭 상태 변경. Bun+TypeScript. TUI+웹 이중 인터페이스 | ★★★★★ |
| 칸반 UI | [vibe-kanban] | React+Vite+Tailwind 칸반. **에이전트별 워크스페이스** (git branch + terminal + dev server). **인라인 diff 리뷰** (대시보드에서 에이전트에 직접 피드백). 10+ 에이전트 지원. 워크트리 자동 정리 | ★★★★ |
| 토큰 시각화 | [claude-devtools] | **7카테고리 토큰 브레이크다운**. 서브에이전트 트리 시각화 (재귀적 중첩, 에이전트별 메트릭). **알림 트리거** (정규식 기반 규칙으로 `.env` 접근 등 예외 모니터링). 세션 압축 감지 (fill→compress→refill) | ★★★★★ |
| 준수 이력 차트 | [proofshot] | standalone `viewer.html` — 타임라인 스크러빙, 로그 동기화. **세션 메타데이터 영속** (git branch/commit 매핑). 에러 패턴 감지 (10+ 언어). 검증 리포트 번들링 (SUMMARY.md + viewer.html + 콘솔/서버 로그 탭) | ★★★★ |
| 정적 HTML 리포트 | [visual-explainer] | 무의존성 자체완결 HTML (Mermaid, Chart.js, CSS Grid). **자동 콘텐츠 라우팅** (플로우차트→Mermaid, 아키텍처→CSS Grid, 데이터→테이블, 대시보드→Chart.js). 슬라이드 덱 모드. Vercel 배포 | ★★★★ |
| 지식 맵 | [Understand-Anything] | **멀티에이전트 파이프라인** (5 전문 에이전트 순차, 파일 분석은 3 병렬). **증분 업데이트** (변경 파일만 재분석). **페르소나 적응형 UI** (주니어/PM/파워유저별 상세 수준 조절). 가이드 투어 (의존성 순서로 코드베이스 학습) | ★★★★★ |
| 지식 맵 | [GitNexus] | **코드베이스 지식 그래프** (Tree-sitter AST → LadybugDB 그래프). MCP 7개 도구 (query, impact, context, rename, cypher). 멀티레포 레지스트리. diff 임팩트 분석 | ★★★★ |
| 에이전트 활동 | [mission-control] | 에이전트별 비용/토큰 추적, 태스크 타임라인 | ★★★★ |
| MCP 서버 | [claude-code-organizer] | REST API를 MCP 도구로 노출하는 패턴 | ★★★★ |
| MCP 서버 | [mission-control] | 35개 MCP 도구. `claude mcp add` 통합 방식 | ★★★★ |

---

## 2. 주요 참고 프로젝트 상세 (관련도순)

유사도(제품 공간 겹침)와 참고 가치(기술적/설계적 유용성)를 구분한다.

### Tier 1: 핵심 참고 (★★★★★)

#### [claude-code-organizer] — 대시보드 기술 청사진

- **핵심**: `~/.claude/` 시각적 구성 관리자 + 컨텍스트 예산 분석기
- **기술**: 무의존성 Node.js + 순수 HTML/CSS/JS, REST API, SSE 하트비트
- **더블체크 발견**: ai-tokenizer ~99.8% 정확도, 11개 카테고리 컨텍스트 예산, 스코프 상속 추적 (Global→Workspace→Project), 항목별 토큰 어트리뷰션, Undo/restore, 경로 순회 보안
- **기여 층**: 2층 (컨텍스트 감시), 4층 (대시보드 아키텍처 전체)

#### [mission-control] — 평가 프레임워크 + 기능 범위 참고

- **핵심**: 에이전트 오케스트레이션 대시보드. 32패널, 101 REST, MCP 35도구
- **기술**: Next.js 16 + SQLite + WebSocket/SSE
- **더블체크 발견**: **4층 평가 프레임워크** (output/trace/component/drift), Trust scoring 0-100, Skills Hub 보안 스캐너, Hook profiles (minimal/standard/strict), Agent SOUL 양방향 동기화
- **기여 층**: 3층 (평가 프레임워크), 4층 (대시보드 기능 범위)

#### [harness-kit] — 풀스택 에이전트 오케스트레이션 참고

- **핵심**: DAG 기반 멀티에이전트 오케스트레이션 + 19개 원칙(Tenet) + TaskIt 칸반 UI
- **CLI**: Odin (30+ 명령: plan, assign, exec, reflect, watch, logs, stop, attach 등)
- **기술**: Python + Django + React/TypeScript + Celery. 8 provider 지원 (Claude, Gemini, Codex, Qwen, GLM, MiniMax, Kilo Code, OpenCode)
- **더블체크 발견**: **19개 원칙** (Determinism, Pareto-Driven Delegation, Cost Visibility, Proof of Work, Reflection Loops 등), **Reflection 리포트 5-part** (Quality Assessment→Slop Detection→Improvements→Agent Optimization→Verdict), Wave DAG 병렬실행 (세마포어 4동시), **비용 인식 위임** (최저가 capable 에이전트 자동 배정), TaskIt MCP (blocking questions: 에이전트가 사람에게 질문하며 대기), TDD 강제 프리셋 (dk-test-writer 에이전트: 구현 컨텍스트 없이 행위 요구사항만 받음)
- **기여 층**: 2층 (교리 강제, 비용 인식), 3층 (리플렉션 감사), 4층 (TaskIt 칸반+DAG 시각화)
- **경쟁 관계**: 에이전트 "작업" 오케스트레이션 도구. 레포 환경 자체를 분석/개선하지 않으므로 Harness Engineer와 직접 경쟁보다는 보완 관계

#### [agent-harness] — 거버넌스 골격

- **핵심**: 7가지 원칙 + 체크리스트 + 불변조건
- **더블체크 발견**: **자율성 레벨 L0-L3** (observe→low-risk→medium→high+human-review), 거버넌스 계층 (원칙→레벨→체크리스트→프롬프트), OpenClaw 특화 거버넌스 (workspace-health, config-drift)
- **기여 층**: 1층 (구조 세팅), 2층 (자율성 레벨 기반 훅 트리거)

#### [Backlog.md] — 이슈 관리 청사진

- **핵심**: 마크다운 네이티브 태스크 매니저 + TUI/웹 칸반
- **기술**: Bun+TypeScript, `backlog/` 폴더에 `.md` 파일
- **기여 층**: 1층 (이슈 형식), 4층 (칸반 UI)

#### [agent-orchestrator] — 에이전트 디스패치 참고

- **핵심**: 병렬 에이전트 관리, 격리 워크트리, 피드백 라우팅
- **기술**: 에이전트/런타임/트래커 교체 가능 플러그인 아키텍처
- **기여 층**: 3층 (에이전트 디스패치, 피드백 라우팅)
- **참고 맵 v1에 없었음**

#### [claude-devtools] — 관측성 참고

- **핵심**: Claude Code 세션 실행 추적 시각화
- **기술**: Electron + React + SSE
- **더블체크 발견**: **7카테고리 per-turn 토큰 브레이크다운**, 서브에이전트 트리 시각화, 세션 압축 감지, **알림 트리거** (정규식 기반), SSH 원격 세션, 커스텀 트리거 패턴
- **기여 층**: 2층 (토큰 시각화), 4층 (대시보드 관측성)

#### [Understand-Anything] — 지식 맵 참고

- **핵심**: 코드베이스→지식 그래프 대시보드
- **더블체크 발견**: **멀티에이전트 파이프라인** (5 전문 에이전트), 증분 업데이트, **페르소나 적응형 UI**, 가이드 투어 (의존성 순서), Fuzzy + 시맨틱 검색, diff 임팩트 분석
- **기여 층**: 4층 (지식 맵, 적응형 UI)

### Tier 2: 중요 참고 (★★★★)

#### [gitagent] — 원칙 구조화 참고

- **핵심**: Git-native 에이전트 포맷 (agent.yaml + SOUL.md + RULES.md), 12 플랫폼 어댑터
- **더블체크 발견**: **RULES.md 하드 제약** + **DUTIES.md 직무분리** + **SkillsFlow 결정론적 워크플로우** + Knowledge tree (계층적 엔티티 + 임베딩) + CI/CD for agents + 에이전트 포킹/리믹싱
- **기여 층**: 1층 (RULES/DUTIES 패턴), 3층 (SkillsFlow 평가 파이프라인)

#### [get-shit-done] — 계획 + 실행 참고

- **핵심**: 스펙 주도 + 컨텍스트 엔지니어링. Wave 기반 병렬 실행
- **더블체크 발견**: **`.planning/` 상태 디렉토리** (7종 파일), XML 프롬프트 포맷, Wave 기반 병렬화, 원자적 git 커밋 (git bisect 지원), UI 단계 계약 (UI-SPEC.md), 마일스톤 사이클, 워크스트림, Persistent threads
- **기여 층**: 1층 (.planning/ 구조), 3층 (Wave 병렬화, 원자적 커밋)

#### [oh-my-claudecode] — 재실행 루프 + 모델 라우팅

- **핵심**: 멀티에이전트 파이프라인. 32+ 에이전트, 매직 키워드
- **더블체크 발견**: **자동 모델 라우팅** (Haiku/Sonnet/Opus), **재실행 루프** (team-fix), 스킬 학습 + 품질 게이트, HUD statusline, OpenClaw 웹훅 통합, 비용 추적, 레이트 리밋 자동 재개
- **기여 층**: 3층 (재실행 루프, 모델 라우팅)

#### [everything-claude-code] — 훅 자동화 + 인스팅트

- **핵심**: 28에이전트 + 125스킬 + 60명령
- **더블체크 발견**: **인스팅트 시스템** (패턴 학습→자동 라우팅→스킬화), 훅 엄격도 프로필 (standard/strict/lenient + per-hook disable), `/harness-audit` 명령 (이름 충돌 주의), 언어별 규칙
- **기여 층**: 2층 (훅 자동화, 인스팅트), 3층 (/harness-audit 참고)

#### [gstack] — 스킬 체이닝 + 가드레일

- **핵심**: 7단계 스프린트, 28 스킬, Conductor 병렬 스프린트
- **더블체크 발견**: **스킬 체이닝** (출력→입력 연쇄), **안전 가드레일** (`/careful`, `/freeze`, `/guard`), 사이드바 에이전트 (격리된 QA), 교차 모델 세컨드 오피니언 (`/codex` 독립 리뷰), 회귀 테스트 자동 생성
- **기여 층**: 2층 (가드레일), 3층 (스킬 체이닝, 교차 모델 리뷰)

#### [OpenSpec] — 아티팩트 워크플로우

- **핵심**: 변경 제안→스펙→디자인→태스크
- **더블체크 발견**: **유동적 반복 모델** (경직된 페이즈 게이트 없음), 3가지 워크플로우 프로필 (simple/expanded/custom), 컨텍스트 위생 강조, 텔레메트리 (익명, CI 자동 비활성)
- **기여 층**: 1층 (아티팩트 구조), 3층 (유동적 반복)

#### [baton] — 이슈→에이전트 디스패치 (Go)

- **핵심**: Linear/Jira 폴링 → 격리 워크스페이스 → 워크플로우 프롬프트 주입
- **기여 층**: 3층 (에이전트 디스패치)
- **참고 맵 v1에 없었음**

#### [agent-swarm] — Hook + DAG 워크플로우

- **핵심**: Lead/Worker 위임, 영속 메모리, Hook 시스템, Workflow DAG
- **기여 층**: 2층 (Hook 라이프사이클), 3층 (DAG 워크플로우)
- **참고 맵 v1에 없었음**

#### [Linear-Coding-Agent-Harness] — 이슈 기반 비동기 조정

- **핵심**: Long-running 자율 코딩. 2-에이전트 초기화 패턴
- **기여 층**: 3층 (이슈→에이전트→PR)
- **참고 맵 v1에 없었음**

#### [ccg-workflow] — 멀티모델 라우팅

- **핵심**: Claude+Codex+Gemini 27 슬래시 명령, 스펙 주도
- **기여 층**: 3층 (모델 라우팅, 품질 게이트)
- **참고 맵 v1에 없었음**

#### [GitNexus] — 코드 지식 그래프

- **핵심**: Tree-sitter AST → 그래프 DB, MCP 7도구
- **기여 층**: 4층 (지식 맵 데이터 소스)
- **참고 맵 v1에 없었음**

#### [OpenViking] — 계층적 컨텍스트 로딩

- **핵심**: 파일시스템 패러다임, L0/L1/L2 계층 로딩
- **기여 층**: 1층 (계층적 구조 설계)
- **참고 맵 v1에 없었음**

#### [claude-code-infrastructure-showcase] — 훅 자동 활성화

- **핵심**: 훅 기반 스킬 자동 활성화, 500줄 규칙, 6개월 실전
- **기여 층**: 2층 (훅 패턴)
- **참고 맵 v1에 없었음**

#### [skill-doctor] — 스킬 품질 게이트

- **핵심**: 스킬 정적 분석 + 0-100 품질 점수
- **기여 층**: 1층 (품질 게이트)
- **참고 맵 v1에 없었음**

### Tier 3: 부분 참고 (★★★)

| 프로젝트 | 기여 층 | 참고 포인트 |
|----------|--------|------------|
| [compound-engineering] | 2, 3층 | **★★★★ 상향**. 35+ agents, 40+ skills, 15개 리뷰어 페르소나 병렬 스폰, Brainstorm→Plan→Work→Review→Compound 워크플로우, 10+ 플랫폼 변환 (Codex, OpenCode, Droid, Pi, Gemini CLI, Copilot, Kiro, Windsurf, OpenClaw, Qwen) |
| [Chorus] | 3층 | 제안→승인→실체화, @멘션, 요구사항 정교화 게이트 |
| [DeerFlow] | 2층 | 점진적 스킬 로딩, 컨텍스트 요약, 스코프 격리 서브에이전트 |
| [Symphony] | 3층 | WORKFLOW.md-as-policy, 워크스페이스 격리 |
| [Spec Kit] | 1, 3층 | Constitution + 채점 루브릭, implementation-first 평가 |
| [aidlc-workflows] | 1층 | 적응형 검사 깊이, 질문 주도 워크플로우 |
| [uditgoenka-autoresearch] | 3층 | 기계적 검증 규율, Guard 분리, Stuck 감지, 커밋 후 검증 |
| [pi-autoresearch] | 3층 | MAD 신뢰도 점수, 백프레셔 검증 |
| [desloppify] | 3층 | 안티게이밍 점수, 기계적+LLM 하이브리드 분석 |
| [hermes-agent] | 3층 | 폐쇄 루프 학습, FTS5 세션 검색 |
| [vibe-kanban] | 4층 | 에이전트 워크스페이스 격리, 인라인 diff 리뷰 |
| [visual-explainer] | 4층 | 자체완결 HTML, 자동 콘텐츠 라우팅 |
| [proofshot] | 4층 | 세션 아티팩트 번들링, 타임스탬프 동기화 |
| [emdash] | 3층 | 23+ CLI 병렬 워크트리, 티켓→에이전트 라우팅 |
| [oh-my-openagent] | 2층 | 규율 에이전트 패턴, 해시 앵커 편집 |
| [Personal_AI_Infrastructure] | 2층 | TELOS 프레임워크, 3-tier 메모리, 보안 훅 |
| [gambit] | 3층 | 타입 I/O 스키마 (Zod), 시뮬레이터 UI |
| [supermemory] | 2층 | 영속 메모리 + 하이브리드 RAG, MCP 서버 |
| [autoresearch-skill] | 3층 | 바이너리 eval 기준, 프롬프트 뮤테이션, 라이브 HTML 대시보드 |

---

## 3. 참고 불필요 (방향 다름)

| 프로젝트 | 제외 이유 |
|----------|----------|
| [bridle] | 멀티 에이전트 설정 관리. 원칙 점수화와 무관 |
| [Open Pencil] | AI 네이티브 디자인 도구 |
| [CodeWiki] | 코드베이스 문서 자동 생성 |
| [happy] | 모바일/웹 클라이언트 래퍼 |
| [Scrapling] | 웹 스크래핑 프레임워크 |
| [defuddle] | 웹 콘텐츠 추출 라이브러리 |
| [reader] | URL→마크다운 변환 API |
| [claude-code-tips] | 사용자 팁 모음 |
| [learning-opportunities] | 학습 운동 플러그인 |
| [last30days-skill] | 정보 수집 스킬 |
| [notebooklm-skill] | NotebookLM 자동화 |
| [notebooklm-mcp-cli] | NotebookLM CLI/MCP |
| [autoresearch] | Karpathy 원본 (파생물이 더 유용) |
| [AI-Scientist] | 논문 자동 생성 |
| [AI-Researcher] | 연구 자동화 |
| [AgentLaboratory] | 멀티에이전트 연구 보조 |
| [ADAS] | 에이전트 자기 설계 연구 |
| [PageIndex] | 추론 기반 RAG |
| [cognee] | AI 메모리 플랫폼 (벡터+그래프) |
| [memsearch] | 시맨틱 메모리 검색 |
| [dify] | LLM 앱 개발 플랫폼 |
| [OpenSandbox] | 샌드박스 플랫폼 |
| [pentagi] | 침투 테스트 에이전트 |
| [skill-codex] | Codex CLI 스킬 |
| [knowledge-work-plugins] | 도메인별 플러그인 번들 |
| [superset] | 멀티 CLI 데스크톱 오케스트레이터 |
| [ClawTeam] | 스웜 오케스트레이션 |
| [nanoclaw] | 컨테이너 격리 에이전트 |
| [openclaw] | 개인 AI 어시스턴트 |
| [zylos-core] | Always-on 에이전트 인프라 |
| [claude-hud] | 상태줄 플러그인 |
| [claude-plugins-official] | 공식 플러그인 디렉토리 |
| [skills] | 공식 스킬 레퍼런스 |
| [antigravity-awesome-skills] | 스킬 큐레이션 |
| [awesome-agent-harness] | 하네스 큐레이션 |
| [andrej-karpathy-skills] | CLAUDE.md 템플릿 |
| [my-claude-code-setup] | 개인 설정 가이드 |
| [excalidraw-diagram-skill] | 다이어그램 생성 스킬 |
| [AI-Research-SKILLs] | 연구 스킬 라이브러리 |
| [qmd] | 하이브리드 마크다운 검색 |
| [deepagents] | 에이전트 하네스 (Python) |
| [agents.md] (표준) | AGENTS.md 오픈 포맷 (1층에서 참고로만) |
| [gitdiagram] | Mermaid 다이어그램 생성 |
| [agency-agents] | 에이전트 조정 프레임워크 |
| [agent-swarm] 외 나머지 | README 기반 1차 스크리닝에서 제외 |

**참고**: "참고 불필요"는 harness-engineer 구현 관점에서의 판단이며, 일부 프로젝트(awesome-agent-harness, antigravity-awesome-skills 등)는 생태계 이해에는 유용하다.

---

## 4. 전체 요약 표

| 프로젝트 | 형태 | 기여 층 | 참고 가치 | v1 대비 변화 |
|----------|------|--------|----------|-------------|
| [claude-code-organizer] | 독립 도구+MCP | 2, 4 | ★★★★★ | 유지 (토큰 분석 상세 추가) |
| [mission-control] | 독립 웹앱 | 3, 4 | ★★★★★ | ★★★★→★★★★★ (4층 평가 프레임워크) |
| [harness-kit] | 독립 프레임워크 | 2, 3, 4 | ★★★★★ | ★★★★→★★★★★ (19 Tenets, 8 provider, TaskIt) |
| [agent-harness] | 문서 | 1, 2 | ★★★★★ | ★★★→★★★★★ (자율성 레벨 L0-L3) |
| [Backlog.md] | 독립 CLI | 1, 4 | ★★★★★ | 유지 |
| [agent-orchestrator] | 독립 오케스트레이터 | 3 | ★★★★★ | **신규** |
| [claude-devtools] | Electron 앱 | 2, 4 | ★★★★★ | ★★★★→★★★★★ (알림 트리거) |
| [Understand-Anything] | CC 플러그인 | 4 | ★★★★★ | ★★★→★★★★★ (멀티에이전트, 적응형 UI) |
| [gitagent] | 독립 CLI | 1, 3 | ★★★★ | ★★→★★★★ (RULES/DUTIES/SkillsFlow) |
| [get-shit-done] | CC 플러그인 | 1, 3 | ★★★★ | ★★★→★★★★ (.planning/, Wave) |
| [oh-my-claudecode] | CC 플러그인 | 3 | ★★★★ | ★★→★★★★ (재실행 루프, 모델 라우팅) |
| [everything-claude-code] | CC 플러그인 | 2, 3 | ★★★★ | ★★→★★★★ (인스팅트, 훅 프로필) |
| [gstack] | CC 플러그인 | 2, 3 | ★★★★ | ★★★→★★★★ (스킬 체이닝, 가드레일) |
| [OpenSpec] | 독립 CLI | 1, 3 | ★★★★ | ★★★★ 유지 (유동적 반복 추가) |
| [baton] | Go 오케스트레이터 | 3 | ★★★★ | **신규** |
| [agent-swarm] | CC 플러그인 | 2, 3 | ★★★★ | **신규** |
| [Linear-Coding-Agent-Harness] | 에이전트 하네스 | 3 | ★★★★ | **신규** |
| [ccg-workflow] | CC 플러그인 | 3 | ★★★★ | **신규** |
| [GitNexus] | MCP 도구 | 4 | ★★★★ | **신규** |
| [OpenViking] | 컨텍스트 DB | 1 | ★★★★ | **신규** |
| [claude-code-infrastructure-showcase] | 레퍼런스 | 2 | ★★★★ | **신규** |
| [skill-doctor] | 분석 도구 | 1 | ★★★★ | **신규** |

---

## 5. v1 → v2 주요 변경 사항

### 구조 변경
- **Phase 1/1.5/2/3** → **4층 구조** (세팅/유지/평가/인터페이스)로 매핑 기준 변경

### 신규 추가 (12개)
- agent-orchestrator, baton, agent-swarm, Linear-Coding-Agent-Harness, ccg-workflow, GitNexus, OpenViking, claude-code-infrastructure-showcase, skill-doctor, emdash, oh-my-openagent, Personal_AI_Infrastructure

### 관련도 상향 (8개)
- mission-control (★★★★→★★★★★): 4층 평가 프레임워크 발견
- harness-kit (★★★★→★★★★★): 19 Tenets, 8 provider, TaskIt 칸반, 기여 층 2,3→2,3,4 확장
- agent-harness (★★★→★★★★★): 자율성 레벨 L0-L3
- claude-devtools (★★★★→★★★★★): 알림 트리거, 압축 감지
- Understand-Anything (★★★→★★★★★): 멀티에이전트, 적응형 UI
- gitagent (★★→★★★★): RULES/DUTIES/SkillsFlow
- get-shit-done (★★★→★★★★): .planning/ 상태 디렉토리
- oh-my-claudecode (★★→★★★★): 재실행 루프, 모델 라우팅

### 관련도 상향 (v2 → v2.1, 1개)
- compound-engineering (★★★→★★★★): 35+ agents, 40+ skills, 15 리뷰어 페르소나, 10+ 플랫폼 변환. 기여 층 2→2,3 확장

### 외부 시장 분석 추가 (v2.1)
- 섹션 6 신설: AURA, Deep Agents, CodeRabbit/Codacy/CodeScene 외부 경쟁자 맵

### 레포 맵/instruction 로딩 패턴 비교 추가 (v2.2)
- 섹션 7 신설: 12개 프로젝트 딥리서치 결과 — "레포 컨텍스트 → 에이전트" 로딩 메커니즘 비교

---

## 7. 레포 맵/instruction 로딩 패턴 비교 (v2.2)

> 12개 프로젝트 딥리서치를 통해 "레포 맵을 에이전트에게 어떻게 전달하는가" 패턴을 비교 분석.
> harness-engineer의 `.harness/map.md` + CLAUDE.md `@import` 설계 결정의 근거.

### 패턴 분류

| 패턴 | 대표 프로젝트 | 메커니즘 | 영구성 | harness-engineer 채택 |
|------|-------------|----------|:------:|:--------------------:|
| **A. 플랫폼 네이티브 파일 직접 생성** | OpenAI (Codex), oh-my-claudecode, get-shit-done | 각 플랫폼이 자동 로딩하는 파일(CLAUDE.md/AGENTS.md)을 직접 생성 | ✅ | △ (CLAUDE.md에 @import 추가) |
| **B. 소스 → 어댑터 변환** | gitagent | 플랫폼 무관 소스(SOUL.md+RULES.md) → 어댑터가 플랫폼별 파일로 인라인 변환 | ✅ | ✗ (sync 필요, 복잡) |
| **C. 짧은 부트스트랩 + 상세 분리** | agent-harness | 플랫폼 파일은 짧은 포인터, 상세는 별도 디렉토리 | ✅ | **✓ 핵심 채택** |
| **D. 훅 컨텍스트 주입** | superpowers | SessionStart 훅이 스킬 내용을 컨텍스트에 주입 | ⚠️ 압축 취약 | ✗ |
| **E. 안 만듦 (읽기만)** | compound-engineering | 유저가 직접 관리하는 것을 전제 | — | ✗ |

### 프로젝트별 상세

| 프로젝트 | CLAUDE.md 생성? | AGENTS.md 생성? | 레포 맵 전략 | 핵심 인사이트 |
|----------|:-:|:-:|------------|-------------|
| **OpenAI (Codex)** | — | ✅ (자동) | Codex 네이티브 자동 로딩. ~100줄 목차 + docs/ 상세 | "기계적 시행: 전용 린터 + CI" |
| **gitagent** | ✅ (어댑터) | ✅ (어댑터) | SOUL+RULES+DUTIES → 플랫폼별 인라인 변환 | 소스 1개 원칙. 12개 플랫폼 어댑터 |
| **agent-harness** | ✅ (부트스트랩) | ✅ (부트스트랩) | 짧은 부트스트랩(~200줄) + docs/agent-harness/ 상세 | progressive disclosure + 기계적 강제 이중 구조 |
| **oh-my-claudecode** | ✅ (setup 핵심) | 선택 (/deepinit) | CLAUDE.md에 `<!-- OMC:START/END -->` 마커 영역 관리 | 마커로 유저 영역 보존 |
| **get-shit-done** | ✅ (자동생성) | ✗ | CLAUDE.md 6개 섹션 자동 생성+유지. `.planning/` 7개 분석 문서 | CLAUDE.md = 프로젝트 컨텍스트 |
| **everything-claude-code** | ✅ | ✅ (자동) | AGENTS.md = 크로스플랫폼 범용, CLAUDE.md = CC 전용 | 병행 관리 |
| **gstack** | ✅ (수동 추가) | 있음 | DESIGN.md가 핵심 산출물. CLAUDE.md에 스킬 목록 안내 | 산출물 간 체이닝 |
| **superpowers** | ✗ (읽기만) | ✗ | SessionStart 훅이 스킬 라우팅 규칙 주입 | 훅 = 짧은 행동 규칙에 적합 |
| **compound-engineering** | ✗ (읽기만) | ✗ (읽기만) | "read, don't write" 철학 | 10+ 플랫폼 변환기 |
| **OpenViking** | ✗ | ✗ | L0(.abstract.md) → L1(.overview.md) → L2(원본) 계층적 로딩 | VLM 생성 요약, 검색 점수 기반 점진적 로딩 |
| **aidlc-workflows** | ✗ | ✗ | `.aidlc-rule-details/` 플랫폼별 규칙 파일 + `aidlc-state.md` 상태 추적 | 적응형 검사 깊이, 워크플로우 시작 시 규칙 로딩 |
| **claude-code-organizer** | ✗ (읽기만) | ✗ | 11카테고리 컨텍스트 예산 스캔. MCP 도구로 온디맨드 | ai-tokenizer ~99.8% 정확도, bytes/4 폴백 |

### harness-engineer 설계 결정 근거

1. **`.harness/map.md` 소스 분리 (agent-harness 패턴)**: map.md 수정 시 CLAUDE.md sync 불필요 (`@import`가 자동 반영). gitagent 인라인 패턴은 sync 필요.
2. **CLAUDE.md `@import` (CC 공식 기능)**: 압축 생존 (공식 문서 확인), 서브디렉토리 CLAUDE.md는 온디맨드라 자동 로딩 안 됨, `.claude/rules/`는 CC 전용.
3. **`<!-- harness:start/end -->` 마커 (oh-my-claudecode 패턴)**: 기존 CLAUDE.md 유저 영역 보존. HTML 주석은 CC가 Claude에게 주입 시 제거되지만 harness 도구가 섹션 관리에 사용.
4. **크로스플랫폼은 Phase 1.5 (CC 우선)**: CC 플러그인이니까 CC 네이티브부터. AGENTS.md/GEMINI.md는 `/harness export`로 확장.

### 참고 불필요 확인 (v1과 동일)
- bridle, Open Pencil, CodeWiki

---

## 6. 외부 시장 경쟁자 (references/ 밖)

> 2026-03-28 시장 리서치 + 더블체크 결과. references/ 폴더에 없는 외부 제품/서비스.

### 직접 경쟁 영역

| 제품 | 형태 | Harness Engineer와의 관계 | 출처 |
|------|------|--------------------------|------|
| **AURA** (Mezmo) | Rust 기반 오픈소스 에이전트 프레임워크 | 프로덕션 에이전트 컴포지션 (TOML 선언적 설정, MCP, RAG, OTel, 5 provider). main은 single-agent, 오케스트레이션은 alpha 브랜치. 레포 환경이 아닌 에이전트 런타임 초점 → **레이어가 다름** | [github.com/mezmo/aura](https://github.com/mezmo/aura) |
| **Deep Agents** (LangChain) | Python SDK + CLI | "batteries-included agent harness". 계획(write_todos), 파일시스템, 서브에이전트. 범용 에이전트 SDK로 코딩 에이전트 전용이 아님 → **레이어가 다름** | [github.com/langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) |

### AI 코드 품질 가드레일 시장 (3층 필요성의 시장 근거)

| 제품 | 역할 | Harness Engineer 3층과의 차이 |
|------|------|------------------------------|
| **CodeRabbit** | AI 코드 리뷰. [AI 코드 1.7x 더 많은 이슈 리포트](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report) (2025-12, 470 PR 분석) 발행 | 코드 레벨 린팅. 작업별 계약 기반 평가가 아님 |
| **Codacy Guardrails** | AI 생성 코드 품질 게이트 | PR 단위 품질 체크. 사전 합의된 평가 기준(계약) 없음 |
| **CodeScene AI** | 코드 건강도 + AI 코드 가드레일 | 코드 복잡도/기술부채 초점. 에이전트 작업 품질 평가와 다른 관점 |

### 시장 패턴 요약

1. **"init 한 줄" 패턴**: HarnessKit(`odin init`), ECC(`install.sh`) 모두 원커맨드 세팅 지향. 1층의 진입 장벽을 극단적으로 낮춰야 함
2. **평가자 분리가 최대 공백**: 리뷰/리플렉션은 여럿 있으나, 사전 계약 기반 1:1 원자적 검증을 플러그인으로 패키징한 제품은 부재
3. **하네스 가비지 컬렉션 실전 확인**: Anthropic Labs가 Opus 4.5→4.6 전환 시 불필요해진 스프린트 분해를 제거. 하네스 구성요소의 생명주기 관리가 현실적 과제

---

## 7. 이전 문서와의 관계

| 문서 | 용도 |
|------|------|
| `harness-engineer-reference-map.md` (v1) | 이전 Phase 1~3 구조 기준. **참고용으로 보존** |
| `harness-engineer-reference-map-v2.md` (이 문서) | 재설계 4층 구조 기준. **현행 참고 맵** |
| `2026-03-22-harness-engineer-plugin-design.md` | 이전 스펙. 15+1 원칙 정의, 검사 기준 표 등 참고 |
| `2026-03-27-harness-engineer-redesign.md` | 현행 재설계 명세 |
