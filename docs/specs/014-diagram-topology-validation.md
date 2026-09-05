# Spec 014 — diff-visual: 다이어그램 그라운딩 하드닝 (위상 검증 경량판 + 저비용 5개)

> 생성: 2026-08-30 · 출처: grill-with-docs 세션
> 구현 이슈: `docs/issues/014-diagram-topology-validation.md` (슬라이스 S1~S4)
> 대상 플러그인: `plugins/vision-powers/` (현재 v4.8.0 → v4.9.0, minor: 검증·품질 하드닝, 인터페이스 무변경)
> 용어집: `docs/context/vision-powers.md` — **Diagram grounding / Internal consistency / Phantom node** 항목이 이 스펙의 어휘.
> ADR: `docs/adr/0011-diagram-grounding-authoring-not-gate.md` (신설). 0002·0005·0007·0009·0010 유지.
> 근거 원문(딥다이브 검증): archify `renderers/architecture/render-architecture.mjs`, gitdiagram `src/server/generate/graph.ts`, effective-html `skills/design-artifact/SKILL.md`, diagram-design `references/style-guide.md`.

## Problem Statement

vision-powers는 **코드**를 추출로 그라운딩하고(ADR 0005) 게이트로 나머지를 기계 검증한다(ADR 0002).
그런데 **다이어그램**은 예외다 — diff-visual의 흐름도·의존 그림은 모델이 프리핸드로 그리고, 어느 층에서도
검증이 없다. 이는 플러그인이 스스로 경계하는 실패모드를 다이어그램 층에 그대로 노출한다: **틀린
다이어그램은 틀린 시스템을 가르친다**(틀린 스니펫과 같은 죄).

참고 프로젝트 3종(archify·gitdiagram)이 독립적으로 같은 해법에 수렴했다 — *"LLM이 다이어그램을 직접
쓰게 하지 말고, 구조화 데이터(노드/엣지) → 검증 → 결정론적 렌더."* 그러나 vision-powers는 이 파이프라인을
그대로 못 받는다: `diff-visual/SKILL.md:33`이 중간 JSON을 금지하고(013·ADR 0010의 경량 원칙), 코드 심볼에
대한 그라운드-트루스 Set도 없다. ADR 0011이 이 긴장을 다음처럼 닫았다: **그라운딩은 authoring 규율로,
게이트는 내부 일관성만, 그것도 파싱 가능한 로컬 채널에서만.**

이 스펙은 그 결정을 구현으로 옮기고, 같은 파일들을 여는 김에 딥다이브에서 나온 저비용 품질 개선 5개를
곁다리로 함께 처리한다.

## Solution

유저가 보게 될 것(대부분 산출물 품질로 드러나며, 인터페이스는 안 바뀐다):

- **다이어그램이 코드에 없는 관계를 지어내지 않는다.** diff-visual이 다이어그램을 그리기 전, 노드·화살표에
  쓰는 이름을 이미 `file:line`으로 확인한 이름 집합에서만 뽑는다(fact sheet 확장 = 메인 장치, 전 채널 적용).
- **로컬 HTML 산출물에서 허공으로 가는 화살표가 자동 거부된다.** 게이트가 렌더된 Mermaid를 파싱해 엣지 양끝이
  선언된 노드인지 검사한다(`html + --local`만 — 보너스 안전망).
- **before/after 다이어그램에서 삭제·이동된 요소가 점선(phantom) 노드로 표기된다.**
- **게이트 위반 메시지가 구조화된다**(severity + 자동수정 힌트).
- **generic 다이어그램·slop 팔레트·다크모드 반전이 더 촘촘히 걸러진다**(authoring 안내 보강).

## User Stories

