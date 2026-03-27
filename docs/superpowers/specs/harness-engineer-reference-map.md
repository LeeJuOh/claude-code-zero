# Harness Engineer — 참고 프로젝트 맵

> `references/` 폴더에 클론된 프로젝트들 중 harness-engineer 플러그인 구현에 참고할 만한 프로젝트를 기능별로 매핑한 문서.
> 설계 명세(`2026-03-22-harness-engineer-plugin-design.md`)의 경쟁 포지셔닝 표를 보완한다.

**분석 기준**: 2026-03-27 기준 `references/` 폴더 및 `references/awesome-agent-harness/` README에 수록된 프로젝트.
**범위**: `references/`의 60+ 프로젝트 중 20개를 상세 분석. 나머지는 README 기반 1차 스크리닝에서 harness-engineer와 관련성이 낮아 제외.

---

## 1. 기능별 참고 매핑

### Phase 1 (MVP) — init, check, SessionStart 훅

| 기능 | 참고 프로젝트 | 참고 포인트 |
|------|-------------|------------|
| `/harness init` 스캐폴딩 | [aidlc-workflows] | `aidlc-docs/` 폴더에 아티팩트 생성하는 패턴. 복잡도에 따른 적응형 검사 깊이 |
| `/harness init` 스캐폴딩 | [OpenSpec] | `openspec/changes/` 폴더 구조. proposal→spec→design→tasks 아티팩트 레이아웃 |
| `/harness check` 원칙 점수화 | [harness-kit] | 가장 가까운 경쟁자. 자체 5교리 + 11패턴 강제. Odin CLI의 plan→assign→execute→reflect 흐름 |
| `/harness check` 원칙 점수화 | [agent-harness] | 7가지 원칙 + 체크리스트 + 불변조건. 문서 기반 거버넌스 레이어 |
| `/harness check` 토큰 계수/컨텍스트 예산 | [claude-code-organizer] | `@import` 확장 + HTML 주석 제거를 통한 상시 로드 vs 지연 토큰 측정. `/api/context-budget` 엔드포인트 |
| `/harness check` 토큰 시각화 | [claude-devtools] | 토큰 어트리뷰션 7카테고리, 컨텍스트 압축 시각화. 원칙 14(점진적 노출) 검사 결과 표현 방법 |
| `/harness check` criteria.yaml | [Spec Kit] | Constitution(프로젝트 원칙 정의)이 `.harness/criteria.yaml`과 유사. 채점 루브릭 구조 참고 |
| AGENTS.md 토큰 임계값 검사 | [agents.md] | AGENTS.md 오픈 포맷 표준. 원칙 4의 근거 표준 |
| SessionStart 훅 | [compound-engineering] | 동일 형태(Claude Code 플러그인)의 훅 구현 패턴 |

### Phase 1.5 — issue, board, MCP

| 기능 | 참고 프로젝트 | 참고 포인트 |
|------|-------------|------------|
| `/harness issue` 마크다운 이슈 | [Backlog.md] | **이슈 관리의 청사진.** `backlog/` 폴더에 `.md` 파일, YAML 프론트매터, 자동 증가 ID(BACK-1), Definition of Done 체크리스트, TUI+웹 칸반 |
| `/harness board` 대시보드 서버 | [claude-code-organizer] | **대시보드의 기술적 템플릿.** 무의존성 Node.js + 순수 HTML/CSS/JS, SSE 하트비트 자동종료, 포트 충돌 재시도, REST API (`/api/scan`, `/api/move` 등). 설계 명세에서 직접 차용한 아키텍처 |
| `/harness board` 칸반 UI | [vibe-kanban] | React+Vite+Tailwind 칸반, 에이전트별 워크스페이스 관리, 드래그앤드롭. 칸반 UI/UX 참고 |
| `/harness board` 칸반 UI | [Backlog.md] | 반응형 웹 칸반 + 드래그앤드롭 상태 변경. 이슈→칸반 통합 패턴 |
| `/harness board` 기능 범위 | [mission-control] | 32개 패널, 칸반+비용 추적+MCP 35도구+보안 감사 점수화. Phase 2~3 기능을 이미 구현. API 설계 참고 |
| `/harness board` 준수 이력 차트 | [proofshot] | standalone `viewer.html` — 타임라인 스크러빙, 로그 동기화. 준수 이력 뷰어 UI 패턴 |
| MCP 서버 | [claude-code-organizer] | REST API를 MCP 도구로 노출하는 패턴 |
| MCP 서버 | [mission-control] | 35개 MCP 도구. `claude mcp add` 통합 방식 |

