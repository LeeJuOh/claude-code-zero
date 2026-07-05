# vision-powers Artifact 채널: claude.ai 퍼블리시를 전달 채널로 (공식 Artifacts 위임)

> 상태: 구현 대기 · 생성: 2026-07-05
> 용어집: `docs/context/vision-powers.md` (신규 용어: **Artifact channel**)
> 결정 근거: `docs/adr/0007-artifact-channel-delegates-visual-design.md` (선행 `0002` 직접작성 · `0005` grounding)
> 공식 문서: `https://code.claude.com/docs/en/artifacts`
> 출처: grill-with-docs + domain-modeling 세션 (2026-07-05)

## What to build

Claude Code 공식 **Artifacts**(세션 산출물을 claude.ai 비공개 URL로 퍼블리시, 버전·라이브 갱신·조직 공유)를
vision-powers의 **세 번째 전달 채널**로 흡수한다. 로컬 파일·채팅 md에 이어 "URL로 공유"가 생긴다.

**포지셔닝 (그릴 확정):**
- 즉석 세션 캡처·일회성 시각화 = **네이티브 Artifacts에 양보** (플러그인 코드 0줄 — 네이티브가 정확히 그 자리).
- 그라운딩된 report-grade visual artifact = **vision-powers**. 분석 에이전트·build-time grounding·Gate·refine 루프는 네이티브에 없다. Artifacts는 경쟁자가 아니라 전달 채널.
- 철학 겹침은 정면 (공식 문서 "terminal text is the wrong medium" = 우리 thesis) — 방향 검증으로 해석. 가용성(구독제+`/login` 전용)만으로도 자체 파이프라인 존치는 필수.

**인터페이스 (확정 — 신규 플래그 1개뿐):**

```
--format html|md    렌더 형식 (현행 유지)
--artifact          스위치 (신규). 켜면: 디자인+배포 = Artifact 채널. 끄면: 현행
```

| | `--artifact` 끔 (기본) | `--artifact` 켬 |
|---|---|---|
| **html** | 우리 디자인, 로컬 파일 (현행) | 내장 artifact-design skill 페이지, claude.ai URL |
| **md** | 채팅/PR 텍스트 (현행) | 생성된 md 파일 **그대로** 퍼블리시, URL |

**핵심 불변식 (절대 깨지 않음):**
- **디자인 위임 = 스위치에 내포** (ADR 0007). artifact 채널에서 **design-brief 레버만** 내장 artifact-design skill로 넘어간다. source passthrough · build-time grounding · Gate 콘텐츠 검사는 스킬 소유 유지. `--design` 류 별도 인자 금지.
- **CDN 렌더 패턴(0002·0005)은 로컬 채널 한정.** artifact 페이지는 CSP로 외부 요청 전면 차단 — Mermaid 런타임 금지(inline SVG/HTML+CSS로), highlight는 no-CDN fallback(단색 monospace 허용, 0005가 이미 승인한 강등).
- **그라운딩 불변** (ADR 0005): structured block은 `extract-hunks.js` 출력을 **그대로 삽입**, 모델 재타이핑 금지. 채널이 바뀌어도 사실은 기계 복사.
- **폴백 = 자동 강등 + 사유 한 줄, 묻지 않음.** 퍼블리시 불가 시 해당 format의 "끔" 칸으로. 탐지면은 넓다(공식 문서): 플랜 미달·API key/gateway token/Bedrock/Vertex/Foundry·`disableArtifact`·CMEK/HIPAA/ZDR 조직·`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`·SDK/Action/MCP 컨텍스트·최초 퍼블리시 권한 거부·에러. 사유 한 줄은 원인 특정 추측 말고 generic하게.
- **산출물 경로 = `${CLAUDE_PLUGIN_DATA}/reports/`** — artifact 소스 파일도 동일 (CWD 오염 금지).
- **아티팩트 정체성 = URL이지 파일 경로가 아님** (공식: "Without the URL, a new session always creates a new artifact"). 같은 세션 내 재퍼블리시만 같은 URL 공짜. 세션 넘는 refine은 저장해 둔 URL을 `url` 인자로 넘겨야 유지 — S4.5가 배관. favicon·title도 재퍼블리시 시 고정(도구 계약: 바꾸면 다른 페이지로 읽힘).
- **퍼블리시하는 스킬은 frontmatter `allowed-tools`에 `Artifact` 추가** — 없으면 도구 호출 자체 불가. 페이지 작성 **전** 내장 artifact-design skill 로드(도구 계약 MUST).

