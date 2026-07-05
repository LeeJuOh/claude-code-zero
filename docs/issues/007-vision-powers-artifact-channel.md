# vision-powers Artifact 채널: claude.ai 퍼블리시를 전달 채널로 (공식 Artifacts 위임)

> 상태: **완료** (S1~S5 전 슬라이스 구현·검증 완료, 이슈 종료) · 생성: 2026-07-05
> 용어집: `docs/context/vision-powers.md` (신규 용어: **Artifact channel**)
> 결정 근거: `docs/adr/0007-artifact-channel-delegates-visual-design.md` (선행 `0002` 직접작성 · `0005` grounding)
> 공식 문서: `https://code.claude.com/docs/en/artifacts`
> 출처: grill-with-docs + domain-modeling 세션 (2026-07-05)

## 종료 요약 (2026-07-06 세션 — S5 구현 완료로 이슈 007 전체 종료)

**최종 결과**: S1~S5 전 슬라이스 acceptance criteria `[x]`. vision-powers는 4개 리포트 스킬
(`doc-visual`·`diff-visual`·`plugin-visual`·`context-health-visual`)에서 `--artifact` 플래그(또는
자연어 동치)로 claude.ai Artifact 채널에 퍼블리시할 수 있고, `report-manager`가 세션을 넘어 같은 URL에
재퍼블리시하며, `config.json`의 `default_format`/`artifact` 키로 플래그 없이도 기본값을 고정할 수 있다.
marketplace 버전 `4.6.0`(minor 범프), `CHANGELOG.md`에 `4.6.0` 항목 추가. 자세한 항목별 구현 내용은
각 슬라이스 절의 "구현 완료" 하위 섹션 참고.

**이번 세션(S5) 작업**: `scripts/config.js` 헤더에 `default_format`/`artifact` 키 문서화 + 4개 스킬
SKILL.md에 "Config precedence" 문단 추가(스킬 시작 시 config 1회 조회, 이번 요청의 명시적 신호가 항상
config보다 우선) · README를 `doc-visual` 전용에서 4개 스킬 공통 2×2 표 + 공유 범위 고지로 확장 ·
`plugin.json`/`marketplace.json` description 갱신 · 버전 범프. 코드 로직 변경 없음(문서·설정 주석·
frontmatter 산문만) — `claude plugin validate .`(기존 11건 버전-미지정 경고만, 신규 없음) ·
`node --test scripts/*.test.js`(57건 전부 통과)로 회귀 없음 확인. 라이브 트리거 검증(실제로 config에
값을 심고 자연어 요청만으로 퍼블리시되는지)은 이번 세션에 실행하지 않음 — S1·S4.5처럼 별도 세션의
서브에이전트 검증을 권장.

**직전 세션(S4.5 라이브 검증, 2026-07-06) 기록** — report-manager `refine`의 "사이드카 URL 재사용
재퍼블리시"를 실제로 실행해 세 레벨(파일/툴 호출, 브라우저 렌더링, 권한 범위) 모두 PASS 확인:
1. 이 환경의 vision-powers 플러그인 캐시(4.5.1)가 리포 소스보다 오래돼(`Artifact`가 `allowed-tools`에
   없음) `Skill` 툴로 직접 부르면 구버전이 실행됨을 먼저 확인 — 리포 소스를 직접 따르는 경로가 필요했다.
2. `claude --plugin-dir ... -p "..."` CLI 서브프로세스 시도는 자동 권한 분류기가 두 번 다 차단
   ("Create Unsafe Agents") — 우회하지 않고 일반 서브에이전트(Agent 툴)로 전환.
3. 서브에이전트가 리포 소스의 실제 `report-manager` SKILL.md `refine` 절을 그대로 따라, S4에서 이미
   퍼블리시된 `2026-07-06-worktree-plus-report.artifact.html`(사이드카 URL
   `https://claude.ai/code/artifact/e0d6a95a-d868-4ee7-8d1f-48cedef9c9da`)에 footer 문장을 추가 →
   content-only 게이트 통과 → `url` 인자로 사이드카 URL 전달 → republish 결과 URL 동일 → 사이드카
   재작성. 디스크 직접 대조로 서브에이전트 보고와 실제 상태 일치 확인.