### Phase 2 — plan, decide, run, 지식 맵, 에이전트 활동

| 기능 | 참고 프로젝트 | 참고 포인트 |
|------|-------------|------------|
| `/harness plan` 실행 계획 | [OpenSpec] | `proposal.md`→`specs/`→`design.md`→`tasks.md` 아티팩트 워크플로우. 원칙 10(플랜을 산출물로)의 구체적 구현체 |
| `/harness plan` 실행 계획 | [Spec Kit] | spec→clarify→plan→tasks→implement 6단계 파이프라인. Constitution 패턴 |
| `/harness plan` 실행 계획 | [aidlc-workflows] | 3단계 적응형 워크플로우 (Inception→Construction→Operations). 질문 주도, 위험 기반 적응 |
| `/harness decide` 설계 결정 | [Spec Kit] | Constitution + 기술 결정 기록 패턴 |
| `/harness run` 에이전트 디스패치 | [Symphony] | OpenAI의 레퍼런스 태스크 러너. Linear 이슈 폴링→격리된 에이전트 스폰→PR 제출. "사람이 조종, 에이전트가 실행"의 구현체 |
| `/harness run` 에이전트 디스패치 | [Chorus] | 세션 라이프사이클, 태스크 DAG, 서브에이전트 오케스트레이션, 컨텍스트 연속성 |
| `/harness run` 에이전트 디스패치 | [harness-kit] | Odin CLI의 비용 인식 에이전트 위임, DAG 기반 태스크 분해, 병렬 웨이브 실행 |
| `/harness check --fix` 자동 수정 | [harness-kit] | Reflection 루프 (plan→execute→review→adjust→execute) |
| PreToolUse 훅 (아키텍처 검사) | [DeerFlow] | 스킬 시스템 + 샌드박스 실행 + 서브에이전트 오케스트레이션. 런타임 강제 패턴 참고 |
| 대시보드 탭 4 (지식 맵) | [Understand-Anything] | 코드베이스→지식 그래프, 레이어 시각화, 의존성 그래프. 원칙 7(아키텍처 경계) 시각화에 활용 |
| 대시보드 탭 4 (지식 맵) | [gitdiagram] | 레포→Mermaid 다이어그램 자동 생성. AGENTS.md 구조 시각화에 Mermaid 활용 참고 |
| 대시보드 탭 5 (에이전트 활동) | [mission-control] | 에이전트별 비용/토큰 추적, 태스크 타임라인 |
| 대시보드 탭 5 (에이전트 활동) | [claude-devtools] | 세션 실행 추적, 서브에이전트 트리 시각화, 실시간 파일 워처 |
| 인스트럭션 충돌 감지 | [claude-code-organizer] | 스코프 계층 구조(Global→Workspace→Project) 시각화. 상속 관계 표현 패턴 |

### Phase 3 — 린터 강제, 가비지 컬렉션, 관측성

| 기능 | 참고 프로젝트 | 참고 포인트 |
|------|-------------|------------|
| 린터 에러 메시지 형식 강제 (원칙 8) | [harness-kit] | "No Slop" 교리 — AI 출력이 사람 코드 품질 기준을 충족하도록 강제. 에이전트 친화적 에러 형식 패턴 |
| 가비지 컬렉션 에이전트 (원칙 11) | [agent-harness] | `doc-gardening.md` 체크리스트 — 문서 유지관리 워크플로우. 노후 문서 검토 패턴 |
| 랄프 위검 자가 리뷰 루프 (원칙 12) | [Chorus] | Reversed Conversation (AI 제안→사람 검증). 다단계 승인 흐름 |
| 정적 HTML 리포트/내보내기 | [visual-explainer] | 무의존성 자체완결 HTML (Mermaid, Chart.js, CSS Grid). 서버 없이 결과 공유 |

