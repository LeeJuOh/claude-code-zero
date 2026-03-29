# Harness Engineer 플러그인 — 재설계 명세

> **이전 스펙**: `2026-03-22-harness-engineer-plugin-design.md` — "원칙 점수화 리포트" 중심. 방향이 근본적으로 바뀌었으므로 이전 스펙은 참고용으로만 사용.
>
> **이 문서의 목적**: 2026-03-27 브레인스토밍에서 도출된 새로운 방향을 기록한다. 기존 스펙의 566줄을 대체하는 것이 아니라, **왜 방향을 바꿨는지, 무엇을 만들 건지, 각 결정의 의도가 무엇인지**를 남긴다.

---

## 1. 왜 방향을 바꿨는가

### 기존 스펙의 문제

기존 스펙은 566줄에 걸쳐 다음을 하나의 플러그인에 담으려 했다:

- 원칙 준수 점수화 (`/harness check`)
- 마크다운 이슈 관리 (`/harness issue`)
- 칸반 대시보드 (`/harness board`)
- 에이전트 디스패치 (`/harness run`)
- 실행 계획 관리 (`/harness plan`)
- 설계 결정 기록 (`/harness decide`)
- MCP 서버
- 아키텍처 린터
- 토큰/컨텍스트 예산 분석
- 가비지 컬렉션 에이전트

**3~4개의 서로 다른 제품**을 하나에 우겨넣은 상태였다. 이슈 관리는 Backlog.md가, 에이전트 디스패치는 Symphony가, 계획 관리는 OpenSpec/Spec Kit이 이미 잘하고 있었다. 차별화되지 않는 기능에 범위가 끝없이 확장되어 방향을 잃었다.

### 근본적 전환

**기존**: "원칙을 점수화하는 리포트 도구" — 건강검진표를 주는 것.
**새로운**: "원칙이 자동으로 작동하는 환경을 만드는 도구" — 자동 면역 시스템을 심는 것.

핵심 깨달음: **사용자가 원한 건 점수화가 아니라, 설치하면 레포가 에이전트 친화적으로 굴러가는 것**이었다.

### 시장 검증