**디자인 위임 고지 (3층, 전부 한 줄):** ① README ② 퍼블리시 시 URL 옆 런타임 한 줄 ("내장 아티팩트 디자인 적용 — 로컬 리포트와 다름") ③ `argument-hint`.

### 슬라이싱 원칙 (tracer bullet)

각 슬라이스 = 스킬 1개(또는 관심사 1개)를 `SKILL.md 분기 → 페이지 작성 → 게이트 → 퍼블리시 → 폴백 → 검증` 전 층 관통.
**S1이 최소 인프라(분기 패턴·고지·폴백 규칙)를 자기 수직 절단 안에서 만들고**, 이후 슬라이스가 복제·확장한다.

---

## S1 — doc-visual `--artifact` 엔드투엔드 ⭐ (tracer bullet)

### What to build

가장 단순한 입력(md 파일 1개)을 가진 `doc-visual`로 채널 전체를 입증한다.
데모: "`doc-visual ./docs/x.md --artifact` 치면 claude.ai URL이 나오고, 브라우저에서 내장 디자인 페이지가 열린다."

### Acceptance criteria

- [x] `doc-visual` SKILL.md에 `--artifact` 분기 (자연어 동치 "아티팩트로", "공유 링크로" 포함): **페이지 작성 전 내장 artifact-design skill 로드**(도구 계약 MUST), **CSP-safe 페이지** 작성 — fragment(doctype/head/body 없음), 외부 요청 0, 라이트/다크 테마 대응, `<title>` 설정.
- [x] `doc-visual` frontmatter `allowed-tools`에 `Artifact` 추가 (현행엔 없음 — 없으면 퍼블리시 호출 불가).
- [x] Artifact 도구로 퍼블리시(`favicon` 이모지 + `description` 전달) → URL 출력 + 위임 고지 한 줄 동반. 소스 파일은 `${CLAUDE_PLUGIN_DATA}/reports/`에. 퍼블리시 성공 시 URL 사이드카 기록(S4.5 규약 — S1은 쓰기만, 최소 형태).
- [x] **같은 세션 내** 재생성(refine) 시 같은 파일 경로 재사용 — 같은 URL에 버전으로 쌓임. favicon·title 고정. (세션 넘는 refine의 URL 유지 = S4.5.)
- [x] Gate: artifact 변형엔 **콘텐츠 검사만** (raw-md 누출·placeholder·링크·alt). 디자인 계열(밀도·팔레트·폰트체인·Mermaid classDef)·PNG self-audit 스킵 — 내장 디자인 소관. 방식: `artifact-gate.js`에 `--content-only` 플래그 신설(검사 서브셋). 자동 시각검증이 0이 되는 트레이드오프는 의도 — ADR 0007 도그푸딩이 대체.
- [x] 폴백: Artifact 도구 미가용/퍼블리시 실패 = 로컬 html 저장 + 사유 한 줄, 묻지 않음.
- [x] `argument-hint`에 `[--artifact (native design + publish)]`.
- [x] 검증: 같은 md 입력으로 로컬 vs artifact 페이지 1회 비교 기록 (디자인 층 도그푸딩 시작점 — ADR 0007 열린 판정).

### 구현 완료 (2026-07-05)

전 항목 반영: `doc-visual` SKILL.md artifact 분기(스킬 로드 MUST·fragment·CSP·테마·`<title>`), frontmatter(`allowed-tools`에 `Artifact`, `argument-hint`), `artifact-gate.js --content-only` 플래그(+테스트 2건, 총 49건 통과), `write-artifact-sidecar.js` 신규, 폴백 문구. `claude plugin validate .` 통과.