---

## 2. 주요 참고 프로젝트 상세

유사도순 정리 후, 구현 참고 프로젝트를 별도로 기술한다.

### 경쟁/유사 프로젝트

#### ★★★★ [harness-kit] — 가장 가까운 경쟁자

- **핵심**: DAG 기반 태스크 오케스트레이션 + 5교리 강제 + 11 엔지니어링 패턴
- **CLI**: Odin (plan, assign, execute, reflect)
- **대시보드**: TaskIt (React+Django 풀스택, 칸반+DAG 시각화+비용 추적)
- **차이점**: 자체 교리 정의 (harness-engineer는 교차 출처 합성), Django+React 풀스택 (harness-engineer는 무의존성), 준수 점수화 없음, 컨텍스트 예산/평가자 분리 검사 없음, 준수 이력 없음
- **참고**: 교리 강제 구조, CLI 워크플로우, Proof of Work 패턴

#### ★★★★ [Backlog.md] — 이슈 관리의 청사진

- **핵심**: 마크다운 네이티브 태스크 매니저 + TUI/웹 칸반
- **기술**: Bun+TypeScript, `backlog/` 폴더에 `.md` 파일
- **차이점**: 원칙 점수화 없음, 하네스 인식 없음. 성숙한 완전 기능 태스크 매니저
- **참고**: 마크다운 이슈 형식, YAML 프론트매터, 자동 증가 ID, 칸반 웹 UI, Definition of Done

#### ★★★ [compound-engineering] — 동일 형태 플러그인

- **핵심**: 복리 엔지니어링 워크플로우 (ideate→brainstorm→plan→work→review→compound)
- **형태**: Claude Code 플러그인 (동일)
- **차이점**: 워크플로우 강제가 목적 (harness-engineer는 상태 검사), 점수화 없음, 대시보드 없음
- **참고**: 플러그인 스킬 구조, 훅 구현 패턴, 멀티 플랫폼 변환 접근

#### ★★★ [agent-harness] — 거버넌스 레이어

- **핵심**: 7가지 원칙 + 체크리스트 + 불변조건 (문서 기반)
- **차이점**: CLI/대시보드/점수화 없음. 문서 템플릿 수준
- **참고**: 원칙 구조화 방식, 체크리스트 형식, autonomy levels 분류

#### ★★ [Symphony] — 태스크 러너의 레퍼런스

- **핵심**: OpenAI의 하네스 엔지니어링 레퍼런스 구현. Linear 이슈 폴링→격리된 Codex 에이전트 스폰→PR 제출
- **기술**: 데몬 프로세스 (Go/Python)
- **차이점**: 외부 이슈 트래커(Linear) 의존, 레포 네이티브가 아님, 원칙 점수화 없음
- **참고**: Phase 2 `/harness run`의 이슈→에이전트→PR 파이프라인 패턴

#### ★★ [Chorus] — 풀 라이프사이클 플랫폼

- **핵심**: AI-DLC 워크플로우, 세션 관리, 태스크 DAG, MCP 50+ 도구
- **기술**: Next.js 15 + PostgreSQL + Redis
- **차이점**: 엔터프라이즈급 풀스택 (harness-engineer는 경량 플러그인), 원칙 점수화 없음
- **참고**: Phase 2 에이전트 디스패치, 세션 라이프사이클, 다단계 승인 흐름

#### ★★ [DeerFlow] — 에이전트 하네스 프레임워크

