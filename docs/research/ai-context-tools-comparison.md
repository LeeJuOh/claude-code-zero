# AI Context Tools 비교 분석

> 분석일: 2026-04-14 | 검증: 각 레포 README / 프로젝트 문맥 재확인 | 대상: Graphify, CodeSight, code-review-graph, Repomix

## 한 줄 요약

4개 모두 "AI가 repo를 더 잘 읽게 해주는 도구"이지만, **같은 문제를 푸는 도구가 아니다.**

- **Graphify**: 코드 + 문서 + PDF + 이미지 + 영상까지 묶는 **멀티모달 지식 그래프**
- **CodeSight**: 라우트/스키마/env/wiki를 뽑아주는 **프로젝트 컨텍스트 컴파일러**
- **code-review-graph**: 변경 영향 범위를 좁혀주는 **리뷰 특화 구조 그래프**
- **Repomix**: repo를 AI에 넘기기 좋게 포장하는 **패키징 / 전달 레이어**

즉, 이름에 모두 "AI context" 냄새가 나도 **지식 그래프 / 컨텍스트 맵 / 리뷰 그래프 / 패키징**으로 층위가 다르다.

---

## 빠른 결론

### Graphify는 CodeSight의 상위호환인가?

**엄밀히는 아니다.**

- **입력 범위와 표현력**은 Graphify가 더 넓다. CodeSight가 보는 코드 구조 외에 문서, PDF, 이미지, 영상/오디오까지 연결한다.
- 하지만 **웹앱 구조 파악**(라우트, ORM 스키마, env, 미들웨어, hot files)과 **가벼운 onboarding 문맥 생성**은 CodeSight가 더 직접적이다.
- Graphify는 "더 많은 것을 그래프로 연결"하는 도구이고, CodeSight는 "AI가 바로 읽을 수 있는 프로젝트 맵을 컴파일"하는 도구다.
- 따라서 **일부 축에서는 Graphify가 더 넓지만, CodeSight를 완전히 대체하는 strict superset은 아니다.**

### code-review-graph도 결국 프로젝트 전체를 그래프화하는가?

**맞다. 다만 목적이 다르다.**

- 초기 빌드 시에는 프로젝트 전체를 Tree-sitter로 파싱해서 **전체 구조 그래프**를 만든다.
- 하지만 그 그래프의 주 용도는 범용 아키텍처 이해보다 **blast radius 계산**, **review context 최소화**, **risk-scored 변경 분석**이다.
- 즉 "전체 프로젝트를 그래프화한다"는 말은 맞지만, **Graphify 같은 범용 지식 그래프와 동일한 제품 철학은 아니다.**
- 한마디로 **전체를 그래프로 만들되, 쓰는 순간에는 리뷰에 필요한 부분만 잘라서 쓰는 도구**다.

### Repomix는 나머지 셋의 경쟁자인가?

**대체재라기보다 보완재다.**

- Repomix는 그래프를 만들지 않는다.
- 라우트/스키마를 이해하거나 blast radius를 계산하지도 않는다.
- 대신 repo를 XML/Markdown/JSON/plain text로 패킹해 **어떤 AI에든 넘길 수 있게 만드는 전달 레이어**다.
- 그래서 Graphify / CodeSight / code-review-graph로 분석한 결과를 보완하거나, 그냥 "이 repo를 통째로 AI에 먹인다"는 용도로 붙는다.

---

## 분류