4. `claude-in-chrome`으로 같은 URL 재방문 — 첫 로드는 지연 페인트로 검은 화면이었으나 클릭 한 번으로
   정상 렌더링, "Version history" 드롭다운에서 Version 2/Version 1 확인, footer 문장도 확인.

**교훈**: 자동 권한 분류기가 넓은 사전허용을 요구하는 경로를 막으면 우회 대신 더 안전한 대안(서브에이전트)
으로 전환할 것. 브라우저 확인에서 첫 스크린샷이 비정상(검은 화면)이어도 클릭 등 상호작용을 한 번 더
시도한 뒤 판정할 것 — 지연 페인트를 결함으로 오판할 수 있다.

**남은 것**: 이슈 007 자체는 종료. 잔여 팔로업(이슈 스코프 밖, 전부 선택 사항):
- S5 config 라이브 트리거 1회 검증(위 참고).
- 사이드카 없음·URL 죽음 두 분기 라이브 검증(S4.5에서 미뤄둔 항목).
- "열린 질문"란의 "디자인 층 최종 소유권" 판정 — S1·S3·S4 비교 기록은 모두 내장 디자인이 도메인
  레이아웃에서 구조적으로 버틴다는 쪽으로 수렴했으나, 최종 판정(Plan B 필요 여부)은 사용자 그릴로 남겨 둠.

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

- [x] **사전 테스트 (5분)**: claude.ai md 렌더러가 Mermaid 블록을 그리는지 확인, 결과를 이 이슈에 기록. → **미렌더 확인**(2026-07-05). `mermaid` 코드블록 포함 md 파일을 Artifact로 퍼블리시 후 브라우저 실제 확인: 소스 그대로 monospace 코드블록으로 표시, 다이어그램 미생성. md+artifact 채널은 다이어그램을 코드로만 전달.
- [x] **명시 요청** (`--format md --artifact` 직접 입력): 묻지 않고 md 그대로 퍼블리시 (재구조화 없음 — 이미 visual artifact). 다이어그램 포함 시 URL 옆 한 줄: "다이어그램은 코드로 표시 — 렌더는 `--format html --artifact`".
- [x] **모호 요청** (자연어 "링크로 공유해줘" 등 + md 리포트에 mermaid 블록 존재): AskUserQuestion 1회 — ① html+artifact로 재생성 (다이어그램 렌더, 추천) ② md 그대로 퍼블리시 (다이어그램 코드) ③ 로컬 유지. 다이어그램 없으면 묻지 않고 md 퍼블리시.
- [x] 한계 한 줄 문서화: md+artifact에선 다이어그램이 코드 블록으로 보임 (README·SKILL.md — 사전 테스트로 확정, 2026-07-05).
- [x] 폴백: 퍼블리시 불가 = 채팅 md 전달로 강등 + 사유. (폴백은 여전히 묻지 않음 — 질문은 퍼블리시 **전** 형식 선택에만.)

### 구현 완료 (2026-07-06)

`doc-visual` SKILL.md: frontmatter에 `AskUserQuestion` 추가, "Format detection"에 명시/모호 분기
규칙(둘 다 리터럴 플래그 = 명시 · 자연어 아티팩트 의도 = 모호), 신규 "Markdown format — Artifact
channel" 섹션(분기별 동작 + AskUserQuestion 3지선다 + 퍼블리시 경로), "Publish (`--artifact`)" 절을
html/md 겸용으로 일반화(디자인 위임 고지는 html만, 다이어그램 한계 고지는 md만), Error handling 표에
포맷별 폴백 행 분리. README에 `doc-visual` 전용 "Artifact publishing" 문단 추가(전체 2×2 표는 S5 몫).
`claude plugin validate .` 경고 없이 통과(버전 미지정 경고 11건은 로컬 플러그인 컨벤션상 정상).

**미검증**: 이번 세션엔 vision-powers 플러그인이 로드돼 있지 않아(available skills 목록에 없음)
실제 `--format md --artifact` 퍼블리시 end-to-end(명시/모호 양쪽 분기, AskUserQuestion 트리거)는
아직 라이브로 실행해보지 않음. `claude --plugin-dir ./plugins/vision-powers`로 별도 세션에서
검증 필요 — S1의 "로컬 vs artifact 비교"처럼 실퍼블리시 1회 권장.