- **핵심**: ByteDance의 SuperAgent 하네스. 스킬 시스템 + 온디맨드 로딩 + 서브에이전트 오케스트레이션 + 샌드박스 실행 + 영속 메모리
- **기술**: LangGraph/LangChain 기반
- **차이점**: 독립 프레임워크 (harness-engineer는 CC 플러그인), 원칙 점수화 없음
- **참고**: 스킬 온디맨드 로딩 패턴 (원칙 14), 런타임 강제 메커니즘

#### ★★ [gitagent] — 에이전트 정의 표준

- **핵심**: Git-native 에이전트 포맷 (agent.yaml + SOUL.md + RULES.md), 12개 플랫폼 어댑터
- **차이점**: 에이전트 이식성이 목적 (harness-engineer는 레포 준수도 측정)
- **참고**: `validate`/`audit` CLI 구조, RULES.md 하드 제약 패턴

#### ★ [bridle] — 설정 매니저

- **핵심**: 6개 코딩 에이전트의 설정 통합 관리 (Rust CLI + TUI)
- **차이점**: 문제 공간이 완전히 다름 (설정 관리 vs 원칙 점수화)
- **참고 가치 없음**

### 구현 참고 프로젝트 (경쟁자가 아닌 기술 참고)

#### ★★★★★ [claude-code-organizer] — 대시보드 기술 템플릿

- **핵심**: `~/.claude/` 시각적 구성 관리자. 스코프 계층 구조, 컨텍스트 예산 분석, MCP 서버
- **기술**: 무의존성 Node.js + 순수 HTML/CSS/JS, REST API, SSE 하트비트
- **참고**: `/harness board` 서버 아키텍처 전체. 설계 명세에서 직접 차용

#### ★★★★ [mission-control] — 대시보드 기능 범위 참고

- **핵심**: 에이전트 오케스트레이션 대시보드. 32패널, 칸반, 비용 추적, MCP 35도구, 보안 감사 점수화
- **기술**: Next.js 16 + SQLite + WebSocket/SSE, 101 REST 엔드포인트
- **참고**: Phase 2~3 기능 로드맵 검증, MCP/대시보드 API 설계

#### ★★★★ [claude-devtools] — 컨텍스트 시각화 참고

- **핵심**: Claude Code 세션 실행 추적 시각화. 토큰 어트리뷰션, 컨텍스트 압축 시각화
- **기술**: Electron + React + SSE (웹 서버 모드도 지원)
- **참고**: 원칙 14 컨텍스트 예산 시각화 방법, 토큰 카테고리별 분석 UI

---

## 3. 카테고리별 참고

### 대시보드/웹 UI

| 프로젝트 | 기술 스택 | 참고 가치 | 참고 포인트 |
|----------|----------|----------|------------|
| [claude-code-organizer] | 무의존성 Node.js + 순수 HTML/CSS/JS | ★★★★★ | `/harness board`의 기술적 청사진. SSE 자동종료, REST API, 컨텍스트 예산 |
| [mission-control] | Next.js 16 + SQLite + WebSocket/SSE | ★★★★ | 기능 범위 참고 (32 패널). Phase 2~3 로드맵 검증 |
| [claude-devtools] | Electron + React + SSE | ★★★★ | 토큰 어트리뷰션, 컨텍스트 압축 시각화, 서브에이전트 트리 |
| [vibe-kanban] | React + Vite + Tailwind + Rust 백엔드 | ★★★ | 칸반 UI/UX, 에이전트 워크스페이스 |
| [Backlog.md] | Bun + TypeScript | ★★★ | 이슈→칸반 통합, 드래그앤드롭 |
| [visual-explainer] | 무의존성 HTML (Mermaid, Chart.js) | ★★ | 서버 없는 자체완결 HTML 리포트 |
| [proofshot] | standalone viewer.html | ★★ | 타임라인 뷰어, 로그 동기화 UI |
| [gitdiagram] | Next.js + FastAPI + Mermaid | ★ | Mermaid 다이어그램 생성 |

### 스펙/워크플로우 도구

