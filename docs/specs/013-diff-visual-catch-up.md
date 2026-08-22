# Spec 013 — diff-visual: 리뷰 대시보드 → 리뷰 전 따라잡기(Catch-up) 도구

> 생성: 2026-08-22 · 출처: grill-with-docs 세션 (핸드오프 `docs/handoff/2026-08-22-diff-visual-comprehension-mode.md` 후속)
> 구현 이슈: `docs/issues/013-diff-visual-catch-up.md` (슬라이스 S1~S4)
> 대상 플러그인: `plugins/vision-powers/` (현재 v4.7.1 → v4.8.0, minor: 섹션 구조·description 변경, 기존 리뷰 섹션 삭제)
> 용어집: `docs/context/vision-powers.md` — **Catch-up / Literate diff / Quiz / Mode** 항목이 이 스펙의 어휘.
> ADR: `docs/adr/0010-diff-visual-catch-up-before-review.md` (신설). 0003(게이트 거부)·0005(추출 근거)·0009(Artifact 기본) 유지.
> 근거 원문: Geoffrey Litt, *Understanding is the new bottleneck* (2026-07-02) + `explain-diff` gist (html/notion 두 변형).

## Problem Statement

유저는 구현을 에이전트에 맡긴다. 내 PR도 팀원 PR도 에이전트가 짠 코드라 **"내가 이미 아는 시스템"이
없다.** 그런데 diff-visual은 독자가 시스템을 안다고 전제하고 변경 통계(파일 수·라인·핫스팟·분류표)만
보여준다. "바뀌기 전 세계가 뭐였고, 이 변경의 아이디어가 뭔지"를 말하는 섹션이 0개다.

결과: 넉 달간 리포트 11개, 전부 플러그인 개발 중 생성. 일할 때 0번. 유저의 고충 "AI가 뱉은 코드와
설명이 이해가 안 됨"을 이 도구가 풀지 못했다.

Litt의 진단이 정확히 이 상황이다: 이해의 목적은 검증이 아니라 **참여**(다음 지시를 낼 유창함)이고,
도구는 독자를 **먼저 따라잡혀야** 한다 — 배경 → 직관 → 코드 → 퀴즈 순으로. 퀴즈는 루프가 사람 이해
속도보다 빨라지는 걸 막는 **속도조절기**다.

## Solution

유저가 보게 될 것:

- **섹션 4개로 교체.** Background(깊은 배경 접힘 + 변경 직결 배경) → Intuition(아이디어 한 줄 +
  장난감 데이터 예시 + 변경 전/후 흐름도) → Code(이해 순서로 걷는 literate diff, 코드 조각은 추출본) →
  Quiz(5문항, 클릭 즉시 정오답+설명).
- **리뷰 섹션 삭제.** Overview·File Map·Architecture Impact·Change Classification·Dependency Shift·
  New Components·Hot Spots. 플래그 뒤에 남기지 않는다. 흐름도는 Intuition으로, 의존 변화 그림은
  Code 앞머리로 흡수.
- **좋다/나쁘다 문장 없음.** 의존 순환이 생겼으면 그림에 ⚠️만. 판단은 `/code-review` 몫.
- **뒷단은 그대로.** fact sheet 검증, `extract-hunks.js` 추출, 게이트, Artifact 발행, 언어 감지, md.
- **쓰는 순간 명시.** SKILL.md에 "When to run: 에이전트 작업 끝나고 push 전 / 남의 PR 리뷰 전" 두 줄.
  퀴즈 통과 전 안 보낸다는 건 유저 규칙이지 훅이 아니다(ADR 0003).
- **문체**: explain-diff의 Kleppmann 한 줄 그대로. eli5 폐기.

## User Stories