### Blocked by

- S1 (퍼블리시·고지·폴백 패턴 재사용).

---

## S3 — diff-visual artifact + 그라운딩 주입

### What to build

`diff-visual`에 S1 패턴을 복제하되, **structured block의 그라운딩을 채널 너머로 유지**하는 규칙을 확립한다.
데모: "split-diff의 실제 코드 줄이 아티팩트 페이지에 verbatim으로 보인다."

### Acceptance criteria

- [x] `diff-visual` SKILL.md artifact 분기 (S1 패턴). → 신규 "HTML mode — Artifact channel" 절 신설(스킬 로드 MUST·fragment·CSP·테마·`<title>`), frontmatter(`allowed-tools`에 `Artifact`, `argument-hint`), Format Detection에 `--artifact` 행 + 자연어 동치 + md 조합 스코프아웃 문구.
- [x] 그라운딩 주입 규칙 명문화: structured block은 `extract-hunks.js` 출력을 **그대로 삽입**, 모델 재타이핑 금지. → `structured-blocks.md` 신규 절 말미 및 diff-visual SKILL.md 양쪽에 "그라운딩 법칙은 채널 불문 불변 — CSS/하이라이트 메커니즘만 바뀐다"로 명문화. (스크립트 수정 없음.)
- [x] 하이라이트: **highlight.js CDN `<link>`/`<script>` 태그도 emit 금지** (Mermaid와 대칭 — structured-blocks.md의 `<head>` 삽입 지시는 로컬 채널 한정). no-CDN fallback 경로만, 단색 monospace 강등 허용, 깨지지 않음. fallback CSS의 `var(--paper-2)/--ink/--mono` 등 디자인시스템 변수는 artifact 페이지에 없음 — 구체 색값으로 치환. → `structured-blocks.md`에 "Syntax highlighting" 절 스코프를 로컬 채널로 명시하고 신규 "Artifact channel: no CDN, forced degrade" 절 추가(항상 no-CDN 경로, 페이지 자체 색값으로 대체한 fallback CSS 예시 포함).
- [x] 다이어그램: Mermaid 런타임 금지 — inline SVG/HTML+CSS (내장 skill 가이드대로). → artifact 절에 명문화, doc-visual과 동일 원칙 재사용.
- [x] 대형 diff 1회로 16 MiB 렌더 한도 체감 확인, 결과 기록. → 실측 완료(2026-07-06): 커밋 `29d2849`(1483줄 변경 단일 파일)를 `extract-hunks.js`로 추출 시 65,873바이트(~44바이트/줄). `structured-blocks.md` 예산(3–8 파일 × ≤150줄)을 지키면 split-diff 총량은 수만~십수만 바이트대 — 16 MiB와는 수백 배 이상 차이. 결론: 캡은 예산을 지키면 실질적으로 도달 불가능한 안전판이고, 예산 이탈(전체 diff 그대로 붙이기 등)이 유일한 위험 경로 — SKILL.md "Size headroom" 한 줄로 반영(별도 완화 로직 없음).

`artifact-gate.js`의 `--content-only` 플래그는 이미 범용(doc-visual 전용 아님) — diff-visual도 그대로 재사용 가능, 스크립트 수정 불필요. `--format md`와의 조합은 S3 스코프 밖(md+artifact는 issue 007 S2에서 doc-visual로만 검증됨) — diff-visual은 S1처럼 html 채널만 우선 구현하고 md는 기존처럼 미지원으로 문서화(Format Detection 절에 명시).

### 구현 완료 (2026-07-06)