| 프로젝트 | 핵심 | 참고 가치 | 참고 포인트 |
|----------|------|----------|------------|
| [OpenSpec] | 변경 제안→스펙→디자인→태스크 | ★★★★ | Phase 2 `/harness plan` 형식. `docs/plans/` 아티팩트 구조 |
| [Spec Kit] | 스펙 주도 개발 6단계 파이프라인 | ★★★ | Constitution→채점 루브릭. criteria.yaml 구조 참고 |
| [aidlc-workflows] | AWS 3단계 적응형 워크플로우 | ★★★ | 적응형 검사 깊이, 질문 주도 워크플로우, 아티팩트 폴더 구조 |

### 표준/프로토콜

| 프로젝트 | 핵심 | 참고 가치 | 참고 포인트 |
|----------|------|----------|------------|
| [agents.md] | AGENTS.md 오픈 포맷 표준 | ★★★ | 원칙 4의 근거 표준. 토큰 임계값 검사의 의도 확인 |
| [gitagent] | Git-native 에이전트 정의 표준 | ★★ | validate/audit CLI 구조만 부분 참고 |

### 시각화/지식 맵

| 프로젝트 | 핵심 | 참고 가치 | 참고 포인트 |
|----------|------|----------|------------|
| [Understand-Anything] | 코드베이스→지식 그래프 대시보드 | ★★★ | Phase 2 지식 맵. 레이어 시각화, 의존성 그래프 |
| [gitdiagram] | 레포→Mermaid 다이어그램 | ★ | AGENTS.md 구조 시각화에 Mermaid 활용 |

### 에이전트 오케스트레이터 (awesome-agent-harness: Agent Orchestrators)

코딩 에이전트 위에 올라가는 하네스. 워크플로우 사이클을 정의하고 스킬/훅/에이전트로 개발 프로세스를 강제한다. awesome-agent-harness에서 Agent Orchestrators로 분류 (ECC는 이미 수록).

harness-engineer는 이 하네스들이 15+1가지 원칙을 잘 따르는지 **검사하는 메타 레이어**이므로, 경쟁이 아닌 보완 관계다. 사용자가 이 오케스트레이터와 harness-engineer를 동시에 사용할 수 있다.

| 프로젝트 | 워크플로우 사이클 | 스킬/명령 수 | 참고 가치 | 참고 포인트 |
|----------|-----------------|-------------|----------|------------|
| [gstack] | Think→Plan→Build→Review→Test→Ship→Reflect (7단계 스프린트) | 28개 | ★★★ | "process, not a collection of tools" 철학. 스킬 간 출력 연쇄(이전 단계 출력을 다음 단계가 읽음). 병렬 스프린트 (Conductor) |
| [superpowers] | Brainstorm→Plan→Execute→Review→Complete (7단계) | 20+개 | ★★★ | "Mandatory workflows, not suggestions" 철학. 컨텍스트 기반 자동 스킬 트리거. 서브에이전트 기반 실행 + 2단계 리뷰. CC 플러그인 구조의 직접 참고 |
| [get-shit-done] | Discuss→Plan→Execute→Verify→Ship (5단계/phase) | 40+개 | ★★★ | 스펙 주도 + 컨텍스트 엔지니어링. Wave 기반 병렬 실행. `.planning/` 상태 디렉토리로 진행 상황 추적 |
| [oh-my-claudecode] | plan→prd→exec→verify→fix (루프) | 32+에이전트 | ★★ | 멀티에이전트 파이프라인. 매직 키워드 기반 모드 전환. 자동 모델 라우팅(Haiku/Opus). 검증 실패 시 자동 재실행 루프 |
| [everything-claude-code] | Plan→TDD→Review→Security→E2E + 학습 루프 | 28에이전트 + 125스킬 + 60명령 | ★★ | awesome-agent-harness에 이미 수록. `/harness-audit` 명령 존재(이름 충돌 주의). 인스팅트 시스템(패턴 학습→스킬화). 훅 기반 자동화 |

---

## 4. 참고 불필요 (방향 다름)