1. As a 에이전트가 짠 PR을 따라잡는 개발자, I want diff-visual 다이어그램의 노드가 실제 코드에 있는 이름이기를, so that 존재하지 않는 흐름을 사실로 배우지 않는다.
2. As a 유지보수자, I want "왜 다이어그램은 게이트가 아니라 지시로 그라운딩하나"가 ADR에 닫혀 있기를, so that 같은 모순 논쟁을 반복하지 않는다.
3. As a `--local`로 로컬 HTML을 뽑는 유저, I want 허공으로 가는 화살표가 자동 거부되기를, so that Mermaid 렌더가 깨진 그림을 받지 않는다.
4. As a before/after 다이어그램을 보는 독자, I want 삭제·이동된 요소가 점선으로 구분되기를, so that "무엇이 사라졌나"가 한눈에 보인다.
5. As a 게이트 위반을 고치는 모델, I want 위반에 severity·자동수정 힌트가 붙기를, so that free-text만 읽고 추측하지 않는다.
6. As a slop을 싫어하는 유저, I want 흔한 AI 디자인 클리셰 목록이 촘촘하기를, so that 산출물이 뻔한 costume을 안 입는다.
7. As a 다크모드로 보는 유저, I want light→dark 반전 규칙이 명문화되기를, so that 다크 배경에서도 다이어그램 텍스트가 읽힌다.
8. As a doc-visual 유저, I want 최소한 로컬 HTML에서는 같은 위상 검사를 받기를, so that 공용 게이트 이득을 공짜로 얻는다.

## Implementation Decisions

- **D1 — ① Grounding = authoring 규율(메인, 전 채널).** `diff-visual/SKILL.md`의 Verification Checkpoint
  Name check를 확장: "다이어그램 노드 라벨·엣지 endpoint는 위에서 이미 `file:line`으로 확인한 이름 집합에서만
  뽑는다. 확인 안 된 이름으로 노드/엣지를 만들지 않는다." 기존 Name check가 이미 모든 이름을 실파일에 묶고
  있으므로, 노드가 그 집합에서 나오면 엣지는 전이적으로 그라운딩된다. 게이트 강제가 아니라 authoring(ADR 0011).
- **D2 — ② Internal consistency = 게이트(보너스, `html + --local`만).** `artifact-gate.js`에 검사 신설:
  각 Mermaid 블록에서 엣지(`-->`/`.->`/`==>`/`-.->`) 양끝을 뽑아, 그 다이어그램에 **선언된 노드 집합**에
  없는 endpoint가 있으면 위반. archify(`components.has(conn.from/to)`)·gitdiagram(`unknown_edge_source/target`)의
  엣지 무결성 검사와 동형. 실패 시 거부 → SKILL.md의 기존 "fix inline, max 2 retries" 흐름을 탄다. 파싱 대상이
  없는 Artifact(inline SVG)·md에는 적용 불가 — 확장하지 않는다(ADR 0011). 기존 `countNodes`/`countArrows`
  파서를 재사용해 "선언된 노드"를 정의(노드 = `A[..]`/`A{..}`/`A(..)`/서브그래프 id 등 노드 선언에 등장한 id).
- **D3 — B(실코드 대조)는 도입 안 함.** gitdiagram식 `node.path` 파일트리 대조는 diff-visual 다이어그램에
  실재 앵커가 없어 불가. 중간 JSON을 만들어 앵커를 심는 것도 `SKILL.md:33`·ADR 0011에 의해 금지. B의 효과는
  D1(authoring)로만 근사한다.
- **D4 — doc-visual은 ①에서 제외, ②는 공용.** doc-visual엔 Verification Checkpoint/fact-sheet 단계가 없어
  D1을 붙일 자리가 없다 → 별도 후속으로 미룸. 게이트(D2)는 공용 스크립트라 doc-visual `html + --local`에도
  자동 적용된다(추가 작업 0).
- **D5 — Phantom 노드 관례(e).** diff-visual의 before/after 흐름도·의존 그림에서 **삭제·이동된 요소는 점선
  노드/엣지**로 표기한다는 관례를 SKILL.md 다이어그램 규칙에 추가. 근거: archify `delta/architecture-delta.mjs`.
  채널별 렌더: 로컬은 Mermaid 점선(`-.->`, `classDef ... stroke-dasharray`), Artifact는 inline SVG
  `stroke-dasharray`. 캡션은 사실만("removed", "moved to X") — 판단 문장 금지(ADR 0010).
- **D6 — 게이트 구조화 진단(a).** `artifact-gate.js`의 `violations.push({ rule, hint })`에 `severity`
  ('error'|'warn')와 선택적 `supportedFixes`(자동 적용 가능한 수정 힌트) 필드를 추가. 기존 `{rule, hint}`
  소비처와 호환되게 **추가만** 한다(기존 필드 유지). 근거: archify `renderers/shared/repository-evidence.mjs`,
  `validator.mjs`.