`diff-visual` SKILL.md: frontmatter(`allowed-tools`에 `Artifact`, `argument-hint`), Format Detection
`--artifact` 행 + 자연어 동치 + md 조합 스코프아웃, 신규 `#### HTML mode — Artifact channel` 절
(스킬 로드 MUST · fragment · Mermaid/하이라이트 CDN 이중 금지 · 테마 대응 · 세션 내 경로 재사용 ·
content-only 게이트 · visual self-audit 스킵 · 16 MiB 여유 결론 한 줄), 신규 "Publish (--artifact)"
절(Artifact 도구 호출·사이드카·폴백, doc-visual S1과 동일 패턴). `structured-blocks.md`:
"Syntax highlighting" 절 스코프를 로컬 채널로 한정하는 문구 추가, 신규 "Artifact channel: no CDN,
forced degrade" 절(no-CDN 강제·디자인토큰 대체 fallback CSS 예시·그라운딩 불변 재확인). 스크립트
변경 없음(`extract-hunks.js`·`artifact-gate.js` 모두 기존 그대로 재사용 확인). `claude plugin
validate .` 통과(버전 미지정 경고 11건은 기존과 동일, 신규 경고 없음).

**미검증**: 이번 세션도 vision-powers 플러그인이 로드돼 있지 않아 실제 `diff-visual ... --artifact`
퍼블리시 end-to-end(특히 split-diff의 no-CDN 강등이 실제 브라우저에서 읽히는지, inline SVG 다이어그램
전환)는 라이브로 실행해보지 않음. `claude --plugin-dir ./plugins/vision-powers`로 별도 세션에서
대형 diff 1건 실퍼블리시 검증 권장 — S1의 "로컬 vs artifact 비교"에 준하는 절차.

### Blocked by

- S1.

---

## S4 — plugin-visual + context-health-visual 확장

### What to build

남은 두 리포트 스킬에 S1 패턴을 복제한다. 에이전트 분석 결과(보안 표·health 그리드)가 내장 디자인에서
어떻게 나오는지가 디자인 층 최종 판정의 핵심 표본.

### Acceptance criteria

- [x] `plugin-visual` artifact 분기 (4-에이전트 분석 포함 페이지). S1/S3 패턴 복제(스킬 로드 MUST →
  fragment → gate `--content-only` → 퍼블리시 → 사이드카). 고유 리스크(보안 표가 프래그먼트에서
  깨지는지)는 실제 생성으로 확인 — 아래 "구현 완료" 참고.
- [x] `context-health-visual` artifact 분기.
- [x] 각각 로컬 대비 1회 비교 기록 (도메인 레이아웃 표본 — ADR 0007 Plan B 판정 재료).

### 구현 완료 (2026-07-06)

`plugin-visual` SKILL.md: frontmatter(`allowed-tools`에 `Artifact`, `argument-hint`), Output Format
Detection에 `--artifact` 행 + 자연어 동치(analyze+HTML 전용, security/overview·`--format md` 조합은
스코프 밖 — diff-visual이 세운 html-only 선례 재사용), 신규 "Phase 5R — Artifact channel" 절(스킬
로드 MUST·fragment·CDN 이중 금지·테마 대응·밀도 리스크 메모·세션 내 경로 재사용·content-only
게이트·visual self-audit 스킵·퍼블리시+사이드카+폴백). `context-health-visual` SKILL.md: 동일
패턴(frontmatter, Input Parsing 행, 신규 "HTML mode — Artifact channel" 절, 프라이버시 가드 "all
channels"로 재확인). 스크립트 변경 없음(`artifact-gate.js --content-only`·`write-artifact-sidecar.js`
둘 다 기존 그대로 재사용). `claude plugin validate .` 통과(기존 11건 버전 경고만, 신규 경고 없음).

**검증 (로컬 vs artifact 비교, 각 스킬 1회)**: 이번 세션의 vision-powers 플러그인 캐시
(`~/.claude/plugins/cache/.../vision-powers/4.5.1`)가 2026-07-01자로 이번 슬라이스보다 오래돼
`Skill` 도구로 직접 부르면 구 로직이 실행됨 — 대신 서브에이전트 두 개가 리포지토리의 실제 SKILL.md
소스를 그대로 따라가며 로컬 HTML과 artifact 프래그먼트를 각각 생성·게이트하도록 했다(내장
`artifact-design` 스킬 로드 포함, 4-에이전트 분석은 실제 `vision-powers:feature-architect`/
`security-auditor` 서브에이전트로 수행). 이후 두 artifact 프래그먼트는 `Artifact` 툴로 실제 퍼블리시,
사이드카 기록까지 완료:

