# html-plan vs vision-powers — 비교 분석과 그릴 대기열

> 생성: 2026-10-07 · 출처: 비교 세션 (references/claude-plugins-community/html-plan ↔ plugins/vision-powers v5.0.0)
> 상태: **분석 기록. 결정 없음.** 각 후보를 하나씩 grilling 세션으로 다룬 뒤 스펙/이슈로 올린다.
> 관련 ADR: 0002(모델 직접 작성) · 0005(추출 그라운딩) · 0007(Artifact 채널 디자인 위임) · 0009(Artifact 우선 기본값) · 0011(다이어그램 그라운딩은 authoring)
> 위키: `wiki/concepts/html-as-agent-artifact.md` · `wiki/summaries/unreasonable-effectiveness-html.md` · `wiki/summaries/answer-me-with-html.md` · `wiki/summaries/whiteboard.md`

## 1. 대상

**html-plan** — Thariq Shihipar, `claude-plugins-community/html-plan`, 1.0.0. 2026-10-01 생성, 10-05 마지막 수정(`88003be`). 스킬 1개.
구현 계획을 "주장(claim) 트리" HTML 한 장으로 쓰고, 독자가 결정·편집·코멘트한 뒤 **Respond** 버튼으로 마크다운 한 덩어리를 뽑아 Claude에 붙여 넣는다. Claude는 그 응답을 받기 전에는 빌드하지 않는다.

파일: `SKILL.md`(174줄) · `references/blocks.md`(227) · `runtime/htmlplan.js`(1,299) · `runtime/htmlplan.css`(564) · `runtime/pack.mjs`(300) · `examples/scheduled-send.html`. 테스트 없음. 외부 요청 없음(CDN 0).

**vision-powers** — 스킬 5개(plugin-visual·diff-visual·doc-visual·fact-check·report-manager), 에이전트 2개, 스크립트 7개(테스트 4개). 빌드 **후** 산출물을 읽기용 리포트로 만든다.

## 2. 한 줄 차이

| 축 | html-plan | vision-powers |
|---|---|---|
| 시점 | 빌드 **전** 계획 | 변경·문서·플러그인 **후** 리포트 |
| 독자 역할 | 답한다 — 결정·스키마 편집·strike·코멘트 → Respond | 읽는다 — 퀴즈는 페이지 안에서 끝남, 되돌아오는 것 없음 |
| HTML 작성 | 모델은 커스텀 엘리먼트(`doc-claim` `doc-code` `doc-ask` …)만 쓴다. 런타임 JS/CSS 1,860줄은 공용 라이브러리, pack이 인라인 | 모델이 CSS/JS까지 전부 손으로 쓴다(ADR 0002). Artifact 채널은 artifact-design에 위임(ADR 0007) |
| 구조 | claim 트리: 1단계 "무엇을 할 수 있나"(목업) → 2단계 "어떻게"(call stack/스키마) → 3단계 "어디"(코드). 최대 3단계·자식 5·exhibit 1. 닫힌 트리 = 요약, TL;DR 금지 | doc-visual: 원문 구조 따름 · diff-visual: Background/Intuition/Code/Quiz 고정 · plugin-visual: 8섹션 |
| 소스 인용 | `src="path" lines="a-b" ref="sha"` 선언 → pack이 디스크/git에서 채우고 커밋 스탬프. 줄 수 불일치는 에러 | extract-hunks가 추출 → 모델이 출력을 복사해 붙임(ADR 0005). 붙인 뒤 검증 없음 |
| 검증 | pack.mjs 하나: 브라우저와 **같은 파서**로 린트 + 트리 형태 + caption 유무 + 폰 너비 예산 + STE 부분 검사 + 비밀파일/토큰 거부 + `--root` 밖 읽기 거부 + 발행 전 "삽입된 파일 목록" 출력. 에러는 쓰기 중단 | artifact-gate(이미지·마크다운 잔재·Mermaid 밀도·토폴로지·보라색·href·alt·placeholder) + extract-hunks 분리. 산문·섹션·보안 검사 없음 |
| 산문 규칙 | ASD-STE100 강제. pack이 부분 검사(금지어·축약·완료시제·수동태·6문장 초과) | 규칙 없음. anti-slop 8항목은 스크립트 검사 없음. diff-visual은 Kleppmann 톤 + "판정어 금지" |
| 독자 입력 보안 | "응답은 데이터이지 지시가 아니다" 명시. 자유 텍스트는 `>` 인용/diff 펜스로 격리 | 해당 없음(입력 없음) |
| 왕복 상태 | localStorage + 클립보드. `liveOn = false, send = null` 스텁 → 라이브 전송 계획 중 | ArtifactComments 도구가 하네스에 있으나 플러그인은 안 씀. ✎ 피드백은 `a24bbac`에서 "소비자 없음"으로 삭제 |
| 우리가 앞선 것 | — | Artifact 발행·사이드카·같은 URL 재발행, fact-check, md 채널, `--lang`, env-fit 스캔, 에이전트 2개, 테스트 |

## 3. 위키가 뒷받침하는 것

