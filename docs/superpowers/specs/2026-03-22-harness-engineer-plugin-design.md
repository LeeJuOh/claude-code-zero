# Harness Engineer 플러그인 — 설계 명세

> 모든 레포지토리에서 15가지 핵심 하네스 엔지니어링 원칙(+ 1가지 실험적 원칙)을 강제하고 안내하는 Claude Code 플러그인.

## 배경

### 문제

OpenAI의 ["Harness Engineering"](https://openai.com/index/harness-engineering/) 블로그 (2026년 2월)는 에이전트 우선 개발에 대한 포괄적이고 서술적인 접근법을 기술했다. Cassie Kozyrkov는 블로그의 개념들을 [12가지 개별 규칙](https://www.youtube.com/watch?v=BabEnt6VjtE)으로 재구성했다 (그녀 자신의 구조화이며, OpenAI의 공식 분류가 아님). Anthropic의 Claude Code 팀은 "Seeing Like an Agent"에서 [4가지 보완 교훈](https://x.com/trq212/status/2027463795355095314)을 공유했다. Anthropic Labs는 [장기 실행 하네스 설계 사례 연구](https://www.anthropic.com/engineering/harness-design-long-running-apps)를 통해 이러한 아이디어를 추가로 검증하고 확장했으며, 다중 에이전트 아키텍처(Planner/Generator/Evaluator), 자가 평가 편향, 컨텍스트 열화, 모델 개선에 따른 하네스 단순화를 시연했다.

**이 플러그인은 네 가지 출처를 통합하여 15+1가지 원칙 프레임워크로 합성한다** (15가지 핵심 + 1가지 실험적). 개별 출처들이 이 정확한 세트를 정의하는 것은 아니며, Claude Code 사용자를 위해 포괄적이고 실행 가능하도록 설계된 우리의 통합이다.

그러나 **이러한 원칙들을 통합 세트로 점수화하고 안내하는 기존 도구는 없다**. [awesome-agent-harness](https://github.com/anthropics/awesome-agent-harness)의 모든 카테고리에 걸친 47개 이상의 프로젝트를 분석한 결과 (2026년 3월 기준):

- **오케스트레이터** (Vibe Kanban, Emdash, Composio) — 에이전트를 병렬 워크트리에서 실행하지만 하네스 원칙을 강제하지 않음
- **태스크 러너** (Symphony, Baton) — issue→PR 파이프라인을 자동화하지만 외부 트래커에 의존
- **프레임워크** (Harness Kit, DeerFlow) — 패턴과 일부 런타임 강제를 제공하지만 (Harness Kit은 DAG 오케스트레이션을 통해 자체 19가지 교리를 강제) 교차 출처 원칙 세트에 대한 점수화는 하지 않음
- **이슈 관리자** (Backlog.md) — 웹 UI와 의사결정 지원이 있는 레포 네이티브 마크다운 이슈 관리이지만, 하네스 원칙 점수화는 없음

갭: **교차 출처 하네스 원칙 점수화, 개선 가이드, 레포 네이티브 이슈 관리를 결합한 도구가 없다**. 핵심 가치는 원칙 점수화이며, 이슈 관리는 이를 보완하는 기능이다.

### 15+1가지 원칙

**Kozyrkov의 12가지 규칙** — Cassie Kozyrkov가 [OpenAI의 Harness Engineering 블로그](https://openai.com/index/harness-engineering/)의 개념들을 [개별적으로 구조화](https://www.youtube.com/watch?v=BabEnt6VjtE)한 것. 블로그는 이러한 개념들을 섹션별로 서술적으로 기술하며, 아래의 번호가 매겨진 규칙과 이름은 Kozyrkov의 구성이다. 출처 매핑은 각 규칙이 어떤 블로그 섹션에서 도출되었는지를 보여준다.

| # | 규칙 | 블로그 섹션 | 비고 |
|---|------|-------------|------|
| 1 | **사람이 조종하고, 에이전트가 실행한다** | "We started with an empty git repository" / "Redefining the role of the engineer" | 블로그의 핵심 프레이밍 |
| 2 | **수동 코드 작성 금지** *(원칙 1의 실험적 확장)* | "We started with an empty git repository" | 블로그의 강제 함수로 의도적으로 선택한 실험 제약. 보편적 원칙이 아닌 에이전트 전용 개발 환경에서의 선택사항 |
| 3 | **레포지토리 지식을 기록의 원천으로** | "We made repository knowledge the system of record" / "Agent legibility is the goal" | 블로그 섹션과 직접 대응 |
| 4 | **AGENTS.md를 목차로** | "We made repository knowledge the system of record" | 블로그에서 "작고 안정적인 진입점" 패턴을 기술 |
| 5 | **애플리케이션 가독성** | "Increasing application legibility" | 블로그 섹션과 직접 대응 |
| 6 | **임시 관측성 스택** | "Increasing application legibility" | 블로그에서 워크트리별 앱 인스턴스 언급 |
| 7 | **엄격한 아키텍처 경계** | "Enforcing architecture and taste" | 블로그 섹션과 직접 대응 |
| 8 | **취향의 기계적 강제** | "Enforcing architecture and taste" | 블로그: 린터 에러 메시지를 에이전트 컨텍스트로 활용 |
| 9 | **고처리량 머지 철학** | "Throughput changes the merge philosophy" | 블로그 섹션과 직접 대응. **주의:** 블로그 원문은 "처리량이 적은 환경에서는 적합하지 않습니다"라고 경고. 솔로/소규모 팀에서는 전통적 리뷰 게이트가 더 적합할 수 있음 |
| 10 | **플랜을 일급 산출물로** | "Increasing levels of autonomy" | 블로그: 검증을 포함한 엔드투엔드 루프; Kozyrkov가 개별 규칙으로 명명 |
| 11 | **지속적 가비지 컬렉션** | "Entropy and garbage collection" | 블로그 섹션과 직접 대응 |
| 12 | **랄프 위검 루프** | "Increasing levels of autonomy" | 블로그: 에이전트 자가 리뷰 루프; Kozyrkov의 명명. Anthropic Labs의 [자가 평가 편향 발견](https://www.anthropic.com/engineering/harness-design-long-running-apps)에 의해 확장: 평가자와 생성자를 분리 |

**Anthropic의 에이전트 설계 철학 (4가지 보완 원칙):**

다음 4가지 원칙은 [Thariq의 "Seeing Like an Agent" 스레드](https://x.com/trq212/status/2027463795355095314)와 [Lessons from Building Claude Code: How We Use Skills](https://www.anthropic.com/blog/how-we-use-skills) 블로그에서 도출된 주제들의 종합이다. 개별 출처가 이 정확한 4항목 세트를 정의하는 것은 아니며, [awesome-agent-harness](https://github.com/anthropics/awesome-agent-harness)와 함께 Anthropic의 에이전트 설계 접근법에서 일관되게 나타나는 패턴을 구조화한 것이다.

| # | 원칙 | 비고 |
|---|------|------|
| 13 | **도구는 적게, 표현력은 크게** | 조합 가능한 프리미티브가 방대한 툴킷을 이긴다. 스킬 블로그: "Avoid Railroading Claude" — 유연성을 주되 필요한 정보를 제공 |
| 14 | **점진적 노출** | 에이전트가 모든 것을 미리 로드하지 않고 레이어를 걸쳐 재귀적으로 컨텍스트를 발견. 스킬 블로그: "스킬은 폴더이지 마크다운 파일이 아니다" — 파일 시스템 자체가 컨텍스트 엔지니어링 |
| 15 | **에이전트처럼 보기** | 에이전트가 어려워하는 곳을 관찰하고 하네스를 개선. 스킬 블로그: PreToolUse 훅으로 스킬 사용량을 측정하여 과소 트리거링 감지 |
| 16 | **하네스는 모델과 함께 진화한다** | 모델 능력이 향상됨에 따라 장애물이 되는 도구를 제거. Anthropic Labs에서 검증: [Opus 4.6에서 스프린트 분해가 불필요해짐](https://www.anthropic.com/engineering/harness-design-long-running-apps) |

**기본 철학** (검사 가능한 개별 원칙이 아님): [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)의 "단순하고 조합 가능한 패턴 > 복잡한 프레임워크".

**다른 원칙 세트와의 관계:** [agent-harness](https://github.com/MattMagg/agent-harness) 거버넌스 레포는 자체 7가지 원칙을 정의하며, 이 세트와 겹치지만 다르다. 이 플러그인의 15+1가지 원칙은 상위집합 합성이며, 어떤 단일 출처의 직접 매핑이 아니다.

### 참고자료

**원칙 출처:**

- [Harness Engineering (OpenAI 블로그)](https://openai.com/index/harness-engineering/) — 원류 블로그; Kozyrkov에 의해 12가지 규칙으로 구성됨
- [12 Rules of Harness Engineering (Cassie Kozyrkov)](https://www.youtube.com/watch?v=BabEnt6VjtE) — OpenAI 블로그에서 도출된 12가지 개별 규칙
- [Seeing Like an Agent (Thariq, Claude Code 팀)](https://x.com/trq212/status/2027463795355095314) — 에이전트 액션 스페이스 설계 철학
- [Lessons from Building Claude Code: How We Use Skills (Anthropic)](https://www.anthropic.com/blog/how-we-use-skills) — 9개 스킬 카테고리, 고차스 설계, 점진적 노출, description 최적화 등 실전 스킬 설계 패턴. 원칙 13-16의 보완 출처
- [Building Effective Agents (Anthropic Research)](https://www.anthropic.com/research/building-effective-agents) — 기본 철학: 단순하고 조합 가능한 패턴
- [Harness Design for Long-Running Application Development (Prithvi Rajasekaran, Anthropic Labs)](https://www.anthropic.com/engineering/harness-design-long-running-apps) — 세 에이전트 아키텍처(Planner/Generator/Evaluator), 자가 평가 편향, 컨텍스트 윈도우 열화, 모델 개선에 따른 하네스 단순화; 원칙 12와 16의 실증적 검증

**생태계 참고자료:**

- [awesome-agent-harness (전체 현황)](https://github.com/anthropics/awesome-agent-harness) — 10개 카테고리에 걸친 47개 이상의 프로젝트
- [agent-harness (거버넌스 템플릿)](https://github.com/MattMagg/agent-harness) — 7가지 원칙, 체크리스트, 불변 조건
- [Backlog.md (마크다운 네이티브 태스크 매니저)](https://github.com/MrLesk/Backlog.md) — 웹 UI를 갖춘 완전한 기능의 레포 네이티브 이슈 관리
- [Claude Code Organizer (mcpware)](https://github.com/mcpware/claude-code-organizer) — 스코프 계층 구조, 컨텍스트 예산 분석, MCP 서버 인터페이스를 갖춘 `~/.claude/` 시각적 구성 관리자; 대시보드 아키텍처 및 토큰 기반 검사의 설계 참조

## 제품 정의

### 한 줄 요약

레포 구조 검사와 원칙 준수 점수화를 핵심으로, 마크다운 네이티브 이슈 관리와 로컬 웹 대시보드를 통해 15+1가지 하네스 엔지니어링 원칙을 강제하고 안내하는 Claude Code 플러그인.

### 타겟 사용자

Claude Code를 주요 코딩 에이전트로 사용하며, 수동으로 준수 여부를 추적하지 않고도 하네스 엔지니어링 원칙을 실천하고 싶은 솔로 개발자(또는 소규모 팀).

### 제품 형태

Claude Code 플러그인 (Phase 1) → 독립 CLI 도구 (Phase 2, 향후).

## 핵심 기능

### 1. `/harness init` — 레포 구조 스캐폴딩

하네스 준수 레포 구조를 생성:

```
.harness/
  config.yaml                      # 어떤 원칙을 강제할지, 임계값
  criteria.yaml                    # 프로젝트별 품질 기준 (원칙 8)
  architecture.yaml                # 레이어 경계 정의 (원칙 7)
  history/                         # 시간에 따른 준수 점수 스냅샷 (원칙 16)

issues/                            # 마크다운으로 된 이슈/태스크 (원칙 3)
  ISSUE-001-example.md

docs/
  decisions/                       # 설계 결정 기록 (원칙 3)
  plans/                           # 실행 계획 (원칙 10)

AGENTS.md                          # 에이전트 진입점 — 목차 (원칙 4, 14)
```

**`.harness/config.yaml` 스키마:**

```yaml
# 적극적으로 검사할 원칙 (나머지는 권고 가이드 표시)
enabled_principles: [1, 3, 4, 7, 8, 10, 12, 14, 16]

# 임계값 (레포별 설정 가능)
agents_md_max_tokens: 3000         # 원칙 4: 경고 임계값 (토큰 기반, ~200줄)
context_budget_warn_percent: 15    # 원칙 14: 인스트럭션이 컨텍스트 윈도우의 N%를 초과하면 경고
min_context_files: 2               # 원칙 14: 최소 별도 컨텍스트 파일 수

# 이슈 관리
issue_prefix: "ISSUE"              # 자동 생성 이슈 ID의 접두사
issue_dir: "issues"                # 이슈 디렉토리 위치

# 아키텍처 (복잡한 설정을 위해 별도 파일을 가리킴)
architecture_file: "architecture.yaml"

# 품질 기준 (프로젝트별 기준을 위해 별도 파일을 가리킴)
criteria_file: "criteria.yaml"     # 원칙 8: 커스텀 품질 기준

# 하네스 진화 추적 (원칙 16)
last_reviewed: "2026-03-22"        # 하네스 설정이 모델 능력에 대해 마지막으로 검토된 날짜
review_interval_days: 90           # 검토 없이 N일이 지나면 경고
```

### 2. `/harness check` — 준수 점수화

레포를 스캔하고 15+1가지 원칙에 대한 준수도를 점수화한다. MVP는 구체적인 기준으로 8가지 핵심 원칙을 검사하며, 1가지 실험적 원칙과 7가지 권고 원칙은 가이드 텍스트를 표시한다. 각 실행 시 `.harness/history/`에 스냅샷을 저장하여 시간에 따른 준수도를 추적한다.

```
$ /harness check

[원칙 3] 레포지토리를 기록의 원천으로                    [검사됨]
  ✓ issues/ 디렉토리에 3개 이슈 존재
  ✓ docs/decisions/에 2개 결정 기록 존재
  ✗ docs/plans/ 없음

[원칙 4] AGENTS.md를 목차로                              [검사됨]
  ✓ AGENTS.md 존재
  ✗ AGENTS.md가 ~4200 토큰 — 3000 토큰 임계값 초과
    탐색용 맵이어야 하며, 모놀리식 참조가 아니어야 합니다.
    큰 AGENTS.md의 알려진 실패 모드:
    1. 컨텍스트 희소 — 지침이 작업/코드 공간을 압축
    2. 과다 지침 = 무지침 — 모든 것이 "중요"하면 아무것도 중요하지 않음
    3. 급속 노후화 — 유지관리되지 않는 규칙의 무덤으로 변질
    4. 기계적 검증 불가 — 단일 블롭은 커버리지/신선도 점검에 부적합

[원칙 7] 엄격한 아키텍처 경계                            [검사됨]
  ✗ .harness/architecture.yaml 없음

[원칙 12] 평가자 분리를 통한 자가 리뷰                   [검사됨]
  ✗ agents/에 별도의 평가자 에이전트 없음
    주의: 자가 평가 편향 — 에이전트는 자신의 출력을
    일관되게 칭찬합니다. 리뷰에는 별도의 평가자 에이전트를 사용하세요.

[원칙 14] 점진적 노출                                    [검사됨]
  ✓ AGENTS.md + docs/에 3개 컨텍스트 파일
  ⚠ 인스트럭션 파일이 컨텍스트 윈도우의 ~18% 소비 (경고 > 15%)
    대용량 파일을 분할하거나 섹션을 지연 로드하는 것을 고려하세요.

[원칙 16] 하네스는 모델과 함께 진화한다                  [검사됨]
  ⚠ 마지막 검토 95일 전 (2026-03-22). 모델이 개선되었을 수 있습니다.
    불필요한 스캐폴딩이 있는지 하네스를 재검토하세요.

검사됨: 5/8 통과 | 실험적: 1개 | 권고: 7개 원칙 (아직 강제되지 않음)
스냅샷 저장됨: .harness/history/2026-06-25.json
```

각 검사는 다음을 생성:
- 상태: 통과 / 경고 / 실패
- 구체적인 발견 사항 (무엇이 잘못되었는지)
- 개선 가이드 (어떻게 고칠지)

### 3. `/harness issue` — 마크다운 네이티브 이슈 관리

경량의 하네스 인식 이슈 관리 (Backlog.md보다 간단하며, 원칙 준수에 초점):

- `create` — YAML 프론트매터가 있는 `.md` 파일로 이슈 생성
- `list` — 상태/우선순위/담당자별 이슈 목록
- `close` — 이슈를 완료로 표시
- `assign` — 사람 또는 에이전트에 할당

**이슈 파일 형식:**

```markdown
---
id: ISSUE-001
title: 인증 토큰 만료 수정
status: todo          # todo | in-progress | in-review | done
priority: high        # low | medium | high | critical
assignee: agent       # human | agent
created: 2026-03-22
---

## 설명
API 호출 중 토큰 만료가 처리되지 않음.

## 인수 기준
- [ ] 만료된 토큰에 대해 401 반환
- [ ] 자동 토큰 갱신 구현

## 계약
<!-- 선택사항: 생성자와 평가자 에이전트 간의 테스트 가능한 합의를 정의 -->
- **생성자**: 재시도 로직이 있는 토큰 갱신 미들웨어 구현
- **평가자**: 만료된 토큰 → 401 → 갱신 → 2초 이내 재시도 성공 확인
- **임계값**: 완료 표시 전 3개 테스트 시나리오 모두 통과 필요

## 에이전트 실행 로그
<!-- 하네스에 의해 자동 추가 -->
<!-- 각 항목 포함: 에이전트 역할, 소요 시간, 토큰 사용량, 비용 추정 -->
```

### 4. `/harness board` — 로컬 웹 대시보드

경량 로컬 서버로 웹 대시보드를 실행 ([Claude Code Organizer](https://github.com/mcpware/claude-code-organizer)의 무의존성 서버 아키텍처와 SSE 하트비트 자동 종료에서 영감):

**탭 1 — 이슈 칸반**
- 열: 할 일 / 진행 중 / 리뷰 중 / 완료
- 카드에 담당자(사람/에이전트), 우선순위, 계약 상태 표시
- 카드 클릭 → 이슈 상세 + 에이전트 실행 로그 + 비용 요약
- 드래그 앤 드롭 상태 변경 (라이브 서버로 구현)

**탭 2 — 준수 스코어보드**
- 15+1가지 원칙의 통과/경고/실패 상태
- 총점 (예: 7/8 핵심 통과)
- 실패 항목 클릭 → 개선 가이드
- 컨텍스트 예산 분석 (인스트럭션 토큰 vs 컨텍스트 윈도우)

**탭 3 — 준수 이력**
- `.harness/history/` 스냅샷에서 시간에 따른 점수 추이
- 원칙별 개선/퇴보 추적

**탭 4 — 지식 맵** (Phase 2)
- `docs/decisions/` 타임라인
- `docs/plans/` 목록 + 상태
- `AGENTS.md` 구조 시각화

**탭 5 — 에이전트 활동** (Phase 2)
- 이슈별 비용/토큰 추적이 있는 완료된 작업 이력
- 실행 중인 에이전트 상태 (Phase 3)

### 5. `/harness decide` — 설계 결정 기록 (Phase 2)

```markdown
---
id: DEC-001
title: JWT vs 세션 기반 인증
date: 2026-03-22
status: accepted      # proposed | accepted | rejected | superseded
---

## 맥락
...

## 결정
JWT. 이유: ...

## 결과
...
```

### 6. `/harness plan` — 실행 계획 (Phase 2)

실행 계획을 일급 산출물로 생성하고 체크인 (원칙 10).

### 7. `/harness run` — 에이전트 디스패치 (Phase 2)

특정 이슈에 대해 에이전트를 디스패치. 에이전트가 이슈 파일을 읽고, 실행하고, 결과가 이슈에 기록됨.

### 8. 훅

| 이벤트 | 동작 | 원칙 | 단계 |
|--------|------|------|------|
| SessionStart | 미해결 이슈 요약 + 준수 경고 표시 | 3, 4, 14 | MVP |
| PreToolUse(Write) | 아키텍처 경계 위반 검사 | 7 | Phase 2 |
| PostToolUse(Bash) | 린터 에러 메시지가 에이전트 친화적인지 검사 | 8 | Phase 3 |

## 플러그인 구조

이 플러그인 자체가 원칙 14(점진적 노출)를 실천한다. 각 스킬의 컨텍스트 로딩:
- **Level 1** (항상 로드): SKILL.md 프론트매터 (~100 words) — 트리거 조건과 핵심 동작
- **Level 2** (트리거 시 로드): SKILL.md 본문 (<500 lines) — 15+1가지 원칙 설명, 검사 절차
- **Level 3** (필요 시 로드): `references/principles.md` (전체 원칙 상세), `scripts/` (결정론적 검사)

```
plugins/harness-engineer/
  .claude-plugin/
    plugin.json
    settings.json                    # 검사 스크립트와 보드 서버의 권한 자동 허용
    .mcp.json                        # 프로그래밍 방식의 준수도 접근을 위한 MCP 서버 (Phase 1.5)
  skills/
    harness-init/SKILL.md
    harness-check/
      SKILL.md
      references/                    # Level 3: 원칙별 상세 가이드, 검사 실패 시 로드
        principles.md                # 15+1가지 원칙의 전체 설명 + 개선 가이드
        failure-modes.md             # AGENTS.md 4가지 실패 모드 등 알려진 안티패턴
    harness-issue/SKILL.md           # Phase 1.5
    harness-board/SKILL.md           # Phase 1.5
    harness-decide/SKILL.md          # Phase 2
    harness-plan/SKILL.md            # Phase 2
    harness-run/SKILL.md             # Phase 2
  hooks/
    hooks.json
    session-start.sh
    pre-write-check.sh               # Phase 2
  agents/
    compliance-checker.md
  scripts/
    check/                           # 결정론적 준수 검사 스크립트
    tokenizer.sh                     # 컨텍스트 예산 분석용 토큰 계수 (빠른 모드 + 정밀 모드)
    board-server/                    # SSE가 있는 경량 대시보드 서버 (Phase 1.5)
```

## MVP 범위 (Phase 1)

핵심 가치("원칙 점수화")를 최우선으로 검증. 이슈 관리는 보완 기능으로 Phase 1.5에서 제공.

| 기능 | 원칙 | 근거 |
|------|------|------|
| `/harness init` | 3, 4, 8, 10, 14, 16 | 다른 모든 것의 전제조건; `criteria.yaml`, `history/`, `last_reviewed`를 스캐폴딩. `issues/` 디렉토리는 생성하되 관리 명령은 Phase 1.5 |
| `/harness check` | 전체 15+1개 (8개 핵심 검사, 1개 실험적, 7개 권고) | 핵심 가치 — 토큰 기반 검사, 평가자 분리, 하네스 최신성, 준수 이력 포함 |
| SessionStart 훅 | 3, 4, 14, 16 | 에이전트가 자동으로 컨텍스트를 얻음; 하네스 최신성 경고 포함 |

## Phase 1.5 — 이슈 관리, 대시보드 & MCP

초기 범위를 줄이기 위해 MVP에서 분리. Phase 1 직후 즉시 출시 가능.

| 기능 | 원칙 | 근거 |
|------|------|------|
| `/harness issue` (create, list, close, assign) | 3, 12 | "레포 = 기록의 원천" 보완 기능; 계약 섹션이 평가자 분리를 지원. MVP(점수화)의 핵심 가치 검증 후 제공 |
| `/harness board` (탭 1: 칸반, 탭 2: 스코어보드, 탭 3: 이력) | 3, 16 | 사람에게 가시성 필요; SSE 자동 종료가 있는 경량 서버 |
| MCP 서버 (`check_compliance`, `list_issues`, `get_principle_guidance`) | 13 | 다른 에이전트/도구를 위한 프로그래밍 방식 접근; SessionStart 훅이 MCP를 통해 쿼리 가능 |

## Phase 2

| 기능 | 원칙 |
|------|------|
| `/harness decide` | 3 |
| `/harness plan` | 10 |
| `/harness run` | 1, 12 |
| `/harness check --fix` — 검사 실패 시 에이전트가 자동 수정 제안/적용 | 15 |
| PreToolUse 훅 — 아키텍처 검사 | 7 |
| 경계 데이터 셰이프 검증 (`boundary_validation` in architecture.yaml) | 7 |
| 대시보드 탭 4 (지식 맵) | 3, 4, 14 |
| 대시보드 탭 5 (비용 추적이 있는 에이전트 활동) | 1 |
| 인스트럭션 충돌 감지 (AGENTS.md vs CLAUDE.md vs .harness/config.yaml 모순) | 3, 8 |

## Phase 3 (향후)

| 기능 | 원칙 |
|------|------|
| 린터 에러 메시지 형식 강제 | 8 |
| 가비지 컬렉션 에이전트 — (1) doc-gardening: 노후 문서 검토→수정 PR, (2) 골든 프린시플 검사: 정기적 편차 검사→대상 리팩터링 PR (OpenAI 블로그 원문의 "황금 원칙" 패턴) | 11 |
| Playwright 기반 평가를 포함한 랄프 위검 자가 리뷰 루프 | 12 |
| 임시 관측성 가이드 | 6 |
| 내보내기/백업 (준수 스냅샷, 설정 아카이브) | 3, 16 |
| 독립 CLI 도구로 추출 (C → B) | — |

## 경쟁 포지셔닝

| | Vibe Kanban | Backlog.md | Symphony | Chorus | Harness Kit | CC Organizer | **harness-engineer** |
|---|---|---|---|---|---|---|---|
| 이슈 관리 | DB 기반 | 레포 마크다운 | 외부 (Linear) | 자체 백엔드 | DAG 태스크 | X | **레포 마크다운** |
| 에이전트 디스패치 | O | X | O | O | O (Odin CLI) | X | **Phase 2** |
| 대시보드 | O | O (웹 + TUI) | O (선택) | O | O (TaskIt) | O (웹) | **O (웹)** |
| 원칙 강제 | X | X | X | X | O (자체 19교리) | X | **O (합성된 15+1개)** |
| 레포 = 기록의 원천 | X | O | X | X | 부분적 | X | **O** |
| 지식 축적 | X | 결정 (ADR) | X | 부분적 | O (빵부스러기) | X | **O** |
| 컨텍스트 예산 분석 | X | X | X | X | X | **O** | **O** |
| MCP 도구 | X | X | X | X | X | O (4도구) | **O (3도구)** |
| 준수 이력 | X | X | X | X | X | X | **O** |
| 평가자 분리 검사 | X | X | X | X | X | X | **O** |

**차별화 요소**: 교차 출처 하네스 원칙 점수화 및 개선 가이드를 핵심으로, 레포 네이티브 마크다운 이슈 관리를 결합한 기존 도구가 없다. Harness Kit이 가장 가까운 경쟁자로, DAG 오케스트레이션을 통해 자체 19가지 교리를 강제하며 CLI(Odin)와 대시보드(TaskIt)를 포함한다. Claude Code Organizer는 컨텍스트 예산 분석과 MCP 도구를 제공하지만, 프로젝트 수준 하네스 준수가 아닌 `~/.claude/` 구성을 관리한다. 핵심 차이점: (1) harness-engineer는 자체 원칙을 정의하는 대신 OpenAI + Anthropic 출처의 원칙을 합성; (2) 별도 프레임워크 없이 무의존성 Claude Code 플러그인으로 실행; (3) [Anthropic Labs의 자가 평가 편향에 대한 실증적 발견](https://www.anthropic.com/engineering/harness-design-long-running-apps)에 기반한 준수 점수화와 컨텍스트 예산 분석 및 평가자 분리 검사를 고유하게 결합.

**경쟁 데이터 참고**: 위 도구 기능은 2026년 3월 기준 README/문서 리뷰를 바탕으로 한 것이다. 이 프로젝트들은 빠르게 발전하므로 외부 자료에 인용하기 전에 확인하라.

## 설계 결정

1. **플러그인 이름** — `harness-engineer`. 하는 일(하네스를 엔지니어링)을 설명한다.
2. **대시보드 기술** — SSE 하트비트 자동 종료가 있는 경량 로컬 서버 (무의존성 Node.js 또는 셸 기반). [Claude Code Organizer](https://github.com/mcpware/claude-code-organizer)의 아키텍처에서 영감: 포트 충돌 시 재시도, SSE 연결 추적, 모든 브라우저 탭 닫힌 후 5분 유휴 타임아웃. 원래의 정적 HTML 설계를 대체하여 영구적인 백그라운드 프로세스 없이 인터랙티브 기능(드래그 앤 드롭 칸반, 실시간 준수도 업데이트)을 구현.
3. **이슈 ID 형식** — 접두사가 있는 자동 증가: `ISSUE-001`, `ISSUE-002`. 단순하고, 읽기 쉽고, 정렬 가능. 접두사로 결정(`DEC-`) 및 계획(`PLAN-`) ID와 구분. **동시성**: `create` 명령이 기존 `ISSUE-*` 파일명을 스캔하여 다음 번호를 결정. 두 에이전트가 동시에 생성하여 충돌하면, 두 번째 쓰기가 충돌을 감지하고(파일이 이미 존재) 다음 가용 번호로 재시도. 타겟 사용 사례(솔로 개발자/소규모 팀)에 충분.
4. **설정 형식** — YAML (`.harness/config.yaml`). 나머지 생태계(AGENTS.md, 아키텍처 파일)와 일관. 사람이 읽기 쉽고. 에이전트가 읽기 쉬움.
5. **Backlog.md 차별화** — Backlog.md는 성숙한 완전 기능 태스크 매니저(웹 UI, TUI 칸반, 결정/ADR, 서브태스크, 종속성, 완료 정의)이다. 그 폭을 복제하지 않는다. 대신, 하네스 엔지니어링에 최적화된 더 가벼운 형식을 설계: 에이전트 실행 로그, 원칙 태그, 준수 통합. 핵심 차별화 요소는 harness-engineer가 15+1가지 원칙에 대해 이슈를 점수화한다는 것이며, Backlog.md는 하네스 인식 없이 태스크를 관리한다.
6. **이슈 디렉토리 위치** — 레포 루트의 `issues/` (`.harness/issues/`가 아님). 에이전트 발견 가능성을 극대화하고 "레포 지식이 기록의 원천" 원칙을 따름 — 이슈는 숨겨진 설정이 아닌 일급 레포 콘텐츠.
7. **줄 수 대신 토큰 기반 임계값** — 줄 수는 컨텍스트 소비의 부정확한 대리 지표이다. 밀도 높은 산문이 있는 200줄 AGENTS.md는 희소한 YAML이 있는 300줄 파일보다 더 많은 컨텍스트를 소비한다. 토큰 계수(`wc -c` / 4 추정 또는 토크나이저)가 더 정확한 측정을 제공한다. 기본 임계값 3000 토큰은 원래의 200줄 휴리스틱을 근사하지만 콘텐츠 밀도에 적응한다.
8. **평가자 분리 검사** — 자가 평가 시 에이전트가 "품질이 평범해 보여도 출력을 일관되게 칭찬한다"는 [Anthropic Labs의 발견](https://www.anthropic.com/engineering/harness-design-long-running-apps)에 기반. 검사는 `agents/`에서 생성자와 별도인 전용 평가자/리뷰어 에이전트를 찾는다. 이것은 구조적 휴리스틱이며, 평가자가 실제로 사용되는지는 검증할 수 없지만, 그 존재가 편향에 대한 인식을 나타낸다.
9. **이슈의 계약 섹션** — Anthropic Labs 블로그의 "생성자-평가자 계약" 패턴에서 영감. 각 스프린트 전에 생성자와 평가자가 구체적인 구현 세부사항과 테스트 가능한 성공 기준을 협상한다. 이것은 과도한 명세 없이 높은 수준의 사용자 스토리와 구현을 연결한다. 이 섹션은 선택사항이며, 생략하면 원칙 12 가이드가 권고로 표시된다.
10. **준수 이력** — 각 `/harness check` 실행 시 `.harness/history/<date>.json`에 JSON 스냅샷을 저장. 최소한의 오버헤드(파일 쓰기 한 번), 대시보드에서 추이 추적 가능, 원칙 16(하네스 진화) 강제를 위한 데이터 기반 제공.
11. **config.yaml과 CLAUDE.md/AGENTS.md의 관계** — `.harness/config.yaml`은 **검사 도구의 설정**이며 (임계값, 활성 원칙, 아키텍처 파일 경로), 에이전트 인스트럭션(AGENTS.md/CLAUDE.md)과는 별개이다. config.yaml은 어떻게 검사할지를 정의하고, AGENTS.md/CLAUDE.md는 에이전트의 행동을 지시한다. Phase 2의 인스트럭션 충돌 감지에서 이 세 파일 간의 모순도 검사한다.
12. **에이전트의 하네스 자가 수정** — OpenAI 블로그 원문: "항상 Codex 자체에서 수정사항을 작성하여 리포지터리에 다시 제공합니다." Phase 2의 `/harness check --fix`가 이 철학을 구현: 검사 실패 시 에이전트가 구체적인 수정 사항을 제안하거나 자동 적용한다.
13. **플러그인 스킬 설계 원칙** — [Lessons from Building Claude Code: How We Use Skills](https://www.anthropic.com/blog/how-we-use-skills) 블로그의 9개 카테고리 분류에 따르면, 이 플러그인의 스킬들은 Category 6 (Code Quality & Review)에 해당한다. 각 SKILL.md는 (1) 고차스 섹션 필수 포함, (2) description은 모델 관점의 트리거 조건으로 작성, (3) 참조 파일은 when-to-read 가이드와 함께 링크하여 점진적 노출을 실천한다.

## 아키텍처 정의 형식

`.harness/architecture.yaml`은 원칙 7 검사를 위한 레이어 경계를 정의:

```yaml
# OpenAI 블로그 원문의 레이어드 도메인 아키텍처를 반영한 예시.
# 프로젝트에 맞게 레이어 수와 이름을 조정할 수 있다.
layers:
  - name: types
    paths: ["src/types/**"]
    allowed_imports: []                    # types는 아무것도 임포트하지 않음
  - name: config
    paths: ["src/config/**"]
    allowed_imports: ["types"]             # config는 types만 임포트
  - name: repo
    paths: ["src/repo/**"]
    allowed_imports: ["types", "config"]   # repo는 types + config 임포트
  - name: providers                        # 교차 관심사: 인증, 커넥터, 텔레메트리, 피처 플래그
    paths: ["src/providers/**"]
    allowed_imports: ["types", "config"]
  - name: service
    paths: ["src/service/**"]
    allowed_imports: ["types", "config", "repo", "providers"]
  - name: runtime
    paths: ["src/runtime/**"]
    allowed_imports: ["types", "config", "service", "providers"]
  - name: ui
    paths: ["src/ui/**", "src/components/**"]
    allowed_imports: ["types", "config", "service", "runtime", "providers"]  # repo 직접 임포트 금지

# (Phase 2) 경계에서 데이터 셰이프 검증 — OpenAI 블로그: "경계에서 데이터 형태를 파싱"
# boundary_validation:
#   - pattern: "src/service/**/api.ts"
#     requires_one_of: ["zod", "schema", "validate", "parse"]
```

검사는 각 레이어의 파일이 허용된 레이어에서만 임포트하는지 검증한다. 위반 메시지에는 원칙 번호와 개선 방법이 포함:

```
[원칙 7] 아키텍처 경계 위반:
  src/ui/Login.tsx가 src/repo/userRepo.ts를 임포트함
  UI 레이어는 Repo 레이어를 직접 임포트할 수 없습니다.
  수정: 대신 Service 레이어 함수를 사용하세요.
```

## 준수 검사 기준 (전체 15+1가지 원칙)

각 원칙에 대해 통과/경고/실패의 구체적이고 스캔 가능한 기준 (원칙 2는 실험적 확장으로 별도 표기):

| # | 원칙 | 방법 | 통과 | 경고 | 실패 |
|---|------|------|------|------|------|
| 1 | 사람이 조종 | 결정론적 | `docs/plans/` 또는 `docs/decisions/`에 사람이 작성한 문서 존재 (사람의 의도/방향 설정 증거) | — | 계획/결정 디렉토리 없음 |
| 2 | 수동 코드 금지 | *실험적 권고* | — | — | — |
| 3 | 레포 = 기록의 원천 | 결정론적 | `issues/` + `docs/decisions/` + `docs/plans/` 모두 콘텐츠와 함께 존재 | 일부 디렉토리 비어있음 | 디렉토리 없음 |
| 4 | AGENTS.md를 목차로 | 결정론적 | `AGENTS.md` 존재하고 ≤ `agents_md_max_tokens` (기본 3000) | `AGENTS.md` 존재하나 토큰 임계값 초과 | `AGENTS.md` 없음 |
| 5 | 앱 가독성 | *권고* | — | — | — |
| 6 | 임시 관측성 | *권고* | — | — | — |
| 7 | 엄격한 경계 | 결정론적 | `.harness/architecture.yaml` 존재하고 위반 없음 | 설정 존재하나 위반 감지 | 아키텍처 설정 없음 |
| 8 | 기계적 강제 | 결정론적 | 린터 설정 감지 AND `.harness/criteria.yaml`에 커스텀 품질 기준 존재 | 린터 존재하나 `criteria.yaml` 없거나 에이전트 친화적 에러 메시지 없음 | 린터 설정 없음 |
| 9 | 고처리량 머지 | *권고* | — | — | — | *(솔로/소규모 팀에서는 전통적 리뷰 게이트가 더 적합할 수 있음)* |
| 10 | 플랜을 산출물로 | 결정론적 | `docs/plans/`에 계획 파일 존재 | 디렉토리 존재하나 비어있음 | 계획 디렉토리 없음 |
| 11 | 가비지 컬렉션 | *권고* | — | — | — |
| 12 | 평가자 분리 | 결정론적 | `agents/`에 별도의 평가자/리뷰어 에이전트 존재 (생성자와 구분, 파일 크기 > 200 bytes, `## Criteria` 또는 `## 기준` 섹션 포함) AND 이슈에 `## Contract` 섹션 존재 | 평가자 에이전트 존재하나 최소 콘텐츠 미달 또는 이슈에 계약 없음 | 평가자 에이전트 없음 — [자가 평가 편향](https://www.anthropic.com/engineering/harness-design-long-running-apps) 위험 |
| 13 | 도구는 적게 | *권고* | — | — | — |
| 14 | 점진적 노출 | 결정론적 | `AGENTS.md` 또는 `CLAUDE.md` 존재 AND 2개 이상 추가 `.md` 컨텍스트 파일 AND 총 인스트럭션 토큰 < 컨텍스트 윈도우의 `context_budget_warn_percent` | 인스트럭션 토큰이 경고 임계값 초과 | 모든 에이전트 컨텍스트가 단일 모놀리식 파일에 존재 |
| 15 | 에이전트처럼 보기 | *권고* | — | — | — |
| 16 | 하네스 최신성 | 결정론적 | `.harness/config.yaml`의 `last_reviewed`가 `review_interval_days` (기본 90) 이내 | `last_reviewed`가 만료됨 (간격 초과) | `last_reviewed` 필드 없음 — 하네스에 [불필요한 스캐폴딩](https://www.anthropic.com/engineering/harness-design-long-running-apps)이 있을 수 있음 |

**방법 열:**
- **결정론적** — 파일 존재, 토큰 수, 임포트 패턴을 검사하는 스크립트(셸/Python)로 구현. 결과는 재현 가능하고 캐시 가능. 각 실행 시 `.harness/history/`에 JSON 스냅샷 저장.
- **실험적 권고** — 원칙 1의 확장. OpenAI 블로그의 실험 조건으로 도출된 것이며, 보편적 원칙이 아님. 에이전트 전용 개발 환경에서의 선택사항.
- **권고** — MVP에서 자동 검사 없음. 개선 팁이 있는 가이드 텍스트 표시. Phase 2/3 계획.

**AGENTS.md 토큰 임계값:** 기본 3000 토큰 제한은 진입점이 "큰 인스트럭션 덤프"가 아닌 "작고 안정적인 진입점"(맵)이어야 한다는 OpenAI 블로그의 가이드에서 도출. 토큰 계수는 정확도를 위해 원래의 200줄 휴리스틱을 대체 — 밀도 높은 150줄 파일이 임계값을 초과할 수 있고 희소한 250줄 파일은 초과하지 않을 수 있음. `.harness/config.yaml` (`agents_md_max_tokens`)를 통해 설정 가능.

**토큰 추정 방법:** 기본적으로 `wc -c` / 4 (바이트/4) 사용하지만, 이 방법은 영어 기준 ~75-85% 정확도이며 **다국어 레포에서는 크게 벗어날 수 있다** (UTF-8에서 한글은 3 bytes/char이므로 바이트/4는 토큰을 과대추정). `scripts/tokenizer.sh`에 두 가지 모드를 제공한다:
- **빠른 모드** (기본): `wc -c` / 4 — 영어 중심 레포에 충분
- **정밀 모드**: Python `tiktoken` 라이브러리가 설치된 경우 사용 — `pip install tiktoken`이 감지되면 자동 전환. 다국어 레포에 권장

**컨텍스트 예산 검사:** 원칙 14에는 총 인스트럭션 토큰(AGENTS.md + CLAUDE.md + 규칙 + `@import` 확장)을 컨텍스트 윈도우(기본: 200K)의 백분율로 측정하는 컨텍스트 예산 분석이 포함. 인스트럭션 토큰이 `context_budget_warn_percent` (기본 15%)를 초과하면 에이전트 성능이 저하될 수 있다고 경고. `@import` 확장과 HTML 주석 제거를 통해 상시 로드 토큰과 지연 토큰을 측정하는 [Claude Code Organizer](https://github.com/mcpware/claude-code-organizer)의 컨텍스트 예산 기능에서 영감.

**평가자 분리:** 원칙 12는 `agents/`에 전용 평가자/리뷰어 에이전트의 존재를 검사. 자가 평가가 일관되게 실패한다는 [Anthropic Labs의 실증적 발견](https://www.anthropic.com/engineering/harness-design-long-running-apps)에 기반: "에이전트는 인간 관찰자에게 품질이 평범해 보여도 출력을 일관되게 칭찬한다. 이 문제는 주관적 작업에서 강화된다." **컴플라이언스 시어터 방지**: 파일 존재만으로는 빈 파일을 만들어 통과시키는 것을 막을 수 없으므로, 파일 크기 > 200 bytes AND `## Criteria` 또는 `## 기준` 섹션 존재를 추가로 검증한다. 검사는 또한 이슈에서 실행 전에 합의된 테스트 가능한 성공 기준을 정의하는 `## Contract` 섹션을 찾으며 — 이는 Planner/Generator/Evaluator 아키텍처에서 효과가 입증된 패턴이다.

**MVP 점수화:** 8가지 핵심 원칙이 통과/경고/실패를 생성 (결정론적 검사). 1가지 실험적 원칙(원칙 2)과 7가지 권고 전용 원칙은 가이드 텍스트만 표시. 점수는 `N/8 검사됨 | 1 실험적 | 7 권고`로 표시.

## 대시보드 서빙 메커니즘

대시보드는 SSE 기반 생명주기 관리를 갖춘 **경량 로컬 서버**이다 ([Claude Code Organizer](https://github.com/mcpware/claude-code-organizer)에서 설계 차용):

1. `/harness board` 스킬이 다음을 수행하는 스크립트를 실행:
   - 무의존성 HTTP 서버 시작 (Node.js 또는 Python `http.server`)
   - `issues/`, `docs/decisions/`, `docs/plans/`, `.harness/config.yaml`, `.harness/history/` 읽기
   - 준수 검사 실행 후 REST API를 통해 결과 제공
   - `open` (macOS) / `xdg-open` (Linux)을 통해 기본 브라우저에서 대시보드 열기
2. **SSE 하트비트 자동 종료**: 브라우저가 SSE 연결(`/heartbeat`)을 열음. 서버가 활성 클라이언트를 추적. 모든 브라우저 탭이 닫히면 5분 유휴 카운트다운 시작 후 종료. 고아 프로세스 없음.
3. **포트 충돌 처리**: 기본 포트 3850. 사용 중이면 포트를 증가시켜 자동 재시도 (최대 10회).
4. **인터랙티브 기능**: 드래그 앤 드롭 칸반 (상태 변경이 REST API를 통해 이슈 파일에 다시 쓰임), 실시간 준수 점수 업데이트, 준수 이력 추이 차트.
5. **API 엔드포인트**: `/api/scan` (이슈 + 준수도), `/api/issue/update` (상태 변경), `/api/check` (준수 검사 실행), `/api/history` (준수 스냅샷). Phase 1.5에서 동일한 엔드포인트가 MCP 서버 도구를 지원.
6. 대시보드는 각 `/harness board` 호출 시 재생성 — 디스크 파일 외에 영구 상태 없음.

## 품질 기준 형식

`.harness/criteria.yaml`은 원칙 8(취향의 기계적 강제)을 위한 프로젝트별 품질 기준을 정의한다. OpenAI 블로그 원문의 "황금 원칙"(golden principles) 개념에 대응하며, 린터 설정이 구문 수준 규칙을 강제하는 반면, criteria.yaml은 **실행 중에도 일관성을 유지하는 인코딩된 규칙**이자 에이전트 평가의 채점 루브릭 역할을 한다:

```yaml
criteria:
  # 채점 기준 (평가자 에이전트의 루브릭으로 사용)
  - name: code_quality
    weight: 0.3
    description: "함수는 50줄 미만, 명확한 네이밍, 죽은 코드 없음"
  - name: test_coverage
    weight: 0.3
    description: "모든 공개 API에 단위 테스트, 엣지 케이스 커버"
  - name: design_coherence
    weight: 0.2
    description: "일관된 스타일링 패턴, 혼합 패러다임 없음"
  - name: documentation
    weight: 0.2
    description: "공개 함수에 독스트링, 복잡한 로직에 인라인 주석"

# (Phase 3) 황금 원칙 — 정기 검사 + 자동 리팩터링 대상
# golden_principles:
#   - "공유 유틸리티 패키지를 직접 만든 헬퍼보다 선호"
#   - "경계에서 데이터를 검증하거나 유형 지정된 SDK에 의존"
#   - "에이전트가 검사하고 수정할 수 있는 형태로 시스템을 노출"
```

이 기준은 세 가지 목적으로 사용:
1. **평가자 에이전트**가 작업을 리뷰할 때 채점 루브릭으로 사용 (원칙 12). 이것은 [주관적 품질 판단을 채점 가능한 기준으로 변환](https://www.anthropic.com/engineering/harness-design-long-running-apps)하는 Anthropic Labs의 접근법을 따른다.
2. **`/harness check`**가 파일이 존재하고 콘텐츠가 있는지 확인 (원칙 8 통과 조건). 기준 자체는 MVP에서 자동으로 강제되지 않으며 — 사람과 에이전트 리뷰어에게 맥락을 제공한다.
3. **(Phase 3) 가비지 컬렉션 에이전트**가 `golden_principles`를 참조하여 정기적 편차 검사 + 대상 리팩터링 PR을 생성한다.

## 준수 이력 형식

각 `/harness check` 실행 시 `.harness/history/<YYYY-MM-DD>.json`에 스냅샷 저장 (하루에 하나, 최신 실행이 우선):

```json
{
  "date": "2026-06-25",
  "score": { "checked": 9, "passing": 7, "advisory": 7 },
  "principles": {
    "1": "pass", "3": "warn", "4": "pass", "7": "fail",
    "8": "pass", "10": "pass", "12": "fail", "14": "warn", "16": "pass"
  },
  "context_budget": {
    "instruction_tokens": 8500,
    "context_window": 200000,
    "percent_used": 4.25
  }
}
```

대시보드의 준수 이력 탭은 이러한 스냅샷을 추이 차트로 렌더링한다. 기본적으로 git 커밋되어 팀이 코드 변경과 함께 하네스 건강 상태를 추적할 수 있다.

## 범위 명확화

**Phase 1.5, Phase 2, Phase 3은 구현 계획 범위에서 명시적으로 제외된다.** 계획은 Phase 1(MVP)만 다루어야 한다: `init`, `check`, SessionStart 훅. Phase 1.5(이슈 관리, 대시보드)와 이후 단계는 방향성 맥락을 위해 나열되어 있지만, 확장 가능하게 유지하는 것을 넘어 MVP 아키텍처 결정에 영향을 미쳐서는 안 된다.

## PostToolUse(Bash) 훅 범위

린터 에러 메시지 검사를 위한 PostToolUse(Bash) 훅은 **Phase 3**이다 (원칙 8의 Phase 3 타임라인에 맞추어 훅 테이블에서 이동됨).