- **plugin-visual** (대상: `plugins/worktree-plus`, 실제 7파일 소형 플러그인 — 훅 3개·스킬 1개):
  로컬 `2026-07-06-worktree-plus-report.html` 풀 게이트+visual self-audit 통과. artifact
  `2026-07-06-worktree-plus-report.artifact.html` content-only 게이트 통과 → 퍼블리시
  https://claude.ai/code/artifact/e0d6a95a-d868-4ee7-8d1f-48cedef9c9da (사이드카 확인).
  **고유 리스크 판정**: 권한 매트릭스(10행×4열, 최장 셀 ~81자)가 로컬에서는 한눈에 보이지만
  프래그먼트 폭에서는 `overflow-x:auto`+`min-width:640px`로 감싸 가로 스크롤이 필요해짐 — "훑어보기
  →스크롤"로 실제 체감이 바뀌는 지점(디자인 결함이 아니라 트레이드오프로 처리). 아키텍처 다이어그램
  (8노드/8엣지)은 Mermaid 대신 세로형 HTML/CSS flow로 재설계돼 저위험으로 판정.
- **context-health-visual**: 로컬 `2026-07-05-context-health-visual.html` 풀 게이트+visual
  self-audit 통과. artifact `2026-07-05-context-health-visual.artifact.html` content-only 게이트
  통과, 프라이버시 가드(raw CLAUDE.md/MEMORY.md 본문 미노출) 확인 → 퍼블리시
  https://claude.ai/code/artifact/63bc8fc0-a7e7-4303-973b-f72be4b75d4b (사이드카 확인).
  **고유 리스크 판정**: §5 Trigger Collisions의 충돌 쌍 문자열(최장 79자)이 좁은 프래그먼트 폭에서
  잘릴 위험이 있어 `overflow-wrap: anywhere`를 artifact 전용 CSS에 추가(로컬 페이지엔 불필요).
  KPI 카드 그리드(13장, `auto-fit minmax(160px,1fr)`)는 고정 열 수가 아니라서 2-per-row로 자연스럽게
  줄어들며 orphan 없이 랩됨 — 저위험.

**브라우저 검증 (2026-07-06, 이어지는 세션)**: 위 두 URL을 `claude-in-chrome`으로 실제 렌더링 확인
완료 (이전 세션 막힘 사유였던 로그인 세션 문제는 이번엔 재현 안 됨). 두 아티팩트 모두 콘솔 에러 0건,
정상 렌더링.

- **plugin-visual (worktree-plus)**: Security Audit → Permission matrix 테이블을 브라우저 창
  ~420px 폭으로 축소해 확인 — "↔ scroll for full table width" 안내 문구대로 실제 가로 스크롤이
  작동, COMPONENT 열이 스크롤 아웃되고 TOOLS/COMMANDS·HOOK TYPE·RISK 열이 보임. 레이아웃 깨짐 없음
  — 사전 판정("훑어보기→스크롤" 트레이드오프)과 일치.
- **context-health-visual**: §5 Trigger Collisions를 같은 좁은 폭에서 확인 — 최장 충돌 쌍 문자열
  (예: `skill-creator-pro/skill-creator-pro ↔ skill-creator/skill-creator`, `codex-advisor/codex-adversarial ↔ codex/adversarial-review`)이
  가로 오버플로우나 잘림 없이 하이픈/공백 경계에서 자연스럽게 줄바꿈됨 — `overflow-wrap: anywhere`
  적용 확인. 상단 배지 그룹(3 healthy/2 attention/1 critical/6 graded)·MCP Overview 2-카드 그리드도
  좁은 폭에서 정상 랩됨.

두 URL 모두 실제 브라우저 렌더링으로 구조적 판정을 확인 — S4 완료.

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