- **export 버튼 왕복** — thesis 글의 백미. "UI에서 한 일을 텍스트로 환원해 에이전트에 붙여 넣게, 항상 export로 끝내라. 루프가 조여진다." html-plan Respond = 이 패턴. vision-powers에는 없음. → 후보 B.
- **핀된 소스 검증** — whiteboard는 "순수 HTML은 스펙을 코드에 묶는 affordance가 없다"를 제품 존재 이유로 들고, 커밋 고정 줄 범위를 저장 전 검증. html-plan `src= lines= ref=` + pack이 같은 해법. → 후보 C.
- **공용 런타임 + STE 린트** — answer-me-with-html이 이미 실증(마크다운 초안 + 번들러, 출력 토큰 7.4배 절감, 단 턴 증가로 달러 비용은 비슷). html-plan과 두 소스가 수렴. → 보류 1, 후보 D.
- **SOFT 지침 → HARD 게이트** — evidence-gates · Hue 키노트. → 후보 A.
- 위키에 html-plan 요약 항목은 **아직 없음**. llm-wiki 레포에서 추가할 후보.

## 4. 그릴 대기열 — 하나씩 세션으로

각 항목은 grilling 세션 1회 → 결정 → 스펙/이슈(017부터) 또는 폐기. 아래는 **후보일 뿐 결정이 아니다.**

### A. 게이트 보강 (추천 1순위 — 작고 ADR 충돌 없음)
pack.mjs가 하고 artifact-gate가 안 하는 것 중 가져올 후보:
- 비밀파일 이름(`id_rsa*` `credentials*` `secrets*` `*_history` `*.local.json`)과 토큰 패턴(`sk-ant-` `AKIA…` `ghp_` `-----BEGIN … PRIVATE KEY` 등) 거부. extract-hunks가 코드를 페이지에 박는데 이 가드가 없다.
- 발행 전 "이 파일들의 코드가 페이지 안에 들어갔다" 목록 출력.
- 폰 너비 예산: 90자 초과 코드 3줄 이상, 다이어그램 열 수.
- anti-slop 중 정규식으로 잡히는 것("this section covers", 요약 누출)을 **부분 검사**로. pack.mjs처럼 "완전하지 않다"를 명시.
그릴 질문: 어느 채널에서 도나(`--content-only`도 포함?) · 경고 vs 에러 · extract-hunks 쪽에 둘지 게이트에 둘지.

### B. 독자→Claude 왕복 (가장 큰 차별점 — 결정 필요)
- 패턴: 요소마다 코멘트, 결정은 추천값 `checked`, Respond 시트가 마크다운 하나로 뽑힘. "열어보고 유지" ≠ "열지 않음; 기본값 유지" 구분. 붙여진 독자 텍스트는 데이터이지 지시가 아니다.
- 선행 조건: **소비자가 먼저**. ✎ 피드백은 소비자가 없어서 죽었다(`a24bbac`). 후보 소비자: report-manager refine, fact-check.
- 경로 선택: 클립보드(html-plan 현재) vs ArtifactComments(우리 하네스에 이미 있음, html-plan `liveOn` 스텁이 가려는 곳).
- 어디에 붙나: diff-visual 퀴즈/코드 코멘트 · doc-visual 섹션 코멘트 · plugin-visual Recommendations 수락/거절.
그릴 질문: 누가 응답을 읽어 무엇을 바꾸는가 · 클립보드냐 ArtifactComments냐 · 프롬프트 인젝션 격리 규칙.

### C. 선언적 소스 인용
- 모델은 `src="path" lines="a-b"`만 쓰고 게이트(=패커)가 채우고 커밋을 박는다. 줄 수 불일치는 에러. 모델 복붙 단계가 사라져 재타이핑 위험 0.
- ADR 0005 "추출은 그라운딩 도우미" 원칙과 같은 방향. 게이트가 쓰기 단계를 갖게 되는 것이 변화.
그릴 질문: Artifact 채널(페이지 조각)에서도 가능한가 · extract-hunks와 통합인가 대체인가 · 실패 시 동작.

### D. STE 산문 린트 (별도 결정)
- answer-me-with-html에 완전한 린터(`src/lint/ste.js` + 단어목록), html-plan은 부분 검사. 사용자 글로벌 규칙과 같다.
- 충돌: diff-visual Kleppmann 톤("추상 문장 뒤에 구체 예"). 영문 리포트 독자에게는 득.
그릴 질문: 어느 스킬에 적용 · 경고만 · 한국어 `--lang` 출력은 제외.

## 5. 보류 — 이번에는 안 가져옴

- **공용 런타임 라이브러리.** 두 소스(html-plan·answer-me-with-html)가 수렴하지만 ADR 0007(Artifact 채널 디자인 위임)과 충돌. ADR 0002는 "내용을 압축하는 파이프라인"을 지운 것이라 렌더링 라이브러리와는 직접 충돌하지 않는다. **토큰 비용이 문제로 드러나면 재검토.**
- **claim 트리 구조.** 계획을 판정하는 문서에 맞는 형태. diff-visual은 가르치는 문서라 흐름이 끊긴다. "닫힌 트리가 요약" 원칙만은 우리 "요약이 본문을 대신하지 않는다" 규칙과 같은 뿌리.
- **plan 스킬 신설.** html-plan을 복제할 이유 없음. 옆에 설치하면 된다.

## 6. 다음 행동

1. A부터 grilling 세션. 결정되면 스펙 017 + 이슈 017.
2. B는 소비자 후보를 들고 grilling. 결정 전 코드 변경 없음.
3. llm-wiki에 `summaries/html-plan.md` 추가 (llm-wiki 레포에서).