| 프로젝트 | 카테고리 | 제외 이유 |
|----------|---------|----------|
| [bridle] | 설정 매니저 | 멀티 에이전트 설정 관리. 원칙 점수화와 무관 |
| [Open Pencil] | 디자인 에디터 | AI 네이티브 디자인 도구. harness-engineer와 무관 |
| [CodeWiki] | 문서 생성 | 코드베이스 문서 자동 생성. 대시보드 아님 |

**참고**: `references/`의 나머지 프로젝트(skills, nanoclaw, openclaw, claude-review-loop, claude-task-master 등)는 README 기반 1차 스크리닝에서 harness-engineer의 기능(원칙 점수화, 이슈 관리, 대시보드)과 직접적 관련성이 낮아 상세 분석에서 제외했다. 향후 필요 시 개별 확인.

---

## 5. 전체 요약 표

| 프로젝트 | 형태 | 원칙 강제 | 점수화 | 이슈 관리 | 대시보드 | MCP | 유사도 | 참고 가치 | Phase |
|----------|------|---------|-------|----------|---------|-----|--------|----------|-------|
| [harness-kit] | 독립 프레임워크 | O (자체 5교리) | X | O (DAG 태스크) | O (React+Django) | X | ★★★★ | ★★★★ | 1 |
| [Backlog.md] | 독립 CLI | X | X | O (마크다운) | O (웹+TUI) | O | ★★★★ | ★★★★★ | 1.5 |
| [CC Organizer] | 독립 도구+MCP | X | X | X | O (무의존성) | O | ★★ | ★★★★★ | 1.5 |
| [mission-control] | 독립 웹앱 | 부분적 | 부분적 | O | O (Next.js) | O | ★★ | ★★★★ | 1.5~2 |
| [claude-devtools] | Electron 앱 | X | X | X | O (React) | X | ★★ | ★★★★ | 1~1.5 |
| [compound-eng] | CC 플러그인 | 부분적 | X | X | X | X | ★★★ | ★★★ | 1 |
| [agent-harness] | 문서 | O (7원칙) | X | X | X | X | ★★★ | ★★★ | 1 |
| [Symphony] | 독립 데몬 | X | X | O (외부) | O (선택) | X | ★★ | ★★★ | 2 |
| [OpenSpec] | 독립 CLI | X | X | X | X | X | ★★ | ★★★★ | 2 |
| [Spec Kit] | 독립 CLI | 부분적 | X | X | X | X | ★★ | ★★★ | 2 |
| [aidlc-workflows] | 에이전트 룰 | 부분적 | X | X | X | X | ★★ | ★★★ | 2 |
| [Understand-Anything] | CC 플러그인 | X | X | X | O (React) | X | ★ | ★★★ | 2 |
| [agents.md] | 표준 스펙 | X | X | X | X | X | — | ★★★ | 1 |
| [Chorus] | 풀스택 플랫폼 | O | X | O | O (Next.js) | O | ★★ | ★★ | 2 |
| [DeerFlow] | 독립 프레임워크 | X | X | X | X | X | ★★ | ★★ | 2 |
| [vibe-kanban] | 독립 웹앱 | X | X | O | O (React+Rust) | X | ★★ | ★★★ | 1.5 |
| [gitagent] | 독립 CLI | 부분적 | 부분적 | X | X | X | ★★ | ★★ | — |
| [visual-explainer] | 에이전트 스킬 | X | X | X | O (순수 HTML) | X | ★ | ★★ | 1.5 |
| [proofshot] | 독립 CLI | X | X | X | O (viewer.html) | X | ★ | ★★ | 1.5 |
| [gitdiagram] | 웹 서비스 | X | X | X | O (Next.js) | X | ★ | ★ | 2 |