1. As a 에이전트가 짠 PR을 올리려는 개발자, I want 그 변경이 붙는 기존 시스템 설명을 먼저 읽기를, so that 코드를 보기 전에 "여기가 어딘지" 안다.
2. As a 같은 레포의 두 번째 PR을 보는 개발자, I want 깊은 배경이 접혀 있기를, so that 이미 아는 내용을 스크롤하지 않는다.
3. As a 텍스트 설명이 안 들어오는 개발자, I want 변경의 아이디어를 장난감 데이터 예시로 읽기를, so that 추상 문장 없이 "아 저거구나"가 된다.
4. As a 아키텍처 변화를 보고 싶은 개발자, I want 요청이 흐르는 경로를 변경 전/후 두 장 그림(예시 데이터 포함)으로 보기를, so that 뭐가 어디서 달라졌는지 한눈에 본다.
5. As a 의존 관계가 바뀐 PR을 보는 개발자, I want 새로 생긴·끊긴·순환 의존을 전/후 그림으로 보기를, so that 어느 모듈이 어느 모듈을 새로 부르게 됐는지 안다.
6. As a 의존이 안 바뀐 PR을 보는 개발자, I want 의존 그림이 아예 안 나오기를, so that 빈 섹션을 읽지 않는다.
7. As a 코드를 모르는 독자, I want 코드 조각이 git에서 그대로 잘라온 원문이기를, so that 틀린 코드를 틀린 줄 모르고 배우지 않는다.
8. As a 긴 diff를 보는 독자, I want 이해에 필요한 조각만 본문에 있고 전체 diff는 맨 아래 접혀 있기를, so that 리포트가 diff 전체 길이로 늘어나지 않는다.
9. As a 퀴즈를 푸는 독자, I want 보기 길이가 균일하기를, so that 긴 보기를 찍어서 통과하지 못한다.
10. As a 퀴즈를 푸는 독자, I want 오답을 클릭하면 왜 틀렸는지 설명이 나오기를, so that 틀린 지점이 바로 메워진다.
11. As a push 직전 개발자, I want 퀴즈가 나를 막지 않기를, so that 도구가 생산성과 경쟁하지 않는다(ADR 0003).
12. As a 남의 PR 리뷰어, I want 같은 리포트를 그 PR에 대해 뽑기를, so that 판단 전에 따라잡는다.
13. As a 리뷰어, I want 리포트에 "좋다/나쁘다"가 없기를, so that 판단은 내가(또는 /code-review가) 한다.
14. As a 한국어 유저, I want 산문·퀴즈가 한국어이고 코드·경로는 원문이기를, so that 읽기는 편하고 코드는 정확하다.
15. As a 터미널만 쓰는 유저, I want `--format md`에서도 4섹션과 퀴즈(정답 접힘)를 받기를, so that 브라우저 없이도 따라잡는다.
16. As a Artifact 계정 유저, I want 퀴즈가 발행된 페이지에서 클릭 동작하기를, so that 링크 하나로 읽고 푼다.
17. As a 유지보수자, I want 기존 fact sheet·게이트·추출 절차가 그대로이기를, so that 섹션만 바꾸고 정확성 장치는 잃지 않는다.
18. As a 다음 세션의 에이전트, I want "리뷰용 vs 이해용" 논쟁이 ADR 0010과 용어집에 닫혀 있기를, so that 같은 토론을 반복하지 않는다.
19. As a 유저, I want description이 "이해/따라잡기" 도구라고 말하기를, so that "diff 보여줘"가 아니라 "이 변경 이해하고 싶어"에도 트리거된다.
20. As a 유저, I want 문체 지시(Kleppmann)의 효과를 나중에 비교할 수 있기를, so that 근거 없는 한 줄을 영구 규칙으로 굳히지 않는다.

## Implementation Decisions