| 도구 | 분류 | 실제로 만드는 것 | 핵심 질문 | 주 출력 |
|------|------|------------------|-----------|---------|
| **Graphify** | 멀티모달 지식 그래프 | 코드/문서/이미지/영상 관계 그래프 | "이 시스템의 구조와 **왜**는?" | `graph.json`, `GRAPH_REPORT.md`, interactive HTML |
| **CodeSight** | 프로젝트 컨텍스트 컴파일러 | 라우트/스키마/env/wiki/knowledge map | "이 프로젝트에 **뭐가 있지?**" | `CODESIGHT.md`, `.codesight/wiki/`, `KNOWLEDGE.md`, HTML/JSON |
| **code-review-graph** | 리뷰 특화 구조 그래프 | 코드 엔티티/호출/의존/테스트 그래프 | "이 변경에서 **정확히 뭘 읽어야 하지?**" | SQLite `graph.db`, MCP 22 tools, wiki, visualization |
| **Repomix** | 저장소 패키징 레이어 | AI-friendly bundle | "이 repo를 AI에 **어떻게 전달하지?**" | single-file XML/Markdown/JSON/plain text |

---

## 개별 분석

### Graphify

- **소스**: [safishamsi/graphify](https://github.com/safishamsi/graphify) | Python | PyPI: `graphifyy`
- **핵심**: 코드뿐 아니라 문서, PDF, 이미지, 영상/오디오까지 하나의 그래프로 묶는 멀티모달 지식 그래프
- **입력**:
  - 코드: tree-sitter 기반 25개 언어
  - 문서: markdown/text/PDF/DOCX/XLSX 등
  - 멀티미디어: 이미지, 영상, 음성(Whisper 전사)
- **아키텍처**:
  1. 결정론적 AST pass
  2. 영상/오디오 전사 pass
  3. 문서/이미지/전사 텍스트에 대한 LLM 기반 의미 추출 pass
- **그래프/출력**: NetworkX + Leiden community detection, `graph.json`, `GRAPH_REPORT.md`, interactive HTML
- **신뢰도 모델**: `EXTRACTED` / `INFERRED` / `AMBIGUOUS`
- **Always-on 통합**: Claude Code/Codex/Gemini 등에서 훅 또는 rules로 `GRAPH_REPORT.md`를 먼저 읽게 유도
- **장점**:
  - 유일한 **멀티모달** 지원
  - "왜 이런 설계가 생겼나" 같은 의미 연결 추적에 강함
  - 그래프를 persistent artifact로 남겨 재질의 가능
- **약점**:
  - 의미 추출 pass에 LLM 비용이 듦
  - 제품 개발 객체(route/schema/env) 요약은 CodeSight만큼 직선적이지 않음
- **가장 잘 맞는 상황**:
  - 낯선 대형 코드베이스 + 문서/논문/이미지가 섞여 있을 때
  - 구조뿐 아니라 **설계 의도**까지 찾고 싶을 때

### CodeSight

- **소스**: [Houseofmvps/codesight](https://github.com/Houseofmvps/codesight) | Node/TypeScript | npm: `codesight`
- **핵심**: AI가 매번 파일을 뒤지지 않게 프로젝트 구조를 **컴파일된 컨텍스트 맵**으로 만들어 주는 도구
- **입력**:
  - TypeScript: compiler API 기반 AST 정밀 분석
  - 기타 13개 언어: 30+ framework detector + regex fallback
  - 코드 외 markdown 지식베이스는 `--mode knowledge`로 별도 맵핑
- **추출 대상**:
  - routes, schema, components, env, middleware, import graph, hot files, blast radius
- **출력**:
  - `CODESIGHT.md` 통합 맵
  - `.codesight/wiki/` 주제별 문서
  - `.codesight/KNOWLEDGE.md` (ADR/meeting notes/retros/specs)
  - HTML dashboard, JSON output
- **통합**:
  - MCP 서버(13 tools)
  - `--watch`, `--hook`로 자동 재생성
  - `--profile`로 Claude/Cursor/Codex용 설정 파일 생성
- **장점**:
  - LLM 호출 없이 전부 로컬 처리
  - 실무형 질문("어떤 라우트가 있지?", "어떤 ORM 모델이 있지?")에 즉답형
  - wiki / knowledge mode가 onboarding과 handoff에 강함
- **약점**:
  - 멀티모달 그래프나 깊은 의미 관계 추적은 Graphify보다 약함
  - 범용 graph-native 탐색 도구라기보다 **compiled project map**에 가깝다
- **가장 잘 맞는 상황**:
  - 웹앱/백엔드 onboarding
  - route/schema/env 중심 실무 파악
  - 비용 없이 즉시 쓸 context primer가 필요할 때

### code-review-graph

- **소스**: [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | Python | PyPI: `code-review-graph`
- **핵심**: 전체 코드베이스를 구조 그래프로 만들되, 그 목적을 **리뷰 최소 컨텍스트 계산**에 둔 도구
- **입력**:
  - Tree-sitter 기반 19개 언어 + Jupyter/Databricks notebook
- **그래프 모델**:
  - 함수, 클래스, imports, inheritance, tests, execution flows 등 구조 엔티티를 SQLite graph DB에 저장
- **출력/기능**:
  - SQLite `graph.db` (WAL mode)
  - MCP 22 tools + 5 prompts
  - blast radius, risk-scored change analysis, execution flows, community detection, architecture overview, wiki, D3 visualization
- **업데이트 모델**:
  - git commit / file save 기반 증분 업데이트
  - 대규모 repo에서도 변경 파일만 재파싱
- **장점**:
  - "이 변경을 리뷰하려면 정확히 어느 파일을 읽어야 하나"에 가장 특화
  - 전체 그래프를 만들지만, 실제 사용에서는 필요한 서브그래프만 잘라 토큰 절약
  - 변경 영향 분석, 테스트 갭 탐지가 명확함
- **약점**:
  - 멀티모달 문서/이미지/영상 연결은 없음
  - 범용 아키텍처 지식 그래프보다는 review workflow 최적화 도구
- **가장 잘 맞는 상황**:
  - PR 리뷰
  - blast radius / 영향 범위 분석
  - 변경 전후 위험도 판단

### Repomix

- **소스**: [yamadashy/repomix](https://github.com/yamadashy/repomix) | Node/TypeScript | npm: `repomix`
- **핵심**: 저장소를 AI-friendly 포맷으로 패킹하는 전달 레이어
- **입력**:
  - 로컬 repo, 원격 GitHub repo
  - include/exclude, ignore 규칙 지원
- **아키텍처**:
  - Secretlint로 민감정보 검사
  - tiktoken으로 토큰 수 측정
  - Tree-sitter는 `--compress` 시 구조 압축에 사용
- **출력**:
  - XML / Markdown / JSON / plain text
  - 단일 번들 파일 중심
- **통합**:
  - MCP 서버 제공
  - AI assistant가 packed output을 읽거나 grep할 수 있게 함
- **장점**:
  - 어떤 AI 도구에도 전달하기 쉬움
  - 출력 포맷 선택 폭이 넓음
  - 보안 스캔과 토큰 계산이 함께 붙음
- **약점**:
  - 프로젝트 그래프를 만들지 않음
  - route/schema/blast radius 같은 구조 분석이 목적이 아님
- **가장 잘 맞는 상황**:
  - "이 repo를 LLM에 통째로 주고 싶다"
  - 분석보다 전달/포장이 필요할 때

---

## 기능 매트릭스

| 기능 | Graphify | CodeSight | code-review-graph | Repomix |
|------|----------|-----------|-------------------|---------|
| 코드 AST 분석 | O (25개 언어) | TS 정밀 AST, 나머지 regex fallback | O (19개 언어 + Jupyter) | 압축 옵션에서만 사용 |
| 문서 분석 | O | 제한적 (`--mode knowledge`는 markdown 지식 맵) | 제한적 (wiki 생성 보조) | 파일 포함만 |
| 이미지 / PDF / 영상 | O | X | X | X |
| 그래프 저장소 | NetworkX + JSON | X (맵/위키 중심) | SQLite graph DB | X |
| MCP 서버 | O | O (13 tools) | O (22 tools) | O |
| always-on assistant 통합 | O (hook/rules) | 부분적 (`--profile`, wiki/MCP 중심) | O에 가까움 (platform rules + graph-aware setup) | 부분적 (MCP 사용 시) |
| blast radius | 간접 가능하지만 핵심 기능 아님 | O | O (핵심) | X |
| wiki 생성 | O (`GRAPH_REPORT.md` 중심 + query) | O (핵심 기능) | O | X |
| knowledge/notes 맵 | 문서 전체를 그래프에 포함 가능 | O (`KNOWLEDGE.md`) | X | X |
| 증분 업데이트 | O (cache, watch, git hook) | 부분적 (watch/hook 재생성) | O (<2초 증분 업데이트) | X |
| LLM 호출 필요 | O (의미 추출 pass) | X | X (일부 optional 기능 제외) | X |
| 최적화 대상 | 의미 연결 / why 추적 | onboarding / context handoff | review / change impact | packaging / transfer |

---

## 상위호환 / 대체 가능성 분석

### Graphify vs CodeSight

| 질문 | 판정 | 이유 |
|------|------|------|
| Graphify가 기능 수로 더 넓은가? | **대체로 yes** | 멀티모달 입력, 의미 관계 추출, persistent graph, query depth가 더 넓다 |
| Graphify가 CodeSight를 완전히 대체하는가? | **no** | CodeSight의 강점은 route/schema/env/wiki/knowledge를 저비용·정형적으로 뽑아주는 것 |
| CodeSight가 Graphify를 대체하는가? | **no** | CodeSight는 멀티모달 지식 그래프와 설계 의도 연결 추적을 하지 않는다 |
| 둘의 실제 관계는? | **부분 중첩 + 강한 보완 관계** | 둘 다 AI context 도구지만, 산출물과 사용 질문이 다르다 |

**정리:**
Graphify를 "CodeSight 상위호환"이라고 부르면 절반만 맞다. **입력 범위와 그래프 표현력은 Graphify가 더 넓지만, CodeSight의 정형 컨텍스트 컴파일러 역할은 별개 가치가 있다.**

### code-review-graph vs Graphify

| 질문 | 판정 | 이유 |
|------|------|------|
| 둘 다 프로젝트 전체를 그래프화하는가? | **yes** | 둘 다 코드베이스 전체를 파싱해 그래프 artifact를 만든다 |
| 같은 종류의 그래프인가? | **no** | Graphify는 멀티모달 지식 그래프, code-review-graph는 리뷰/영향분석용 구조 그래프 |
| 어느 쪽이 더 범용적인가? | **Graphify** | 문서, 이미지, 영상, 의미 관계까지 포함 |
| 어느 쪽이 리뷰에 직접적인가? | **code-review-graph** | blast radius, risk score, minimal review set 계산이 핵심 목표 |

**정리:**
code-review-graph를 단순히 "프로젝트 그래프 툴"이라고만 부르면 부족하다. **전체 그래프를 만들지만, 그 그래프를 리뷰 workflow에 최적화해 쓰는 도구**다.

### Repomix vs 나머지 셋

| 질문 | 판정 | 이유 |
|------|------|------|
| Repomix가 Graphify / CodeSight / code-review-graph의 대체재인가? | **대체로 no** | 분석/추론/영향분석보다 전달 포맷에 초점 |
| 일부 기능 겹침이 있는가? | **부분 yes** | Tree-sitter 압축, MCP 제공, 토큰 최적화는 겹친다 |
| 실제 역할은? | **보완재** | 다른 분석 도구 결과와 별개로 repo 자체를 AI-friendly bundle로 만든다 |

---

## 어떤 상황에서 어떤 도구를 쓰나

| 상황 | 추천 도구 | 이유 |
|------|----------|------|
| 낯선 대형 코드베이스의 구조와 설계 의도까지 파악 | **Graphify** | 코드 + 문서 + 멀티모달까지 연결해 "왜"를 찾기 좋음 |
| 웹앱 온보딩: route/schema/env/middleware 빠르게 파악 | **CodeSight** | 제품 개발 객체를 정형적으로 뽑아 문맥 맵과 wiki를 만듦 |
| PR 리뷰, blast radius, 영향 범위 좁히기 | **code-review-graph** | 최소 리뷰 컨텍스트와 risk-scored 변경 분석이 핵심 |
| repo를 다른 AI 툴에 통째로 전달 | **Repomix** | 단일 AI-friendly 패키지 생성이 목적 |
| 코드 + 논문 + 스크린샷 + 회의 자료가 섞여 있음 | **Graphify** | 유일한 멀티모달 지식 그래프 |
| 비용 최소화 + 로컬 처리 | **CodeSight / code-review-graph / Repomix** | 기본 흐름에서 LLM 호출 없음 |
| 세션 시작 시 가벼운 프로젝트 primer가 필요 | **CodeSight** | `CODESIGHT.md` + wiki index 조합이 가장 직접적 |
| 리뷰 직전에 딱 필요한 파일만 좁혀야 함 | **code-review-graph** | 그래프를 만들어도 소비는 최소 서브셋만 함 |

---

## 유사도 관계

```text
Graphify ────────────┐
  │                  │
  │ graph-native     │ graph-native
  │ multimodal       │ review-specialized
  ▼                  ▼
code-review-graph    CodeSight
  ▲                  │
  │ 일부 겹침         │ markdown/wiki/context compiler
  │ (wiki, MCP)       │
  └──────────┬───────┘
             ▼
          Repomix
   (패키징/전달 레이어, 분석 엔진 아님)
```

더 정확히 말하면:
- **Graphify ↔ code-review-graph**: 가장 비슷해 보이지만 그래프의 목적이 다름
- **CodeSight ↔ Graphify**: "AI가 프로젝트를 더 빨리 이해하게 만든다"는 점은 겹치지만 산출물과 질문이 다름
- **Repomix ↔ 나머지 셋**: 비교 대상이면서도 동시에 보완재

---

## README 주장 vs 실제 구현 차이

### Graphify

- **README의 "3-pass pipeline" 설명은 구현을 단순화한 표현에 가깝다.** 실제 skill 문서는 Part A(AST)와 Part B(semantic)를 **병렬 실행**한 뒤 Part C에서 merge하도록 적혀 있다 (`references/graphify/graphify/skill.md:167`, `references/graphify/graphify/skill.md:197`, `references/graphify/graphify/skill.md:361`). 즉 큰 흐름은 맞지만, 실행 방식은 순차 3단계라기보다 **병렬 2단계 + merge**에 가깝다.
- **watch / git hook 설명은 구현과 잘 맞는다.** 코드 변경 시 즉시 rebuild, 문서/이미지 변경 시 `needs_update`만 남기는 동작이 `references/graphify/graphify/watch.py:110` 이하에 구현돼 있고, post-commit / post-checkout hook도 `references/graphify/graphify/hooks.py:41`, `references/graphify/graphify/hooks.py:76`에 있다.
- **Always-on 설명도 대체로 구현과 일치한다.** Claude용 규칙 삽입과 `GRAPH_REPORT.md` 우선 읽기 지침은 `references/graphify/graphify/__main__.py:166` 이하에 실제 문자열로 들어 있다.

### CodeSight

- **README의 "13 MCP tools"는 현재 구현과 안 맞는다.** 실제 `references/codesight/src/mcp-server.ts:436` 이하의 `TOOLS` 배열에는 `codesight_scan`부터 `codesight_get_knowledge`까지 **14개 도구**가 있다.
- **README의 "13 ORM parsers"도 현재 구현보다 보수적으로 적혀 있다.** `references/codesight/src/detectors/schema.ts:29` 이하를 보면 Drizzle, Prisma, TypeORM, SQLAlchemy, GORM, Ent, ActiveRecord, Ecto, Django, Eloquent, Entity Framework, Mongoose, Sequelize, Exposed, Room까지 **15개 분기**가 존재한다.
- **TypeScript compiler API + non-TS regex fallback 설명은 구현과 일치한다.** `references/codesight/src/ast/loader.ts:14` 이하에서 프로젝트의 TypeScript를 동적으로 불러오고, 실패 시 `null`을 반환해 regex fallback으로 내려간다.

### code-review-graph

- **README의 "22 MCP tools"는 현재 구현보다 적게 적혀 있다.** 실제 `references/code-review-graph/code_review_graph/main.py`에는 `@mcp.tool()` 데코레이터가 **24개** 있고, 문서 표에 없는 `run_postprocess_tool`과 `get_minimal_context_tool`도 존재한다 (`references/code-review-graph/code_review_graph/main.py:120`, `references/code-review-graph/code_review_graph/main.py:149`).
- **"2초 이내 증분 업데이트"는 코드 구조로는 그럴듯하지만, 코드만 읽고 보장할 수 있는 성질은 아니다.** 해시 비교 후 변경 파일과 의존 파일만 다시 파싱하는 구조는 `references/code-review-graph/code_review_graph/incremental.py:580` 이하에서 확인된다. 다만 **2초**라는 수치는 구현이 아니라 벤치마크/환경 의존 주장으로 보는 게 맞다.
- **"전체 프로젝트를 그래프화한다"는 설명은 구현과 일치한다.** `full_build()`가 `collect_all_files()`로 전체 파일을 모아 파싱하는 흐름이 `references/code-review-graph/code_review_graph/incremental.py:489` 이하에 있다.

### Repomix

- **Secretlint 통합은 README 주장과 일치한다.** 보안 워커가 `@secretlint/core`와 preset rule을 직접 사용한다 (`references/repomix/src/core/security/workers/securityCheckWorker.ts:2`, `references/repomix/src/core/security/workers/securityCheckWorker.ts:84`).
- **MCP로 로컬/원격 패키징을 제공한다는 설명도 구현과 일치한다.** MCP 서버 등록부에 `registerPackCodebaseTool`과 `registerPackRemoteRepositoryTool`이 모두 있다 (`references/repomix/src/mcp/mcpServer.ts:41`).
- **다만 README의 "압축 시 ~70% 토큰 절감"은 구현 그 자체보다 성능 주장에 가깝다.** `references/repomix/src/core/treeSitter/parseFile.ts:66` 이하를 보면 Tree-sitter 기반 구조 추출은 실제로 구현돼 있지만, **정확히 70%**라는 수치는 코드만 읽어서는 검증되지 않는다.

### 정리

README와 구현이 크게 어긋난 프로젝트는 아니지만, **수치성 주장과 도구 개수는 README가 뒤처진 부분이 있다.**

- **Graphify**: 개념 설명은 맞지만 실행 모델 설명이 약간 단순화됨
- **CodeSight**: 실제 구현이 README보다 조금 더 커졌음 (14 MCP tools, 15 ORM 분기)
- **code-review-graph**: 실제 MCP 도구 수가 README보다 많음, 성능 수치는 코드만으로는 검증 불가
- **Repomix**: 핵심 기능은 잘 맞지만, 압축 효과 수치는 구현이 아니라 benchmark claim으로 보는 게 안전

---

## 최종 정리

이 4개를 한 줄로 다시 정리하면:

- **Graphify** = "프로젝트를 포함한 여러 재료를 하나의 지식 그래프로 엮는 도구"
- **CodeSight** = "프로젝트를 AI가 바로 읽을 수 있는 구조화된 맵으로 컴파일하는 도구"
- **code-review-graph** = "프로젝트 전체 그래프를 만들되, 리뷰 시 필요한 부분만 꺼내 쓰는 도구"
- **Repomix** = "프로젝트를 분석하기보다 AI에 넘기기 좋게 포장하는 도구"

그래서 질문에 대한 최종 답은 이렇다.

1. **Graphify는 CodeSight의 strict superset이 아니다.**
2. **code-review-graph는 프로젝트 전체를 그래프화하지만, 범용 이해보다 리뷰/영향분석용이다.**
3. **Repomix는 나머지 셋의 경쟁자라기보다 전달 레이어 보완재다.**
