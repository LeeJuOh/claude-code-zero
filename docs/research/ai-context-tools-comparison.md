# AI Context Tools 비교 분석

> 분석일: 2026-04-10 | 검증: Codex Research + Claude Double-check | 대상: Graphify, CodeSight, code-review-graph, Repomix

## 한 줄 요약

4개 모두 "AI가 repo를 더 잘 읽게 해주는 도구"지만 같은 카테고리가 아님. 각각 지식 그래프, 컨텍스트 컴파일러, 리뷰 분석 그래프, 패키징 레이어로 분류됨.

---

## 분류

| 도구 | 분류 | 핵심 질문 | output 형태 |
|------|------|----------|------------|
| **Graphify** | 멀티모달 지식 그래프 | "이 아키텍처의 **왜**는?" | interactive HTML graph + JSON |
| **CodeSight** | 앱 구조 컨텍스트 컴파일러 | "라우트/스키마/env **뭐 있지?**" | structured markdown map |
| **code-review-graph** | 변경 영향 분석 그래프 | "이 PR에서 **뭘 읽어야 하나?**" | SQLite DB + MCP 22 tools |
| **Repomix** | 저장소 패키징 레이어 | "이 repo를 AI에 **어떻게 넘기지?**" | single file (XML/MD/JSON) |

---

## 개별 분석

### Graphify