2026년 초 "Harness Engineering"이 독립 엔지니어링 분야로 확립됐다. OpenAI 블로그(2026-02) 이후 [Martin Fowler 사이트에 Birgitta Böckeler가 글](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)을 쓰고, [agent-engineering.dev](https://www.agent-engineering.dev/) 같은 전문 사이트가 등장했다. **"에이전트가 느린 건 환경 탓"이라는 명제가 업계 컨센서스**.

### 진짜 차별점

기존 도구들은 각각 다른 문제를 풀고 있다:

| 도구 | 하는 일 | 안 하는 일 |
|------|---------|-----------|
| **harness-kit** (deepklarity) | 19개 원칙 기반 DAG 오케스트레이션 + Odin CLI + TaskIt 칸반. 8 provider 지원, 비용 인식 위임, 리플렉션 감사(5항목 구조화 리뷰) | **레포 환경 자체**를 분석/개선하지 않음. 에이전트 "작업"을 오케스트레이팅하는 도구 |
| **everything-claude-code** (affaan-m) | Anthropic 해커톤 우승. 28에이전트+125스킬+60명령. hook profiles (minimal/standard/strict), 인스팅트 시스템. CC+Codex+OpenCode+Cursor 크로스플랫폼 | 평가자 분리(3층) 없음. 에이전트 "성능"을 최적화하는 도구 |
| **compound-engineering** (Every, Inc.) | Brainstorm→Plan→Work→Review→Compound 워크플로우. 35+ agents, 40+ skills, 15개 리뷰어 페르소나 병렬 스폰 | 레포 환경 분석/세팅 없음. 에이전트 "워크플로우"를 강제하는 도구 |
| **Backlog.md** | 마크다운 네이티브 이슈 관리 + TUI/웹 칸반 | 원칙 인식 없음 |

**경쟁 포지셔닝**:

| 차원 | harness-kit | ECC | compound-eng | Harness Engineer |
|------|-----------|-----|-------------|------------------|
| **1층: 레포 세팅** | — | ⚠️ (install) | — | ✅ (분석→추천→승인) |
| **2층: 훅 유지** | — | ✅ (hook profiles) | — | ✅ |
| **3층: 평가자 분리** | ⚠️ (리플렉션) | — | ⚠️ (리뷰 페르소나) | ✅ **계약 기반** |
| **4층: 대시보드** | ✅ (TaskIt) | — | — | ✅ |
| 레포 환경 개선 | ❌ | ⚠️ | ❌ | ✅ **핵심** |

harness-kit과 compound-engineering은 리뷰/리플렉션이 있지만, **사전 합의된 계약으로 1:1 원자적 검증하는 패턴(3층)**은 아님. ECC는 가장 가까운 Layer 1+2 구현체이지만 평가자 분리가 없음.

**빠져있는 것: 레포 자체를 에이전트 친화적 환경으로 만들고 유지하면서, 계약 기반 평가자 분리로 작업 품질을 보장하는 도구.** [CodeRabbit 리포트](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)(2025-12, 470 PR 분석)에 따르면 AI 코드는 1.7x 더 많은 이슈를 생성한다. 그런데 에이전트는 자기 출력을 일관되게 칭찬한다(Anthropic Labs 발견). **자가 평가 편향 + AI 코드 품질 문제 = 별도 평가자가 필수**인데, 이걸 플러그인으로 패키징한 곳이 없다.

---

## 2. 무엇을 만드는가

### 한 줄 요약

**설치하면 레포가 에이전트 친화적 환경이 되고, 훅이 그 상태를 유지하며, 평가자 분리와 기준 기반 채점으로 에이전트 작업 품질을 보장하고, 사람은 대시보드로 전체를 조종한다.**

### 4층 구조

```
┌─────────────────────────────────────────────────────┐
│  4. 인터페이스  — 대시보드 (사람 ↔ 하네스 조종석)   │
├─────────────────────────────────────────────────────┤
│  3. 평가       — 계약 기반 자동 평가                 │
│                  (만든 놈 ≠ 평가하는 놈)              │
├─────────────────────────────────────────────────────┤
│  2. 유지       — 훅으로 원칙 실시간 강제/유도         │
├─────────────────────────────────────────────────────┤
│  1. 세팅       — init + organize로 에이전트 친화적 레포│
└─────────────────────────────────────────────────────┘
```

각 층은 아래 층에 의존한다. 1층 없이 2층이 작동하지 않고, 2층 없이 3층의 가치가 없다.

---

## 3. 각 층의 상세 설계와 의도

### 1층: 세팅 — `/harness init` + `/harness organize`

#### 의도

에이전트 친화적 레포의 "올바른 시작점"을 제공한다. 사용자가 처음부터 직접 구조를 설계할 필요 없이, AI가 레포를 분석하고 추천하고, 사람이 승인/수정하면 끝.

#### 왜 이게 필요한가

OpenAI 블로그에서 가장 강조한 것: "에이전트에게 1,000페이지 설명서가 아닌 **맵**을 제공해야 한다." 하지만 대부분의 레포는 이 구조가 없다. 레포 맵이 없거나, 있어도 백과사전처럼 비대하거나, 아키텍처 경계가 정의되어 있지 않다.

#### 무엇을 하는가

1. **레포 분석**: 기술 스택, 테스트 프레임워크, 린터, 기존 문서 구조를 스캔
2. **구조 추천**: 분석 결과에 기반한 레포 구조를 제안
3. **사람 승인**: 사용자가 검토하고 승인/수정
4. **스캐폴딩 생성**: 승인된 구조를 실제로 생성

#### 생성하는 것

```
.harness/
  map.md                         ← 레포 맵 소스 (~100줄, 플랫폼 무관). 맵이지 백과사전이 아님.
  config.yaml                   ← 원칙별 활성화/비활성화, 임계값 설정
  architecture.yaml             ← 레이어 경계 정의 (원칙 7)
CLAUDE.md                        ← @.harness/map.md import (CC 자동 로딩 커넥터)
docs/
  decisions/                     ← 설계 결정 기록 (원칙 3: 레포 = 기록의 원천)
  plans/                         ← 실행 계획 (원칙 10: 플랜을 일급 산출물로)
issues/                          ← 마크다운 이슈 (원칙 3)
agents/
  reviewer.md                   ← 전용 평가자 에이전트 (원칙 12, 3층의 전제조건)
```

**맵 아키텍처: agent-harness 부트스트랩 패턴**

12개 참고 프로젝트 딥리서치 결과, "소스 1개 + 플랫폼 네이티브 자동 로딩"이 최적 패턴:

- `.harness/map.md` = 소스 (플랫폼 무관, 유일한 진실)
- `CLAUDE.md` = CC 자동 로딩 커넥터 (`@.harness/map.md` import 한 줄)
- CC 공식 문서: *"CLAUDE.md fully survives compaction."* → 훅 주입 불필요, 네이티브로 영구
- 기존 CLAUDE.md가 있으면 `<!-- harness:start/end -->` 마커로 harness 섹션만 추가 (사용자 영역 보존)
- 마커는 HTML 주석이라 CC가 Claude에게 주입 시 제거되지만, `/harness sync` 도구가 섹션 관리에 사용

크로스플랫폼은 Phase 1.5에서 확장:
- `/harness export --codex` → AGENTS.md 생성
- `/harness export --gemini` → GEMINI.md 생성
- **방향**: gitagent의 어댑터 패턴을 참고하되, `.harness/map.md`를 유일한 소스로 유지. `@import`가 불가능한 플랫폼(Codex, Gemini)은 map.md 내용을 인라인 변환하여 각 플랫폼 네이티브 파일에 삽입.

**왜 AGENTS.md를 직접 생성하지 않는가**: harness-engineer는 CC 플러그인이다. CC가 네이티브로 자동 로딩하는 건 CLAUDE.md이지 AGENTS.md가 아니다. 서브디렉토리 CLAUDE.md(`.harness/CLAUDE.md`)도 온디맨드라 자동 로딩 안 됨. `.claude/rules/`는 CC 전용. CLAUDE.md `@import`가 CC에서 자동 로딩 + 압축 생존 + 크로스플랫폼 확장 가능한 유일한 조합.

**참고 프로젝트별 패턴 비교**:

| 프로젝트 | 패턴 | harness-engineer 채택 여부 |
|----------|------|--------------------------|
| OpenAI (Codex) | AGENTS.md 직접 생성 (Codex 네이티브) | ✗ CC에서는 CLAUDE.md가 네이티브 |
| gitagent | 소스 파일 → 어댑터가 플랫폼별 변환 (인라인 복사) | △ 소스 개념 채택, 인라인 대신 import |
| agent-harness | 짧은 부트스트랩 + 상세 분리 | ✓ 핵심 패턴 채택 |
| oh-my-claudecode | CLAUDE.md에 마커 영역 관리 | ✓ 마커 패턴 채택 |
| superpowers | SessionStart 훅으로 컨텍스트 주입 | ✗ 압축 시 사라질 수 있음 |
| everything-claude-code | AGENTS.md + CLAUDE.md 병행 | ✗ Phase 1에서는 CC 우선 |

#### 의도: "사람이 작성"이 아니라 "사람이 승인"

기존 스펙에서는 `criteria.yaml`, `architecture.yaml` 등을 사용자가 직접 작성해야 했다. 재설계에서는 **AI가 레포를 분석해서 추천하고, 사람은 승인/수정만 한다**. 진입 장벽을 극적으로 낮춘다.

```
$ /harness init

레포 분석 중...
- Tech stack: React + FastAPI + PostgreSQL
- 테스트: pytest + vitest 감지
- 린터: eslint + ruff 감지
- agents/ 디렉토리: 없음

추천 architecture.yaml:
  layers: [types, config, repo, providers, service, runtime, ui]
  (프로젝트 구조 기반 자동 생성)

추천 reviewer.md:
  pytest + vitest 실행 후 Guard 체크
  eslint + ruff 통과 확인

검토하시겠습니까? (수정/승인)
```

#### `/harness organize` — 도메인 지식 온보딩

init이 만든 빈 구조에 사용자의 기존 도메인 지식을 배치한다. init이 "집을 짓는 것"이라면, organize는 "가구를 배치하는 것"이다.

**왜 이게 필요한가**: init만으로는 빈 폴더만 생성된다. 사용자는 기존에 가지고 있는 설계 문서, 구현 계획, 결정 기록 등을 어디에 넣어야 할지 모른다. "빈 방에 이름표만 붙인 것"과 "실제로 필요한 물건이 제자리에 놓인 것"의 차이.

**무엇을 하는가**:

1. **구조 감지**: `.harness/` + 실제 디렉토리를 읽어서 동적 placement map 생성
2. **지식 식별**: 레포 내부 스캔 또는 사용자가 지정한 외부 경로에서 문서 발견
3. **콘텐츠 기반 분류**: 파일명이 아닌 내용을 읽어서 라이프사이클 기반으로 분류
4. **사람 승인**: 분류 결과를 테이블로 제시, 승인/수정/취소
5. **배치 실행**: 내부 파일은 `git mv`, 외부 파일은 `cp`
6. **map.md 업데이트**: 정리 결과를 .harness/map.md에 반영 (CLAUDE.md는 @import라 자동 반영)

**분류 체계** (문서 라이프사이클 기반, get-shit-done 참고):

| 라이프사이클 | 하네스 위치 | 콘텐츠 시그널 |
|-------------|------------|-------------|
| 전략 (반정적) | `docs/specs/` | 설계, 아키텍처, 요구사항 — "왜, 무엇을" |
| 실행 (일시적) | `docs/plans/` | 구현 태스크, 체크박스 — "어떻게, 언제" |
| 기록 (불변) | `docs/decisions/` | ADR, 트레이드오프 — "X를 선택한 이유" |
| 행동 (동적) | `issues/` | 버그, 기능요청 — 추적 가능한 작업 |
| 운영 (에이전트) | `agents/` | 에이전트 페르소나, 평가 기준 |
| 참고 (외부) | `docs/references/` | 외부 API 문서, llms.txt, 서드파티 레퍼런스 |

**참고 프로젝트 인사이트**:

- **get-shit-done**: 문서를 라이프사이클로 분류 (전략/실행/기록/행동/운영). `.planning/` 7종 상태 파일. SUMMARY.md 프론트매터를 머신리더블 인덱스로 활용
- **OpenSpec**: artifact type progression (proposal→spec→design→tasks). 유동적 반복 — 위상 게이트 없음
- **OpenViking**: L0→L1→L2 계층적 로딩 — 정리된 문서에 대한 요약(L1) 자동 생성으로 에이전트 탐색 효율화
- **everything-claude-code**: `/harness-audit` 결정론적 감사 — "뭐가 빠졌는지" 스코어링. 인스팅트 시스템으로 패턴 학습→스킬화
- **oh-my-claudecode**: prior artifact 존재 시 phase skip — `.omc/specs/` 존재하면 expansion 건너뜀
- **claude-code-organizer**: 11개 카테고리 + scope hierarchy + validation before move + undo/restore
- **planning-with-files**: 3개 영속 파일 (roadmap, knowledge base, session log) + 2-Action Rule로 지식 손실 방지
- **Backlog.md**: file location = state (drafts→tasks→completed→archive). YAML 프론트매터 메타데이터 표준
- **gstack**: artifact flow — `/office-hours` WRITES DESIGN.md → 다음 스킬이 READS. 스킬 간 산출물 공유
- **superpowers**: hard gate + 명시적 successor 안내 (자동 체이닝 아닌 "다음은 X를 해라")

**init과의 관계**: init은 Step 8에서 organize를 안내한다. 자동 체이닝은 하지 않는다 — 사용자에게 정리할 문서가 없을 수도 있다. organize는 `.harness/` 존재를 전제조건으로 확인하여 init 완료 여부를 감지한다. (superpowers의 "hard gate + 명시적 successor" 패턴)

---

### 2층: 유지 — 훅으로 원칙 실시간 강제/유도

#### 의도

1층에서 세팅한 환경이 시간이 지나도 **자동으로 유지**되게 한다. 사용자가 명시적으로 뭔가를 실행할 필요 없이, 플러그인을 설치한 것만으로 원칙이 지켜진다.

#### 왜 이게 핵심 가치인가

OpenAI 블로그: "단일 블롭은 기계적 점검에 적합하지 않으므로 드리프트는 불가피합니다." 시간이 지나면 맵은 비대해지고, 아키텍처 경계는 무너지고, 문서는 노후화된다. **이걸 매번 사람이 `/harness check` 해서 확인하는 건 비현실적**이다. 훅이 실시간으로 잡아야 한다.

OpenAI는 이를 "전용 린터와 CI 작업"으로 기계적으로 시행했다. CC에서의 등가물은 훅 시스템이다:

#### 구체적 훅 설계

**SessionStart 훅** — 세션 시작 시 자동 실행:

| 검사 | 메시지 예시 | 근거 원칙 |
|------|-----------|----------|
| .harness/ 부재 | ".harness/가 없습니다. /harness init을 실행하세요." | — |
| map.md 토큰 초과 | "map.md: 4,200 토큰 (제한: 3,000). 맵이어야 합니다." | P4: 맵을 목차로 |
| 평가자 에이전트 부재 | "agents/에 전용 평가자가 없습니다. 자가 평가 편향 주의." | P12: 평가자 분리 |
| 하네스 미검토 | "95일째 미검토. 검토 제안: ① architecture.yaml — 모델이 자체적으로 경계를 지키는가? ② map.md 크기 제한 — 컨텍스트 윈도우가 커졌다면 한도를 올릴 수 있는가? ③ reviewer.md — 모델이 자체 달성하는 기준이 있는가?" | P16: 하네스는 모델과 진화 |
| 미해결 이슈 요약 | "미해결 이슈 3개: ISSUE-001 (high), ..." | P3: 레포 = 기록의 원천 |
| 컨텍스트 예산 경고 | "인스트럭션 토큰이 컨텍스트 윈도우의 18%를 소비합니다." | P14: 점진적 노출 |

**PreToolUse(Write|Edit) 훅** — 파일 쓰기 시 자동 실행:

| 검사 | 동작 | 근거 원칙 | 훅 타입 | 출력 |
|------|------|----------|---------|------|
| map.md에 쓰기 시 토큰 확인 | tool call **차단** | P4 + P14 | command (Write/Edit 각각 `if`로 분리) | `permissionDecision: "deny"` |
| architecture.yaml 경계 위반 | tool call **차단** | P7: 엄격한 경계 | command (파일 경로 패턴 매칭 + import grep) | `permissionDecision: "deny"` |

**훅 강제 수준** — config.yaml의 `hook_strictness`에 따라:

| 수준 | PreToolUse 동작 | Stop 동작 | 근거 |
|------|----------------|-----------|------|
| **strict** | `permissionDecision: "deny"` (차단) | agent QA 게이트 활성 | 위반 시 무조건 차단, 완료 시 자동 검증 |
| **standard** (기본) | `permissionDecision: "deny"` (차단) | agent QA 게이트 활성 | 위반 시 차단, 완료 시 자동 검증 |
| **lenient** | `permissionDecision: "ask"` (사용자에게 물어봄) | QA 게이트 **비활성** | 사용자가 override 가능, Stop 시 검증 안 함 |

이전 버전의 훅은 `additionalContext`(경고)를 사용하여 에이전트가 무시할 수 있었다. 재설계에서는 CC 공식 문서가 지원하는 `permissionDecision: "deny"`를 사용하여 **tool call 자체를 차단**한다. gstack의 `/freeze` 패턴(permissionDecision: "deny"로 디렉토리 밖 편집 차단)이 이 메커니즘을 검증했다.

**Stop 훅** — 작업 완료 시 자동 실행 (hook_strictness가 lenient이면 비활성):

| 검사 | 동작 | 근거 원칙 |
|------|------|----------|
| 테스트/린터 통과 여부 | `ok: false` → Claude가 계속 작업 | P12: 평가자 분리 |
| map.md ↔ 코드 구조 싱크 | map.md 업데이트 유도 | P4: 맵을 목차로 |

훅 타입: **agent** (timeout: 120s). 단일 서브에이전트가 reviewer.md를 읽고 두 검사를 모두 수행한다 (서브에이전트 2개가 아닌 1개).

Stop agent 훅은 서브에이전트를 스폰하여 `reviewer.md`의 기준에 따라 검증한다. **이것이 Phase 1에서 "생성자 ≠ 평가자" 원칙을 구현하는 핵심 메커니즘.** reviewer.md를 만들기만 하는 것이 아니라, Stop 시점에 자동으로 reviewer.md 기준에 따라 검증하고, 실패 시 Claude에게 계속 작업하도록 `ok: false`를 반환한다.

Stop agent 훅은 반드시 `stop_hook_active` 필드를 체크하여 무한 루프를 방지해야 한다 (CC 공식 문서 명시).

**훅 설계 원칙 (공식 문서 + 생태계 검수 결과)**:
- PreToolUse `if` 필드는 파이프(`|`) 미지원 → Write/Edit 훅 엔트리를 각각 분리
- 아키텍처 경계 검사는 command 훅으로 충분 (Agent 훅은 매 쓰기마다 서브에이전트 스폰으로 비현실적)
- Stop 훅은 `stop_hook_active` 필드를 체크하지 않으면 무한 루프 발생 (공식 문서 명시)
- HTML 마커(`<!-- harness:start/end -->`)는 CC가 Claude에게 주입 시 제거됨 → `/harness sync` 도구용으로만 사용
- CC 훅은 4가지 타입 지원: command (셸 스크립트), http (외부 서비스), prompt (LLM 판단), agent (서브에이전트 검증)
- PreToolUse의 `permissionDecision`은 `"allow"` | `"deny"` | `"ask"` 3가지 값 지원 (공식 문서 확인)
- agent 타입 훅은 파일 읽기, 코드 검색, 도구 사용이 가능하여 실제 테스트 실행 가능 (timeout: 최대 10분)

**PostToolUse(Bash) 훅** — 명령 실행 후:

| 검사 | 동작 | 근거 원칙 |
|------|------|----------|
| 린터 에러 메시지 확인 | 에이전트 친화적 에러 메시지를 `additionalContext`로 주입 | P8: 취향의 기계적 강제 |

#### 의도: "체크"가 아니라 "가드레일"

기존 스펙의 `/harness check`는 사용자가 수동으로 실행하는 리포트였다. 2층의 훅은 **에이전트가 잘못된 방향으로 가려 할 때 실시간으로 막거나 유도**하는 가드레일이다. 사용자가 아무것도 안 해도 작동한다.

PreToolUse 훅은 `permissionDecision: "deny"`로 tool call을 **차단**하고, Stop agent 훅은 `ok: false`로 작업 완료를 **차단**한다. 경고(additionalContext)는 PostToolUse에서만 사용 — 이미 실행된 결과에 대한 피드백이므로 차단이 불가능하기 때문이다.

---

### 3층: 평가 — 계약 기반 자동 평가

#### 의도

에이전트가 일을 끝냈을 때 "다 했어요 완벽해요"라고 자기가 판단하는 것을 막는다. **만든 놈이 아닌 별도의 평가자가, 사전에 합의된 기준으로 검증**한다.

#### 왜 이게 필요한가 — 자가 평가 편향

Anthropic Labs 블로그에서 발견한 문제:

> "에이전트는 인간 관찰자에게 품질이 평범해 보여도 출력을 일관되게 칭찬한다. 이 문제는 주관적 작업에서 강화된다."

에이전트에게 "이 코드 괜찮아?"라고 물으면 거의 항상 "훌륭합니다!"라고 답한다. 자기가 만든 결과물에 대한 평가를 자기가 하면 안 된다.

#### Labs 블로그의 해법: 생성자 ≠ 평가자

Labs는 게임 에디터를 만들 때 이렇게 했다:
- **생성자 에이전트**: 코드를 짠다
- **평가자 에이전트**: Playwright로 앱을 직접 클릭하며 검증한다
- **스프린트 계약**: 작업 전에 "뭘 만들 건지"와 "어떻게 검증할 건지"를 합의한다

평가자가 Sprint 3에서 찾은 문제 예시:

| 계약 항목 | 평가자 발견 |
|----------|-----------|
| "사각형 채우기 도구로 드래그하면 영역을 채운다" | FAIL — 드래그 시작/끝점에만 타일 배치. fillRectangle 함수가 mouseUp에서 트리거 안 됨 |
| "엔티티 스폰 포인트를 선택 후 삭제할 수 있다" | FAIL — Delete 핸들러가 selection + selectedEntityId 둘 다 필요하지만 클릭 시 하나만 설정됨 |

이 수준의 구체적 피드백이 있어야 생성자가 실제로 고칠 수 있다.

#### autoresearch 생태계와의 융합

Labs의 생성자-평가자 패턴은 autoresearch 생태계의 루프 패턴과 구조가 같다:

```
Labs:        만든다 → 평가한다 (기준) → 실패 → 피드백 → 다시 만든다
Autoresearch: 수정한다 → 검증한다 (메트릭) → 실패 → revert → 다시 수정한다
```

autoresearch가 이 루프를 더 엄격하게 만드는 프로토콜을 추가한다:

| autoresearch 패턴 | 출처 | 3층에서의 역할 |
|------------------|------|--------------|
| **1:1 검증** | AI-Researcher Judge Agent | 계약 항목을 원자적으로 하나씩 체크. "전체적으로 좋은가?" 대신 "항목 1 통과? 항목 2 통과?" |
| **Guard 분리** | uditgoenka autoresearch | "기준을 충족하나?" (품질 검사)와 "다른 게 깨졌나?" (회귀 검사)를 분리. 다른 관심사를 섞지 않음 |
| **Stuck 감지** | uditgoenka autoresearch | 연속 N회 실패 → 세부 수정이 아니라 접근 방식 자체를 재분석. 같은 실수 반복 방지 |
| **커밋 후 검증** | uditgoenka, pi-autoresearch | git commit을 먼저 하고 검증. 실패 시 revert. 실패 이력이 보존되어 학습 가능 |

#### 평가자 부트스트랩 — autoresearch 루프를 reviewer.md 자체에 적용

Labs: "Out of the box, Claude is a poor QA agent... It took several rounds of this development loop before the evaluator was grading in a way that I found reasonable."

reviewer.md는 생성 직후 평가 품질이 낮다. **Phase 1의 Stop agent 훅이 reviewer.md를 사용하기 시작하면 즉시** 아래 캘리브레이션 루프를 적용한다:

```
1. reviewer.md가 Stop 훅에서 리뷰 실행
2. 사람이 리뷰 결과를 검토 ("이건 과잉 지적", "이건 놓침")
3. 피드백을 reviewer.md에 반영 (수동 편집 또는 /harness calibrate)
4. 다음 Stop 훅에서 개선된 reviewer.md가 리뷰
5. 3~5회 반복 후 안정
```

**이 루프는 Phase 2를 기다리지 않는다.** Phase 1의 Stop agent 훅이 reviewer.md를 실행하는 순간부터 캘리브레이션이 시작된다. Phase 2에서 추가되는 것은 계약 기반 1:1 검증과 자동화된 캘리브레이션(사람이 "과잉 지적" 피드백을 주면 reviewer.md가 자동 패치되는 Hermes 패턴)이다.

코드에 적용하는 루프와 구조가 동일하되, 대상이 평가자 프롬프트인 메타 레벨 캘리브레이션이다.

#### 구체적 흐름

```
1. 이슈 생성/작업 시작
   → AI가 이슈 내용 + 코드베이스를 보고 평가 계약을 생성
   → 사람이 승인/수정
   (기준은 프로젝트 레벨 고정이 아니라 작업별로 다름)

2. 에이전트가 작업
   → git commit (검증 전에 커밋 — autoresearch 패턴)

3. 평가 (reviewer.md가 자동 실행)
   → 계약 항목 1:1 확인: 각 항목마다 ✓/✗ + 구체적 증거
   → Guard: 테스트/린터 전체 통과? (회귀 검사)
   → 전부 통과 → done
   → 실패 → 구체적 피드백과 함께 돌려보냄
   → 연속 N회 실패 → "접근 방식 자체를 바꿔라" (stuck 감지)
```

#### 의도: 평가 기준은 작업마다 다르다

기존 스펙에서 `criteria.yaml`은 프로젝트 레벨 고정 기준이었다. 하지만 "인증 토큰 만료 수정"과 "랜딩 페이지 리디자인"의 평가 기준이 같을 리 없다.

재설계에서 평가 기준은 **이슈 파일 안에 작업별로 생성**된다:

```markdown
---
id: ISSUE-001
title: 인증 토큰 만료 수정
status: todo
assignee: agent
---

## 설명
API 호출 중 토큰 만료가 처리되지 않음.

## 계약 (AI 생성 → 사람 승인)
- [ ] 만료된 토큰으로 API 호출 시 401 반환
- [ ] 자동 갱신 후 2초 이내 재시도 성공
- [ ] 기존 pytest 전체 통과 (Guard)

## 평가자 리뷰
<!-- 작업 완료 후 reviewer.md가 위 계약 기준으로 1:1 검증 -->
<!-- 각 항목: ✓/✗ + 구체적 증거 -->
```

프로젝트 레벨 `criteria.yaml`은 존재할 수 있지만, 역할이 다르다 — "우리 프로젝트는 전반적으로 이런 걸 중시한다" 수준의 기본 방향. 실제 평가는 이슈별 계약이 수행한다.

#### 의도: "사람이 작성"이 아니라 "AI가 추천, 사람이 승인"

1층과 같은 원칙. 이슈를 만들 때 AI가 이슈 내용과 코드베이스 맥락을 보고 적절한 계약을 추천한다. 사람은 승인/수정만 하면 된다:

```
/harness issue create "인증 토큰 만료 수정"

추천 계약:
- [ ] 만료된 토큰으로 API 호출 시 401 반환
- [ ] 자동 갱신 후 2초 이내 재시도 성공
- [ ] 기존 pytest 전체 통과 (Guard)

수정할 부분 있으면 말씀하세요.
```

---

### 4층: 인터페이스 — 대시보드 (사람 ↔ 하네스 조종석)

#### 의도

대시보드는 "보는 창"이 아니라 **사람이 하네스 시스템을 조종하는 곳**이다. 이슈 등록, 평가 계약 검토/승인, 평가 결과 확인, 원칙 준수 현황을 한 곳에서.

#### 왜 "인터페이스"인가

원칙 3이 "레포 = 기록의 원천"이면, 이슈도 레포에 있어야 하고, 사람이 그걸 관리할 수 있는 인터페이스도 자연스럽게 필요하다. 이건 "있으면 좋은 것"이 아니라 **원칙을 따르면 자연스럽게 필요한 것**이다.

#### 두 가지 인터페이스

| 인터페이스 | 역할 | 빈도 |
|-----------|------|------|
| **Claude Code 대화** (이미 있음) | 이슈 등록, 계약 승인/수정, 평가 결과 확인 | 매번 |
| **웹 대시보드** (추가) | 칸반 전체 보기, 준수 현황, 이력 추이, 드래그앤드롭 | 가끔 |

**핵심 조종은 Claude Code 대화에서 일어난다.** 사용자가 이미 터미널에 있으니까. 웹 대시보드는 "한 발 물러서 전체 그림을 볼 때" 사용.

#### 웹 대시보드 기술: claude-code-organizer 패턴

참고 프로젝트들을 조사한 결과, claude-code-organizer의 패턴이 가장 적합:

- **무의존성 Node.js 서버** (npm install 불필요)
- **순수 HTML/CSS/JS** (프레임워크 없음)
- **SSE 하트비트 자동 종료**: 브라우저가 SSE 연결을 열고, 서버가 활성 클라이언트를 추적. 모든 탭이 닫히면 5분 후 자동 종료. 고아 프로세스 없음.
- **REST API**: 마크다운 파일(issues/, .harness/, docs/) 읽기/쓰기
- **`/harness board`** 하면 서버 뜨고 브라우저 열림, 탭 닫으면 알아서 꺼짐

대시보드 대안으로 정적 HTML(proofshot, visual-explainer 패턴)과 TUI(pi-autoresearch 3단계 패턴)도 검토했으나:
- 정적 HTML: 동기화 안 됨, 매번 재생성 필요 → 불편
- TUI: UI 제한적, Claude Code 플러그인에서 pi-autoresearch 스타일 위젯 구현 불가

#### 대시보드가 보여주는 것

- **이슈 칸반**: 할 일 / 진행 중 / 리뷰 중 / 완료
- **평가 결과**: 이슈별 계약 항목 통과/실패, 평가자 리뷰 내용
- **원칙 준수 현황**: 15+1 원칙의 상태 (기존 `/harness check`의 역할을 흡수)
- **준수 이력**: 시간에 따른 추이 차트

#### 대시보드에서 사람이 하는 것

- 이슈 등록 (또는 AI가 추천한 이슈 승인)
- 평가 계약 검토/승인/수정
- 이슈 상태 변경 (드래그앤드롭)
- 평가 결과 확인

---

## 4. 기존 `/harness check`의 위치

기존 스펙의 핵심이었던 "15+1 원칙 점수화 리포트"는 **별도 스킬이 아니라 4층 대시보드의 탭으로 흡수**된다.

이유:
- 1~3층이 제대로 돌아가면, 원칙 위반은 2층 훅이 실시간으로 잡고, 작업 품질은 3층 평가가 보장한다.
- 전체 현황을 보고 싶을 때는 대시보드에서 보면 된다.
- 별도로 `/harness check`를 수동 실행할 이유가 없다.

다만, CLI에서 빠르게 확인하고 싶은 경우를 위해 `/harness status` 같은 가벼운 요약을 제공할 수는 있다. 이건 대시보드의 내용을 터미널에 텍스트로 출력하는 것일 뿐, 별도 기능이 아니다.

---

## 5. 출처 융합 — 각 출처가 어디에 기여하는가

### OpenAI Harness Engineering 블로그

> 원문: `docs/origin/Harness Engineering .md`
> 원본: https://openai.com/index/harness-engineering/

**기여 영역**: 1층(환경 세팅), 2층(원칙 유지)

이 블로그가 이 플러그인의 출발점이다. OpenAI가 5개월간 에이전트만으로 제품을 만들면서 발견한 것:

- **맵을 목차로**: OpenAI는 "하나의 큰 AGENTS.md" 접근법이 실패함을 발견. (1) 컨텍스트 희소, (2) 과다 지침 = 무지침, (3) 급속 노후화, (4) 기계적 검증 불가. 우리는 `.harness/map.md`(소스) + `CLAUDE.md` @import(CC 자동 로딩)로 구현. → 2층 훅이 map.md 크기를 실시간 감시
- **레포 = 기록의 원천**: 에이전트가 접근할 수 없는 지식은 존재하지 않는 것과 같다. Slack 토론, 사람의 머릿속 지식은 레포에 기록되어야 한다. → 1층이 docs/decisions/, docs/plans/, issues/ 구조를 세팅
- **엄격한 아키텍처 경계**: 에이전트는 제약이 있어야 속도를 낸다. OpenAI는 맞춤형 린터로, CC에서는 PreToolUse command 훅으로. → 1층이 architecture.yaml 세팅, 2층 훅이 위반 감지
- **취향의 기계적 강제**: 린터 에러 메시지를 에이전트 컨텍스트에 수정 지침으로 활용. → 2층 PostToolUse 훅
- **점진적 노출**: 에이전트가 작고 안정적인 진입점에서 시작하여 필요할 때 깊이 탐색. → 1층이 CLAUDE.md(@import=진입점) + .harness/map.md(맵) + docs/(상세) 구조를 세팅, 2층이 컨텍스트 예산 감시
- **가비지 컬렉션**: 정기적 편차 검사 + 자동 리팩터링. "기술 부채는 고금리 대출". → 향후 확장 영역
- **하네스는 모델과 진화한다**: 모델이 개선되면 불필요한 스캐폴딩 제거. → 2층 SessionStart에서 "하네스 미검토" 경고

Kozyrkov의 12규칙 구조화 (https://www.youtube.com/watch?v=BabEnt6VjtE) 도 OpenAI 블로그의 서술적 내용을 개별 규칙으로 분류한 유용한 참고자료.

### Anthropic "Lessons from Building Claude Code: How We Use Skills" 블로그

> 원문: `docs/origin/Lessons from Building Claude Code: How We Use Skills.md`
> 원본: https://www.anthropic.com/blog/how-we-use-skills

**기여 영역**: 플러그인 자체의 설계 원칙

이 블로그는 Anthropic이 Claude Code 내부에서 수백 개 스킬을 사용하면서 배운 것. 이 플러그인의 **각 스킬을 어떻게 설계할지**를 안내:

- **9개 스킬 카테고리**: 이 플러그인은 Category 6 (Code Quality & Review)에 해당
- **고차스 섹션이 가장 높은 ROI**: 모든 SKILL.md에 Gotchas 필수 포함
- **스킬은 폴더이지 마크다운 파일이 아니다**: 파일 시스템 자체가 컨텍스트 엔지니어링이자 점진적 노출. Level 1(프론트매터) → Level 2(SKILL.md 본문) → Level 3(references/, scripts/)
- **description은 모델 관점의 트리거 조건**: 요약이 아니라 "언제 이 스킬을 사용할지"를 모델에게 알려주는 것
- **당연한 것을 말하지 마라**: Claude가 이미 아는 것을 반복하면 컨텍스트 낭비. 기본 패턴에서 벗어나게 하는 정보에 집중
- **Claude를 레일로딩하지 마라**: 필요한 정보를 주되, 상황에 적응할 유연성을 제공
- **온디맨드 훅**: 항상 켜져있을 필요 없는 가드레일을 스킬 실행 시에만 활성화
- **셋업 패턴**: config.json에 사용자별 설정을 저장, 최초 실행 시 lazy initialization
- **메모리 & 데이터 저장**: `${CLAUDE_PLUGIN_DATA}`에 영구 데이터 저장 (스킬 디렉토리는 업그레이드 시 삭제됨)
- **스크립트 & 코드 생성**: 결정론적 작업은 스크립트로. Claude가 매번 재구성하는 대신 composition에 집중하게

### Anthropic Labs "Harness Design for Long-Running Application Development" 블로그

> 원문: `docs/origin/Harness design for long-running application development .md`
> 원본: https://www.anthropic.com/engineering/harness-design-long-running-apps

**기여 영역**: 3층(평가)

이 블로그는 Labs 팀이 프론트엔드 디자인 + 장기 실행 코딩에서 발견한 것. 3층의 핵심 근거:

- **자가 평가 편향**: "에이전트는 인간 관찰자에게 품질이 평범해 보여도 출력을 일관되게 칭찬한다." → 3층의 존재 이유
- **생성자 ≠ 평가자 분리**: 만든 에이전트가 아닌 별도 평가자가 검증. "평가자를 단독으로 회의적으로 튜닝하는 것이 생성자를 자기 비판적으로 만드는 것보다 훨씬 쉽다." → reviewer.md
- **스프린트 계약**: 작업 전에 생성자-평가자가 "완료의 정의"를 합의. "스펙은 의도적으로 high-level이었고, 계약이 사용자 스토리와 테스트 가능한 구현을 연결." → 이슈의 계약 섹션
- **기준 기반 채점**: "아름다운가?"는 답할 수 없지만 "우리 원칙을 따르는가?"는 채점할 수 있다. 주관적 판단을 채점 가능한 기준으로 변환. → criteria.yaml + 작업별 계약
- **Playwright로 실제 검증**: 평가자가 코드를 읽는 게 아니라 앱을 직접 클릭하며 검증. → reviewer.md가 테스트를 실행하는 패턴
- **하네스는 모델과 함께 단순화**: Opus 4.5에서 필요했던 스프린트 분해가 Opus 4.6에서 불필요해짐. "모든 하네스 구성요소는 모델이 혼자 할 수 없다는 가정을 인코딩하며, 그 가정은 스트레스 테스트할 가치가 있다." → 2층의 하네스 최신성 경고

### autoresearch 생태계

> 분석 문서: `docs/superpowers/specs/2026-03-27-autoresearch-ecosystem-analysis.md`
> 원본 목록: https://github.com/alvinunreal/awesome-autoresearch

**기여 영역**: 3층(평가)의 루프 규율 강화

Labs의 생성자-평가자 패턴에 autoresearch의 기계적 루프 프로토콜을 융합:

- **1:1 검증** (AI-Researcher Judge Agent): 계약 항목을 원자적으로 하나씩 확인. "전체적으로 좋은가?" 대신 "항목 1 통과? 항목 2 통과?" — 주관적 전체 판단을 원자적 사실 확인으로 분해
- **Guard 분리** (uditgoenka autoresearch): "기준을 충족하나?" (품질 검사)와 "다른 게 깨졌나?" (회귀 검사)를 분리. 하나의 검사에 두 관심사를 섞지 않음
- **Stuck 감지** (uditgoenka autoresearch): 연속 N회 실패 → 세부 수정 반복이 아니라 접근 방식 자체를 재분석. 같은 실수를 반복하는 루프에 빠지지 않게
- **커밋 후 검증** (uditgoenka, pi-autoresearch): git commit을 먼저 하고 검증. 실패 시 git revert. revert는 이력을 보존하여 "왜 실패했는지"를 학습 가능하게 함 (reset은 이력을 삭제)

### 기타 참고 출처

- **Seeing Like an Agent** (Thariq, Claude Code 팀, https://x.com/trq212/status/2027463795355095314): 에이전트 액션 스페이스 설계 철학. "도구는 적게, 표현력은 크게" 등
- **Building Effective Agents** (Anthropic Research, https://www.anthropic.com/research/building-effective-agents): 기본 철학 — "단순하고 조합 가능한 패턴 > 복잡한 프레임워크"
- **harness-engineer-reference-map** (`docs/superpowers/specs/harness-engineer-reference-map.md`): references/ 폴더의 60+ 프로젝트 중 20개를 상세 분석한 경쟁/참고 매핑

---

## 6. 15+1 원칙과 각 층의 매핑

원칙의 전체 정의는 기존 스펙(`2026-03-22-harness-engineer-plugin-design.md`)의 "15+1가지 원칙" 섹션에 있다. 여기서는 각 원칙이 4층 구조에서 어디에 매핑되는지만 정리:

| # | 원칙 | 층 | 어떻게 |
|---|------|---|--------|
| 1 | 사람이 조종, 에이전트가 실행 | 4 | 대시보드가 사람의 조종석 |
| 2 | 수동 코드 금지 (실험적) | — | 강제 대상 아님. 선택 사항 |
| 3 | 레포 = 기록의 원천 | 1, 4 | init이 구조 세팅 + 대시보드에서 이슈/결정/계획 관리 |
| 4 | 맵을 목차로 | 1, 2 | init이 .harness/map.md 생성 + CLAUDE.md에 import + 훅이 크기 감시 |
| 5 | 앱 가독성 | — | 가이드 텍스트 (프로젝트 맥락 의존적) |
| 6 | 임시 관측성 | — | 가이드 텍스트 (프로젝트 맥락 의존적) |
| 7 | 엄격한 경계 | 1, 2 | init이 architecture.yaml 세팅 + 훅이 위반 감지 |
| 8 | 취향의 기계적 강제 | 2 | 훅이 린터 에러 메시지 확인 |
| 9 | 고처리량 머지 | — | 가이드 텍스트 (팀 규모 의존적) |
| 10 | 플랜을 산출물로 | 1 | init이 docs/plans/ 세팅 |
| 11 | 가비지 컬렉션 | — | 향후 확장 (자동 doc-gardening 에이전트) |
| 12 | 평가자 분리 (랄프 위검) | 1, 3 | init이 reviewer.md 세팅 + 3층이 자동 평가 실행 |
| 13 | 도구는 적게, 표현력은 크게 | — | 플러그인 설계 철학으로 반영 |
| 14 | 점진적 노출 | 1, 2 | init이 .harness/map.md(맵) + docs/(상세) 구조 세팅 + CLAUDE.md @import로 점진적 로딩 + 훅이 컨텍스트 예산 감시 |
| 15 | 에이전트처럼 보기 | — | 가이드 텍스트 |
| 16 | 하네스는 모델과 진화 | 2 | SessionStart에서 하네스 최신성 경고 |

**15+1개 중 10개가 1~3층에서 자동으로 작동**, 1개는 4층, 5개는 가이드 텍스트. "가이드 텍스트"인 5개(P2, P5, P6, P9, P15)는 프로젝트 맥락이나 팀 규모에 의존하여 기계적 강제가 불가능한 원칙들.

---

## 7. 구현 우선순위

### Phase 1: 1층 + 2층 (핵심)

설치하면 자동으로 작동하는 최소 제품.

- `/harness init` — 레포 분석 → .harness/map.md 생성 → CLAUDE.md에 @import 추가 → 구조 추천 → 승인 → 스캐폴딩
- `/harness organize` — 기존 도메인 지식을 하네스 구조에 온보딩
- SessionStart 훅 — .harness/ 유무, map.md 크기, 평가자 부재, 하네스 최신성, 컨텍스트 예산
- PreToolUse(Write|Edit) 훅 — map.md 비대화 시 **차단** (`permissionDecision: "deny"`), 아키텍처 경계 위반 시 **차단**
- Stop agent 훅 — reviewer.md 기준으로 테스트/린터 검증 + map.md ↔ 코드 구조 싱크 (`stop_hook_active` 체크)

### Phase 2: 3층 (평가)

작업 품질 보장.

- `/harness issue create` — AI가 계약 추천, 사람 승인
- reviewer.md — 계약 기반 1:1 검증 + Guard + Stuck 감지
- 평가 루프 통합
- reviewer.md 자동 캘리브레이션 — 사람 피드백으로 reviewer.md 자동 패치 (Hermes 스킬 자가 수정 패턴)
- SQLite 상태 영속 — `${CLAUDE_PLUGIN_DATA}/harness.db`에 위반 이력, 준수 추이, 세션별 메트릭 저장 (Mission-Control Trust scoring 참고)
- LSP 번들링 — `.lsp.json`으로 Pyright/TypeScript-LS 번들, AST 수준 아키텍처 경계 검사 (CC 공식 문서에서 확인된 기능)

### Phase 3: 4층 (인터페이스)

사람의 조종석.

- `/harness board` — claude-code-organizer 패턴 웹 대시보드
- 이슈 칸반 + 평가 결과 + 원칙 현황 + 이력 추이
- Claude Code 대화에서의 조종 인터페이스

### 향후 기술 로드맵

Phase 1-3 범위 밖이지만 방향을 명시하여 설계 결정에 영향을 주는 기술들:

| 기술 | 출처 | 시점 | 설명 |
|------|------|------|------|
| **학습 루프** | ECC 인스팅트 시스템 | Phase 3+ | PostToolUse 훅이 도구 사용을 `${CLAUDE_PLUGIN_DATA}/observations.jsonl`에 기록 → SessionStart에서 패턴 분석 → 자주 위반되는 경계를 사전 경고 |
| **ACPX Flow 참고 평가 파이프라인** | ACPX | Phase 3+ | 3층 평가를 선언적 Flow 그래프로 구성: test(action) → lint(action) → review(agent) → checkpoint. 결정론적 단계와 비결정론적 단계를 명시적으로 분리 |
| **크로스세션 검색** | Hermes FTS5 | Phase 3+ | SQLite FTS5로 과거 세션의 위반/수정 이력을 검색하여 학습 |

**설계 영향**: Phase 1의 config.yaml은 flat YAML로 충분하지만, Phase 2에서 SQLite로 전환할 것을 고려하여 `harness__read_config` 함수를 추상화해둔다. Phase 1의 훅 스크립트는 출력 형식을 함수로 분리하여(`harness__deny`, `harness__allow`, `harness__ask`) Phase 2에서 HTTP 훅이나 agent 훅으로 전환 시 수정을 최소화한다.

---

## 8. 기존 스펙과의 관계

기존 스펙(`2026-03-22-harness-engineer-plugin-design.md`)은 **참고용으로 보존**한다. 삭제하지 않는 이유:

1. 15+1 원칙의 전체 정의, 출처 매핑, 근거가 여전히 유효
2. 준수 검사 기준 표 (통과/경고/실패)의 세부 사항이 2층 훅 구현 시 참고됨
3. 토큰 추정 방법, 아키텍처 정의 형식, 이슈 파일 형식 등 기술적 세부사항이 활용 가능
4. 경쟁 포지셔닝 분석이 참고됨

**바뀐 것**:
- 핵심 가치: "점수화 리포트" → "자동으로 작동하는 환경"
- 제품 구조: 7개 스킬 + MCP → 4층 구조 (init, 훅, 평가, 대시보드)
- criteria.yaml: 프로젝트 레벨 고정 → 작업별 계약 (AI 생성, 사람 승인)
- `/harness check`: 핵심 기능 → 대시보드에 흡수
- 대시보드: "보는 창" → "사람 ↔ 하네스 조종석"
- 3층 평가: Labs 패턴 단독 → Labs + autoresearch 융합

**안 바뀐 것**:
- 15+1 원칙 프레임워크 자체
- 플러그인 형태 (Claude Code 플러그인)
- 타겟 사용자 (Claude Code 사용자, 솔로/소규모 팀)
- 레포 네이티브 마크다운 기반 접근
- claude-code-organizer 패턴의 대시보드 기술

---

## 9. 2026-03-29 스펙 개선 — 생태계 리서치 기반

### 개선 근거

12개 참고 프로젝트 심층 분석(Symphony, ECC, Harness-Kit, Agent-Orchestrator, gitagent, gstack, Mission-Control, oh-my-claudecode, agent-harness, Hermes, ACPX, Walnut) + CC 공식 문서(hooks, hooks-guide, plugins-reference) 검수 결과.

### 핵심 발견

1. **CC 훅은 tool call을 차단할 수 있다** — `permissionDecision: "deny"` (공식 문서 확인, gstack `/freeze`가 실증)
2. **CC 훅은 서브에이전트를 스폰할 수 있다** — `type: "agent"` (파일 읽기, 테스트 실행 가능)
3. **CC 플러그인은 LSP 서버를 번들할 수 있다** — `.lsp.json` (AST 수준 코드 분석)
4. **세션 내에서 OpenAI급 하네스 강제가 가능하다** — 불가능한 것은 상시 데몬과 CC 외부 강제뿐

### 변경 요약

| 섹션 | 변경 내용 |
|------|----------|
| 2층 PreToolUse 훅 | `additionalContext`(경고) → `permissionDecision: "deny"`(차단). hook_strictness별 동작 분류 추가 |
| 2층 Stop 훅 | map.md sync만 → **agent 타입 QA 게이트 추가** (테스트/린터 검증 + map.md sync) |
| 2층 훅 설계 원칙 | CC 훅 4가지 타입, permissionDecision 3가지 값, agent 훅 능력 명시 |
| 3층 평가자 캘리브레이션 | "Phase 2 초반" → **Phase 1의 Stop agent 훅 시점부터 시작**. Hermes 자가 수정 패턴 참고 |
| Phase 1 범위 | Stop agent 훅 (QA 게이트) 추가 |
| Phase 2 범위 | SQLite 상태 영속, LSP 번들링, reviewer.md 자동 캘리브레이션 추가 |
| 향후 로드맵 | 학습 루프(ECC), ACPX Flow 평가 파이프라인, 크로스세션 검색(Hermes) 방향 명시 |