- **D7 — Generic 자가체크(b).** `references/design-system/visual-self-audit.md`에 1줄 추가: "주제를 바꿔도
  같은 비주얼이 말이 되면 너무 뻔한 것 — 이 다이어그램이 *이* 변경에만 들어맞는지 확인." 근거: effective-html
  `skills/html/SKILL.md:75`.
- **D8 — Anti-slop 팔레트 병합(c).** `references/design-system/anti-slop-tells.md`에 effective-html의
  costume 클리셰 목록을 **behavioral 층으로** 흡수(크림#F4F1EA+serif+테라코타, 보라→파랑 그라데이션 히어로,
  Inter/Space Grotesk, 이모지 섹션 마커, 전역 가운데 정렬, `rounded-lg` 남발 등). ⚠️ 기계적 hex 차단은 이미
  게이트가 하므로 `anti-slop-tells.md:7`의 "기계적 slop은 여기 재기술 금지" 원칙을 지켜 — **hex를 다시 나열하지
  않고** 서술형 클리셰만 추가. 근거: effective-html `skills/design-artifact/SKILL.md:34`, visual-explainer SKILL.
- **D9 — 다크모드 반전 규칙(d).** `references/design-system/semantic-tokens.md`에 파생 규칙 1줄 명문화:
  "light의 `rgba(ink, X)`는 dark에서 `rgba(paper, X)`로 반전한다." 값은 이미 있으나 규칙이 글로 없던 것을 보강.
  근거: diagram-design `references/style-guide.md:34-36`.
- **D10 — 인터페이스·이름 무변경.** 플래그·스킬명·산출물 경로 그대로. description은 내부 하드닝이라 기본적으로
  유지하되, README diff-visual 절에 "다이어그램은 확인된 코드 이름에 그라운딩된다" 한 줄만 선택적으로 추가 가능.
- **D11 — 버전.** `marketplace.json` 4.8.0 → 4.9.0 (기능/검증 추가 = minor). plugin.json은 로컬 소스라 버전
  미기재(AGENTS.md 규칙).

## Testing Decisions

- 플러그인 스킬이라 단위 테스트 없음 — 단, **D2·D6 게이트 변경은 `artifact-gate.js`의 순수 함수**라 Node
  단위 검증 가능: 엣지가 선언 노드로 향하는 통과 케이스 1 + 허공 엣지 거부 케이스 1을 최소 확인.
- 나머지는 **실제 diff로 생성 후 육안 + 게이트**. 고정 테스트 diff: 이 레포 최근 실제 PR(의존 변화 있음 1개).
- 확인 항목: (D1) 다이어그램 노드 이름이 전부 fact sheet 이름 집합 내 · (D2) 허공 엣지 Mermaid를 로컬 게이트가
  거부 · (D5) 삭제 요소가 점선으로 렌더 · (D6) 위반 객체에 severity 존재, 기존 `{rule,hint}` 소비 무파손 ·
  (D7~D9) 해당 레퍼런스 파일에 문구 존재 · Artifact `--content-only`·md 경로는 D2가 **미적용**(회귀 없음).
- 프라이어 아트: `docs/issues/013` 실제-diff-생성 검증 절차.

## Out of Scope

- **B(실코드 대조)의 기계화** = verify→render 파이프라인·중간 JSON (ADR 0011 거부).
- **doc-visual의 ① authoring 확장** (fact-sheet 신설 필요 — 별도 후속).
- **게이트를 md·Artifact(inline SVG) 채널로 확장** (파싱 대상 부재 — ADR 0011).
- **자동 라우팅, 전체 typed-IR 컴파일러, 서버 인프라, PPTX/브랜드 온보딩** (핸드오프에서 폐기 확정).

## Further Notes

- 저비용 5개(a~e)는 주제상 곁다리지만, a·e가 014의 작업 파일(게이트·diff-visual 다이어그램)과 물리적으로
  겹쳐 함께 처리하는 편이 파일을 두 번 여는 것보다 낫다. b·c·d는 각 레퍼런스 파일 1~수 줄.
- ADR 0011의 열린 항목: 기본(Artifact) 채널에서 다이어그램 오류가 실제로 문제되면, 그때 재검토 지점은 "더 큰
  게이트"가 아니라 거부했던 verify→render 파이프라인이다.