- **소스**: [safishamsi/graphify](https://github.com/safishamsi/graphify) | Python | PyPI: `graphifyy`
- **핵심**: 코드 + 문서 + PDF + 이미지를 하나의 지식 그래프로 통합
- **아키텍처**: 2-pass pipeline
  - 1st pass: tree-sitter AST (20개 언어) — LLM 불필요, 결정론적
  - 2nd pass: Claude subagent 병렬 실행 — 문서/이미지에서 개념, 관계, 설계 의도 추출
- **그래프**: NetworkX + Leiden community detection (embedding 없이 topology 기반)
- **신뢰도 라벨**: `EXTRACTED`(소스에서 직접 확인) / `INFERRED`(추론) / `AMBIGUOUS`(검토 필요)
- **Always-on**: PreToolUse hook으로 Glob/Grep 직전에 그래프 참조 강제
- **설치 흐름**: `pip install graphifyy && graphify install` → `/graphify .` → `graphify claude install`
- **플랫폼**: 10개 (Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Copilot CLI, Aider, OpenClaw, Factory Droid, Trae)
- **비용 주의**: 2nd pass에서 LLM API 호출 발생 — 문서/이미지 많을수록 토큰 소모

### CodeSight

- **소스**: [Houseofmvps/codesight](https://github.com/Houseofmvps/codesight) | Node/TypeScript | npm: `codesight`
- **핵심**: AI가 매번 프로젝트를 탐색하느라 낭비하는 토큰을 줄이기 위해 구조화된 markdown context로 컴파일
- **아키텍처**: 30+ framework detector, TS 프로젝트는 compiler API AST, 나머지 13개 언어는 regex fallback
- **특징**: zero runtime dependencies, 13개 MCP tools
- **output**: routes/schema/components/env/middleware/hot files 맵 + wiki + knowledge mode(ADR/meeting notes)
- **차별점**: "제품 개발 객체"(라우트, 스키마, 환경변수)에 강하게 최적화 — 범용 그래프보다 실무 onboarding/context handoff에 적합
- **비용**: LLM 호출 없음, 로컬 처리

### code-review-graph

- **소스**: [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | Python | PyPI: `code-review-graph`
- **핵심**: 코드 리뷰 시 변경 영향 범위만 좁혀서 토큰과 리뷰 시간 절감
- **아키텍처**: Tree-sitter parser → SQLite `graph.db` (WAL mode), FastMCP 22 tools + 5 prompts
- **특징**: blast radius 분석, risk-scored 변경 분석, incremental update (<2초), 19개 언어 + Jupyter
- **추가**: community detection (Leiden), optional vector embeddings (sentence-transformers, Gemini, MiniMax), D3.js 시각화, VS Code extension, multi-repo registry
- **테스트**: 572개, CI matrix (Python 3.10-3.13)
- **차별점**: "이 변경을 리뷰하려면 정확히 뭘 읽어야 하나?" 에 가장 집중. 벤치마크 8.2x 토큰 절감
- **비용**: LLM 호출 없음 (embeddings는 optional), 로컬 처리

### Repomix

- **소스**: [yamadashy/repomix](https://github.com/yamadashy/repomix) | Node/TypeScript | npm: `repomix`
- **핵심**: 저장소를 하나의 AI-friendly 파일로 패킹 — 어떤 LLM에도 넘길 수 있게
- **아키텍처**: Secretlint(보안 스캔) + tiktoken(토큰 카운팅) + Tree-sitter WASM(code compression)
- **output**: XML/Markdown/JSON/plain text, local/remote repo 지원
- **규모**: JSNation Open Source Awards 후보, 웹사이트(repomix.com), Discord, Warp 스폰서
- **차별점**: 분석 엔진이 아니라 포맷/전달 도구. 나머지 셋의 대체재가 아닌 **보완재**
- **비용**: LLM 호출 없음, 로컬 처리

---

## 비교

### 유사도 관계

```
Graphify ←── 가장 유사 (둘 다 graph-native + tree-sitter + MCP) ──→ code-review-graph
    │                                                                      │
    │ 일부 겹침 (wiki, blast radius)                                        │ 일부 겹침 (token reduction)
    ↓                                                                      ↓
CodeSight                                                              Repomix
    │                                                                      │
    └──────── 둘 다 "markdown 기반 context" 이지만 접근이 다름 ────────────────┘
```

### 기능 매트릭스

| 기능 | Graphify | CodeSight | code-review-graph | Repomix |
|------|----------|-----------|-------------------|---------|
| Tree-sitter AST | O (20lang) | TS만 (나머지 regex) | O (19lang+Jupyter) | compression 목적 |
| 그래프 구조 | NetworkX | X | SQLite | X |
| MCP 서버 | O | O (13 tools) | O (22 tools) | O |
| 멀티모달 (이미지/PDF) | O | X | X | X |
| blast radius | X | O | O | X |
| incremental update | O (캐시) | X | O (<2초) | X |
| wiki 생성 | O | O | O | X |
| LLM 호출 필요 | O (2nd pass) | X | X (optional) | X |
| 언어 수 | 20 | 13 | 19+Jupyter | N/A |
| always-on hook | O | X | O | X |

### 어떤 상황에서 어떤 도구

| 상황 | 추천 도구 | 이유 |
|------|----------|------|
| 낯선 대형 코드베이스 처음 파악 | Graphify | 전체 아키텍처 + "왜" 추적 |
| 웹앱 온보딩 (라우트/스키마/env 파악) | CodeSight | 제품 개발 객체에 최적화 |
| PR 리뷰, 변경 영향 분석 | code-review-graph | blast radius + risk scoring 특화 |
| repo를 다른 AI 도구에 통째로 넘기기 | Repomix | 범용 패키징 |
| 코드 + 문서 + 논문이 섞인 프로젝트 | Graphify | 멀티모달 유일 지원 |
| 비용 최소화 | CodeSight 또는 code-review-graph | LLM 호출 없음 |

---

## 검증 요약

Codex Research + Claude Double-check 결과: **Agreement High** (11/13 agreed, 2 nuanced, 0 disputed)

Codex가 부정확했던 부분:
- CodeSight detector 수: "8개"로 표기 → 실제 8 카테고리 × 30+ framework detector
- code-review-graph embedding provider: "Ollama/igraph" 언급 → 소스에서 미확인 (sentence-transformers, Gemini, MiniMax만 확인)