- **유사도**: 제품/기능 공간이 harness-engineer와 얼마나 겹치는가.
- **참고 가치**: 구현 시 기술적/설계적으로 얼마나 유용한가. 유사도가 낮아도 참고 가치가 높을 수 있다 (예: CC Organizer는 다른 제품이지만 대시보드 아키텍처의 직접적 청사진).
- **Phase**: 해당 프로젝트가 가장 유용한 harness-engineer 개발 단계.

---

## 6. 설계 명세 보완 사항

설계 명세(`2026-03-22-harness-engineer-plugin-design.md`)의 참고자료 섹션에 추가를 권장하는 프로젝트:

| 프로젝트 | 추가 위치 | 이유 |
|----------|----------|------|
| [mission-control] | 생태계 참고자료 | Phase 2~3 기능 로드맵 검증, MCP/대시보드 API 설계 참고 |
| [claude-devtools] | 생태계 참고자료 | 컨텍스트 예산 시각화 방법, 토큰 어트리뷰션 참고 |
| [Symphony] | 생태계 참고자료 | Phase 2 `/harness run`의 이슈→에이전트→PR 파이프라인. 설계 명세 경쟁 포지셔닝 표에는 있으나 참고자료 목록에 누락 |
| [OpenSpec] | 생태계 참고자료 | Phase 2 `/harness plan` 아티팩트 형식 참고 |
| [Spec Kit] | 생태계 참고자료 | criteria.yaml 구조, Constitution 패턴 참고 |
| [aidlc-workflows] | 생태계 참고자료 | 적응형 워크플로우 패턴, 아티팩트 폴더 구조 참고 |
| [Understand-Anything] | 생태계 참고자료 | Phase 2 지식 맵 시각화 참고 |
| [compound-engineering] | 경쟁 포지셔닝 표 | 동일 형태(CC 플러그인) 경쟁자. 플러그인 구조 참고 |
| [DeerFlow] | 생태계 참고자료 | 설계 명세 배경에 언급되나 참고자료 목록에 누락 |

---

## 프로젝트 링크

| 약칭 | 전체 이름 | GitHub URL |
|------|----------|------------|
| [harness-kit] | Harness Kit | https://github.com/deepklarity/harness-kit |
| [Backlog.md] | Backlog.md | https://github.com/MrLesk/Backlog.md |
| [claude-code-organizer] / [CC Organizer] | Claude Code Organizer | https://github.com/mcpware/claude-code-organizer |
| [mission-control] | Mission Control | `references/mission-control` (로컬) |
| [claude-devtools] | Claude DevTools | `references/claude-devtools` (로컬) |
| [compound-engineering] / [compound-eng] | Compound Engineering Plugin | `references/compound-engineering-plugin` (로컬) |
| [agent-harness] | Agent Harness | https://github.com/MattMagg/agent-harness |
| [Symphony] | Symphony | https://github.com/openai/symphony |
| [Chorus] | Chorus | https://github.com/Chorus-AIDLC/Chorus |
| [DeerFlow] | DeerFlow 2.0 | https://github.com/bytedance/deer-flow |
| [gitagent] | GitAgent | https://github.com/open-gitagent/gitagent |
| [bridle] | Bridle | https://github.com/neiii/bridle |
| [OpenSpec] | OpenSpec | https://github.com/FissionAI/openspec |
| [Spec Kit] | Spec Kit | https://github.com/github/spec-kit |
| [agents.md] | agents.md | https://agents.md/ |
| [aidlc-workflows] | AI-DLC Workflows | https://github.com/awslabs/aidlc-workflows |
| [Open Pencil] | Open Pencil | https://github.com/open-pencil/open-pencil |
| [Understand-Anything] | Understand Anything | `references/Understand-Anything` (로컬) |
| [vibe-kanban] | Vibe Kanban | https://github.com/BloopAI/vibe-kanban |
| [visual-explainer] | Visual Explainer | `references/visual-explainer` (로컬) |
| [proofshot] | ProofShot | `references/proofshot` (로컬) |
| [gitdiagram] | GitDiagram | `references/gitdiagram` (로컬) |
| [CodeWiki] | CodeWiki | `references/CodeWiki` (로컬) |