**검증 (로컬 vs artifact 1회 비교)**: ADR 0007 문서로 양쪽 채널 실제 생성.
- 로컬(warm-stone 팔레트, Instrument Serif+Geist, Mermaid CDN flowchart) — `artifact-gate.js` 풀체크 통과.
- artifact(내장 artifact-design skill 로드 후 별도 팔레트로 직접 재설계 — cool-teal, 시스템 세리프/산세리프, inline SVG 다이어그램) — `--content-only` 통과 → 실제 Artifact 툴로 퍼블리시 성공: https://claude.ai/code/artifact/203122a5-aa68-4a0d-932a-8ea54265e663 → 사이드카(`*.artifact.json`) 기록 확인.
- 관찰: 내장 스킬 가이드가 "템플릿화 회피"를 강하게 지시해서 두 채널이 같은 문서인데도 완전히 다른 시각 정체성으로 나옴(ADR이 승인한 결과와 일치). 다이어그램은 Mermaid 대신 inline SVG로 손색없이 대체됨. 폰트는 웹폰트 data-URI 내장 대신 시스템 폰트 스택으로 단순화(1회 검증용 판단 — 실사용 시 artifact-design 가이드가 data-URI 내장을 권장함을 유의).

### Blocked by

- None — 즉시 시작 가능.

---

## S2 — md 퍼블리시 보너스 (`--format md --artifact`)

### What to build

md 리포트를 **무변형 그대로** 퍼블리시한다 (공식 스펙: `.md` 파일은 스타일된 HTML로 렌더).
스크립트도 CSS도 없어 CSP 공사 0 — 최저가 티어. 데모: "md 리포트가 URL로."

### Acceptance criteria

- [ ] **사전 테스트 (5분)**: claude.ai md 렌더러가 Mermaid 블록을 그리는지 확인, 결과를 이 이슈에 기록.
- [ ] `--format md --artifact`: 생성된 md 파일 그대로 퍼블리시 (재구조화 없음 — 이미 visual artifact).
- [ ] Mermaid 미렌더 확인 시: md+artifact에선 다이어그램이 코드 블록으로 보인다는 한계 한 줄 (README·SKILL.md).
- [ ] 폴백: 퍼블리시 불가 = 채팅 md 전달로 강등 + 사유.

### Blocked by

- S1 (퍼블리시·고지·폴백 패턴 재사용).

---

## S3 — diff-visual artifact + 그라운딩 주입

### What to build

`diff-visual`에 S1 패턴을 복제하되, **structured block의 그라운딩을 채널 너머로 유지**하는 규칙을 확립한다.
데모: "split-diff의 실제 코드 줄이 아티팩트 페이지에 verbatim으로 보인다."

### Acceptance criteria

- [ ] `diff-visual` SKILL.md artifact 분기 (S1 패턴).
- [ ] 그라운딩 주입 규칙 명문화: structured block은 `extract-hunks.js` 출력을 **그대로 삽입**, 모델 재타이핑 금지. (스크립트 수정 불필요 — 출력이 이미 무스타일 `<pre><code class="language-*">`; 그릴 중 검증됨. 모델은 클래스에 인라인 CSS만 입힘.)
- [ ] 하이라이트: **highlight.js CDN `<link>`/`<script>` 태그도 emit 금지** (Mermaid와 대칭 — structured-blocks.md의 `<head>` 삽입 지시는 로컬 채널 한정). no-CDN fallback 경로만, 단색 monospace 강등 허용, 깨지지 않음. fallback CSS의 `var(--paper-2)/--ink/--mono` 등 디자인시스템 변수는 artifact 페이지에 없음 — 구체 색값으로 치환.
- [ ] 다이어그램: Mermaid 런타임 금지 — inline SVG/HTML+CSS (내장 skill 가이드대로).
- [ ] 대형 diff 1회로 16 MiB 렌더 한도 체감 확인, 결과 기록.

### Blocked by

- S1.

---

## S4 — plugin-visual + context-health-visual 확장

### What to build

남은 두 리포트 스킬에 S1 패턴을 복제한다. 에이전트 분석 결과(보안 표·health 그리드)가 내장 디자인에서
어떻게 나오는지가 디자인 층 최종 판정의 핵심 표본.

### Acceptance criteria

- [ ] `plugin-visual` artifact 분기 (4-에이전트 분석 포함 페이지).
- [ ] `context-health-visual` artifact 분기.
- [ ] 각각 로컬 대비 1회 비교 기록 (도메인 레이아웃 표본 — ADR 0007 Plan B 판정 재료).