- [x] 퍼블리시 성공 시 `<report>.artifact.json` 사이드카 기록 (URL·title·favicon·마지막 퍼블리시 시각). S1이 쓰기 시작한 최소 형태를 여기서 규약으로 확정.
- [x] `list-reports.js`: 사이드카 발견 시 리포트 항목에 `artifact_url` 포함. list/open 출력에 URL 표시.
- [x] report-manager refine: 대상 리포트에 사이드카 있으면 재퍼블리시 때 그 URL을 `url` 인자로 전달 — 같은 URL에 버전 스택. favicon·title 사이드카 값 재사용(고정).
- [x] 사이드카 없거나 URL 죽음(퍼블리시 에러) 시: 새 URL 발행 + "새 링크 발행됨, 기존 공유 링크는 구버전 유지" 한 줄.
- [x] delete 시 사이드카 동반 삭제.

### 구현 완료 (2026-07-06)

- **AC1 (사이드카 규약)**: 코드 변경 없음 — S1의 `write-artifact-sidecar.js`가 이미 `{url, title, favicon, published_at}` 스키마로 쓰고 있었고, 그대로 규약으로 확정. `published_at`은 같은 파일에 재호출 시 덮어써지므로 재퍼블리시 시각 갱신도 공짜로 따라옴.
- **AC2**: `list-reports.js`에 사이드카 탐지 로직 추가(`<fullPath>.artifact.json` 읽기 시도, `url` 필드가 있으면 `entry.artifact_url`에 채움 — 사이드카 없음/파싱 실패는 조용히 무시). 신규 `list-reports.test.js`(사이드카 있음/없음/깨진 JSON 3케이스) 추가, 전체 스위트 54→57건 통과. `report-manager` SKILL.md의 `list`(Artifact 열 조건부 추가) · `open`(Shared link 한 줄) 절 갱신.
- **AC3·AC4**: `report-manager` frontmatter `allowed-tools`에 `Artifact` 추가. `refine` 절 전면 개편 — 1단계에서 사이드카 유무로 "로컬 리포트 vs Artifact-channel 프래그먼트"를 먼저 판정, 6단계(gate)는 프래그먼트면 `--content-only`, 7단계(visual self-audit)는 프래그먼트면 스킵(로컬 렌더가 claude.ai가 씌우는 `<head>`/테마 래퍼를 반영 못 하므로), 신규 8단계로 "사이드카 있으면 `url` 인자로 같은 링크에 재퍼블리시 + 사이드카 재기록" · "사이드카 없지만 `.artifact.html`이면 최초 퍼블리시" · "재퍼블리시 실패(죽은 링크)면 새 URL + 한 줄 고지"의 3분기를 명문화. 9단계(구 8단계)는 채널별 출력(file:// vs claude.ai URL)으로 갱신.
- **AC5**: `delete` 4단계에 사이드카 동반 삭제 문구 추가(고아 사이드카가 남으면 다음 `list`가 이미 없는 리포트의 공유 링크를 주장하게 되는 문제 방지).
- **범위 밖으로 남긴 것**: doc-visual/diff-visual/plugin-visual/context-health-visual 4개 생성 스킬 자체의 퍼블리시 절은 여전히 `url` 인자를 넘기지 않는다(세션 내 재퍼블리시는 `file_path` 동일 재사용으로 이미 동작, 세션 간은 애초에 그 스킬들의 스코프가 아님). 이슈 문서가 S4.5를 "report-manager refine이 세션 넘어 같은 URL 유지"로 명시적으로 한정하고 있어 4개 스킬의 재실행 시나리오는 건드리지 않음 — 필요해지면 별도 슬라이스.
- **검증**: `claude plugin validate .` 통과(기존 11건 버전 경고만, 신규 경고 없음). `node --test scripts/*.test.js` 57건 전부 통과.

**라이브 검증 (2026-07-06, 이어지는 세션)**: report-manager `refine`의 사이드카 URL 재사용 재퍼블리시를
실제로 실행해 확인했다.

- **시도한 경로와 막힌 것**: 처음엔 핸드오프가 제안한 대로 `claude --plugin-dir ./plugins/vision-powers -p
  "..."`로 별도 CLI 서브프로세스를 띄우려 했으나, 자동 권한 분류기가 두 번 모두 막았다("Create Unsafe
  Agents" — `--permission-mode acceptEdits` + `Bash(rm *)` 사전허용 조합, 그리고 `--add-dir` +
  `Edit`/`Bash(node *)` 사전허용 조합 각각을 "감독 없는 자율 에이전트"로 판정). 사용자의 "라이브 검증
  먼저"라는 승인이 이 정도로 넓은 사전허용까지 포함한다고 보기 어려워 우회하지 않고, 대신 일반
  서브에이전트(Agent 툴)로 전환 — 서브에이전트의 툴 호출은 이 세션의 정상 권한 체계를 그대로 타므로
  사전허용 우회 문제가 없다.
- **실행 방식**: 서브에이전트에게 캐시된(구버전 4.5.1, S4.5 로직 없음) 설치본 대신 **리포지토리의 실제
  `report-manager` SKILL.md 소스**를 직접 읽고 그 `refine` 절 지시를 문자 그대로 따르도록 지시. 대상은
  S4의 검증에서 이미 실퍼블리시된 `2026-07-06-worktree-plus-report.artifact.html` + 사이드카(URL
  `https://claude.ai/code/artifact/e0d6a95a-d868-4ee7-8d1f-48cedef9c9da`).
- **결과 — PASS**: footer에 한 문장 추가 → `artifact-gate.js --content-only` 통과 → (fragment이므로
  visual self-audit 스킵) → `Artifact` 툴 호출 시 `url` 인자에 사이드카의 URL을 그대로 전달(누락하지
  않음) → 퍼블리시 결과 URL이 사이드카 URL과 **동일** → `write-artifact-sidecar.js`로 사이드카 재작성,
  `published_at` 갱신·`url`/`title`/`favicon`은 그대로. 디스크에서 직접 확인(`cat` 사이드카, `grep`으로
  추가 문장 확인)까지 완료 — 서브에이전트 보고와 실제 파일 상태가 일치.
- **브라우저 재렌더링 확인 — 완료, PASS**: 위 URL을 `claude-in-chrome`으로 재방문. 첫 로드 시 콘텐츠
  영역이 검은 화면으로 나왔으나(콘솔 에러 0건, 네트워크상 `GET .../api/frame/versions/...`는 200으로
  정상 응답 — 지연 페인트로 추정), 페이지 내 드롭다운을 한 번 클릭하는 상호작용을 거치자 정상
  렌더링됨. 클릭한 "Version history" 드롭다운 자체가 결정적 증거 제공: **Version 2(8분 전, by you,
  Current)** · **Version 1(56분 전, by you)** — 같은 아티팩트에 새 버전이 쌓였음을 claude.ai UI가
  직접 보여줌. "Recommendations" 섹션으로 이동해 footer를 확인하니 테스트 문장("Live refine
  verification note — issue 007 S4.5 test edit.")이 실제로 노출됨. 사이드카 URL 재사용 → 같은 페이지
  새 버전, 이라는 S4.5의 핵심 주장을 파일·툴 호출·실제 브라우저 렌더링 세 레벨 모두에서 확정 검증.
- **부가 발견**: 이 환경에 설치된 vision-powers 플러그인 캐시(4.5.1)가 리포 소스보다 오래돼, `Skill`
  툴로 `report-manager`를 직접 부르면 `Artifact`가 `allowed-tools`에 없는 구 로직이 실행된다 — 리포
  소스를 직접 따르는 방식(서브에이전트/별도 세션)으로만 우회 가능. S5나 이후 세션에서 재현될 수 있는
  환경 특성이라 참고용으로 남겨둔다.

### Blocked by

- S1 (퍼블리시 경로·사이드카 최소 쓰기).

---

## S5 — config.json 취향 + 문서·버전

### What to build

고정 취향을 설정으로, 문서를 최종 표면에 맞춘다. 데모: "config에 `artifact: true` 박으면 플래그 없이 늘 퍼블리시."

### Acceptance criteria

- [x] `scripts/config.js`에 `default_format` / `artifact` 키 (기존 키가 snake_case — `default_language`·`auto_open`·`reports_dir` — 이므로 통일; 언어는 기존 `default_language` 재사용, 신규 `lang` 키 금지). 스킬 시작 시 참조, 플래그·자연어 = 일회성 override. config.js 헤더 "Supported keys" 주석 갱신.
- [x] README: `--artifact` 스위치 + 2×2 표 + 위임 고지 한 줄 + 공유 범위 한 줄 ("공유는 Team/Enterprise 조직 내부 한정 — Pro/Max는 본인 열람용 URL, 외부 공유는 로컬 html 파일로"). 구현-디테일 섹션 금지 (README 스타일 규칙).
- [x] `plugin.json` + `marketplace.json` description 갱신 (채널 추가 반영).
- [x] `marketplace.json` 버전 **minor 범프** (기능 추가).

### 구현 완료 (2026-07-06)

- **AC1**: `config.js` 헤더 "Supported keys"에 `default_format`(html/md)·`artifact`(true/false) 두 키 추가, 기존 정렬 스타일 유지. `config.js` 자체는 범용 get/set/path CLI라 로직 변경 없음 — 신규 키도 기존 코드로 그대로 읽고 쓴다. 4개 생성 스킬(`doc-visual`·`diff-visual`·`plugin-visual`·`context-health-visual`) 각각의 Format/Input Parsing 절에 "Config precedence" 문단 추가: 스킬 시작 시 `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.js get` 1회 호출로 저장된 설정을 읽고, `default_format`/`artifact`가 있으면 하드코딩된 기본값(`html`/off)을 대체하되, 이번 요청에서 사용자가 실제로 말한 것(리터럴 플래그 또는 자연어 동치)은 항상 config보다 우선한다고 명문화. plugin-visual은 이 규칙이 기존에 이미 스코프된 `analyze`+HTML 조합에만 적용됨을 재확인(config로도 security/overview 모드에 퍼블리시를 강제할 수 없음).
- **AC2**: README의 `doc-visual` 전용 "Artifact publishing" 문단을 4개 스킬 공통으로 일반화, 이슈 문서의 인터페이스 표(2×2: format × `--artifact`)를 그대로 옮겨 옴, 위임 고지 문장 유지, 공유 범위 문장 신규 추가(공식 문서 `https://code.claude.com/docs/en/artifacts`의 Availability/Share 섹션으로 재확인 — "Sharing stops at your organization... On Pro and Max plans, artifacts stay private to you"). config 기본값 설정 방법도 한 문장으로 자연어 수준에서 안내(구현 디테일 섹션 신설 없이 기존 문단에 이어 붙임).
- **AC3**: `plugin.json`·`marketplace.json` description에 아티팩트 채널 한 줄 반영(대상 4개 스킬 명시 + config.json 기본값 언급). `marketplace.json`의 `report-manager` 설명에 "surfacing stored Artifact URLs and republishing to the same link" 추가(S4.5 반영 — 이전까지 미반영 상태였음).
- **AC4**: `marketplace.json` vision-powers 버전 `4.5.1` → `4.6.0`(minor). 부수적으로 `CHANGELOG.md`에 `4.6.0` 항목 신규 추가 — 이 리포의 기존 관례(모든 버전 범프가 CHANGELOG 항목을 동반)를 따라 S1~S4.5 전체(아티팩트 채널·사이드카·게이트 content-only·config 키)를 하나의 "Added" 묶음으로 요약. AC로 명시되진 않았으나 버전 범프에 직결되는 문서 정합성이라 판단해 포함.
- **검증**: `claude plugin validate .` — 기존 11건 버전-미지정 경고만, 신규 경고 없음. `node --test scripts/*.test.js` — 57건 전부 통과(config.js 변경은 주석뿐이라 회귀 없음, 기존 스위트 그대로 재사용).

**이슈 007 전체 슬라이스(S1~S5) 완료** — 남은 미검증 항목은 "S5 자체의 라이브 트리거 확인"(config.json에 `artifact: true`를 실제로 심어두고 플래그 없이 자연어 요청만으로 퍼블리시되는지, 4개 스킬 각각에 대해)이며, 이번 세션에선 문서/설정 변경만 하고 실행하지 않았다 — S1·S4.5처럼 별도 세션에서 서브에이전트로 1회 확인하는 절차를 권장. "열린 질문"란의 "디자인 층 최종 소유권" 판정은 S5 스코프 밖으로, 사용자 판단을 위해 그대로 남겨 둠(S1·S3·S4 비교 기록은 모두 "내장 디자인이 구조적으로 버틴다" 쪽으로 수렴했다는 점만 참고로 덧붙인다).

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