- **D1 — 섹션 고정 4개.** Background / Intuition / Code / Quiz. 순서 불변. 목차 + 한 페이지(탭 없음, explain-diff 형식 규칙 그대로).
- **D2 — Background 2층.** ① 초심자용 깊은 배경: 변경이 속한 서브시스템 전체 — 주변 코드를 **넓게 탐색**해 쓴다. HTML에선 `<details>` 접힘 기본, md에선 "(아는 독자는 건너뛰기)" 표시. ② 변경 직결 좁은 배경: 펼침.
- **D3 — Intuition 구성.** 아이디어 한 문단 + 장난감 데이터 예시(표/목록) + **변경 전/후 흐름도** 두 장(예시 데이터 필수, explain-diff 그림 팁 2번). 세부 구현 서술 금지 — 그건 Code 몫. 그림 패밀리는 소수로 정해 재사용.
- **D4 — Code = Literate diff.** 이해 순서로 그룹/정렬한 산문. 코드 조각은 `extract-hunks.js`(줄 범위 지정) 출력만 붙인다 — 모델이 코드를 타이핑하지 않는다(ADR 0005). before/after는 "뭐가 뭘로 바뀌었나"가 핵심인 조각에만, 나머지는 after만. 전체 diff는 맨 아래 접힌 부록 한 번.
- **D5 — 의존 변화 그림.** 변경된 파일의 import/호출이 바뀐 경우에만, Code 섹션 첫 블록으로 전/후 박스-화살표 두 장. 새 화살표·끊긴 화살표·순환을 색/스타일로 구분. 캡션은 사실 나열만. 판단 문장 금지. 안 바뀌면 블록 자체 생략.
- **D6 — Quiz.** 5문항 객관식, 중난도(변경 본질을 알아야 풀림), 함정 금지. 보기마다 어절 수 동일 + 정답만 자세히 쓰지 않기(teach 규칙, 한국어용 완화). 클릭 시 정오답 + 각 보기별 설명. HTML은 인라인 JS(Artifact CSP 내 동작), md는 정답·설명을 접힌 블록에. 게이트·훅 없음.
- **D7 — 삭제.** 기존 8섹션 중 Key Changes(→ D4로 흡수)를 제외한 7개 삭제. `--review` 같은 보존 플래그 없음.
- **D8 — 뒷단 유지.** Format/Scope/Language 감지, Intent Check, Data Gathering, Verification Checkpoint(fact sheet), artifact-gate, Artifact 채널 발행·사이드카, 로컬 채널 PNG 자가점검, md 300행 캡 — 전부 그대로. Data Gathering에 "주변 코드 넓게 탐색(Background용)" 단계 추가.
- **D9 — 문체.** "Martin Kleppmann처럼 명료하고 흐름 좋게, 섹션 전환 매끄럽게" 한 줄 유지. eli5 채택 안 함. 추상 문장엔 예시 하나를 붙이는 건 D3의 구조로 담보.
- **D10 — When to run.** SKILL.md 상단에 두 줄: 에이전트 작업 끝 → push 전 / 남의 PR 리뷰 전. "퀴즈 통과 전엔 보내지 않는다"는 권장 규칙으로 기술.
- **D11 — 이름 유지, description 교체.** `diff-visual` 유지(`X-visual` 패턴). description은 "변경을 리뷰 전에 따라잡는 설명서(배경·직관·literate diff·퀴즈)"로, plugin.json·marketplace.json 양쪽. README diff-visual 절 동일 갱신.
- **D12 — 디자인 레퍼런스.** `structured-blocks.md`(split-diff·추출)·`diagram-type-selection.md`·`semantic-tokens.md`·`anti-slop-tells.md` 계속 참조. 흐름도/의존 그림은 ADR 0009대로 채널별 렌더링(Artifact=inline SVG, Local=Mermaid).

## Testing Decisions

- 플러그인 스킬이라 단위 테스트 없음. 검증은 **같은 diff로 실제 생성 후 육안 + 게이트**.
- 고정 테스트 diff: 이 레포의 최근 실제 PR 하나(의존 변화가 있는 것 1 + 없는 것 1).
- 확인 항목: 4섹션 순서, 깊은 배경 접힘, 흐름도에 예시 데이터 존재, 코드 조각이 추출본과 byte 동일, 의존 그림이 "의존 무변경 diff"에선 부재, 퀴즈 보기 어절 수 동일, 판단 어휘("should", "bad", "좋다", "나쁘다") 0건, 삭제 섹션 제목 0건.
- 프라이어 아트: `docs/issues/010` Artifact 채널 검증 절차(게이트 `--content-only` + 발행 + 사이드카).

## Out of Scope

- `wiki/summaries/explain-diff-skill.md`의 잘못된 퀴즈 규칙(teach 것을 explain-diff 것으로 오기) 수정 — 별건.
- rubber-duck-tutor·coach 연동(gaps.log 등). 미설치 상태이고 매체가 다름.
- Litt 기법 2·3 (micro-worlds, 인터랙티브 피겨 드래그, shared spaces).
- 퀴즈 결과 저장·간격 반복.
- 다른 vision-powers 스킬(doc-visual 등)의 Mode 변경.
- 훅으로 push 차단(ADR 0003 위반).

## Further Notes

- 핸드오프의 "새로 만들 것은 작아야 한다(세션형 도구는 안 걸린다)" 진단은 이번 세션에서 **기각**: Litt의 도구도 세션형인데 매일 쓰인다. 차이는 크기가 아니라 "언제 쓰나"가 박혀 있냐(D10).
- 핸드오프 Decision 3(eli5 말투)·Blocker(A/B 모드 분기)는 이 스펙으로 대체됨 — 모드 분기는 "아는 시스템이 없다"는 전제 앞에서 질문 자체가 무효.
- **열린 실험**: 같은 diff로 Kleppmann 한 줄 있음/없음 두 번 생성해 비교. 결과에 따라 D9 조정. 이슈 S4.