### Blocked by

- S1. (S3와 병렬 가능.)

---

## S4.5 — URL 영속화 + 크로스세션 refine (사이드카)

### What to build

퍼블리시된 URL을 리포트 옆 **사이드카 파일**로 저장하고, report-manager refine이 세션을 넘어도
같은 URL에 재퍼블리시하게 한다. 데모: "어제 만든 아티팩트, 오늘 refine해도 링크 그대로."

사이드카 선택 이유: report-manager는 대장이 아니라 **폴더 스캔**(`list-reports.js`)으로 리포트를
찾는다 — URL도 파일시스템에 두면 같은 철학. `log-report.js` 대장은 "없을 수 있음, 리스팅에 쓰지
말 것"으로 이미 신뢰 강등 상태라 집이 못 된다.

### Acceptance criteria

- [ ] 퍼블리시 성공 시 `<report>.artifact.json` 사이드카 기록 (URL·title·favicon·마지막 퍼블리시 시각). S1이 쓰기 시작한 최소 형태를 여기서 규약으로 확정.
- [ ] `list-reports.js`: 사이드카 발견 시 리포트 항목에 `artifact_url` 포함. list/open 출력에 URL 표시.
- [ ] report-manager refine: 대상 리포트에 사이드카 있으면 재퍼블리시 때 그 URL을 `url` 인자로 전달 — 같은 URL에 버전 스택. favicon·title 사이드카 값 재사용(고정).
- [ ] 사이드카 없거나 URL 죽음(퍼블리시 에러) 시: 새 URL 발행 + "새 링크 발행됨, 기존 공유 링크는 구버전 유지" 한 줄.
- [ ] delete 시 사이드카 동반 삭제.

### Blocked by

- S1 (퍼블리시 경로·사이드카 최소 쓰기).

---

## S5 — config.json 취향 + 문서·버전

### What to build

고정 취향을 설정으로, 문서를 최종 표면에 맞춘다. 데모: "config에 `artifact: true` 박으면 플래그 없이 늘 퍼블리시."

### Acceptance criteria

- [ ] `scripts/config.js`에 `default_format` / `artifact` 키 (기존 키가 snake_case — `default_language`·`auto_open`·`reports_dir` — 이므로 통일; 언어는 기존 `default_language` 재사용, 신규 `lang` 키 금지). 스킬 시작 시 참조, 플래그·자연어 = 일회성 override. config.js 헤더 "Supported keys" 주석 갱신.
- [ ] README: `--artifact` 스위치 + 2×2 표 + 위임 고지 한 줄. 구현-디테일 섹션 금지 (README 스타일 규칙).
- [ ] `plugin.json` + `marketplace.json` description 갱신 (채널 추가 반영).
- [ ] `marketplace.json` 버전 **minor 범프** (기능 추가).

### Blocked by

- S3 · S4 · S4.5 (문서가 전체 표면을 서술하므로 마지막).

---

## 열린 질문 (구현 중 결정)

- ~~**report-manager 퍼블리시 이력**~~ — 그릴 2차(2026-07-05)에서 **S4.5로 승격**. 아티팩트 정체성 = URL이라 크로스세션 refine의 "한 링크 유지"에 URL 영속화가 필수 의존성으로 판명. 사이드카 방식 확정.
- **디자인 층 최종 소유권**: S1·S3·S4의 비교 기록 누적 후 판정 — 내장 디자인이 도메인 레이아웃에서 딸리면 Plan B = 시각 층 CSP 이식 (Mermaid 인라인 ~2MB 또는 빌드타임 SVG 프리렌더, ADR 0007 옵션 A).

## 스코프 제외 (명시적 기각 — 그릴 기록)

- 세션 직행 시각화 스킬 신설 — 네이티브와 정면 중복, 그라운딩 자산 못 씀.
- `--design native|builtin` 플래그 — 채널이 디자인 소유권을 결정, 별도 인자는 모순.
- `--format artifact` (format 축 확장) — format(렌더 형식)과 delivery(채널)의 카테고리 혼동.
- 우리 시각 층의 CSP 이식 — v1 아님, Plan B로만.
