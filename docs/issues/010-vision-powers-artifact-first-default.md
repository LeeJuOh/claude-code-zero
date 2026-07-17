# vision-powers: artifact-first 기본화 — 다이어그램 선택은 채널무관, Mermaid는 강등된 렌더링 (ADR 0009)

> 상태: **S0~S6 전부 구현 완료·커밋(`b9d5ddf`, 4.7.0) · 육안 렌더검사만 잔여** (A안 빅뱅 확정) · 생성: 2026-07-08 · 결정: 2026-07-10 · 진척: 2026-07-17
> 용어집: `docs/context/vision-powers.md` (갱신 용어: **Channel**, **Diagram-type selection vs Rendering technique**, **Relational diagram vs Analytical chart**, **Readability vs Visibility**; **Artifact channel** opt-in→기본으로 재정의)
> 결정 근거: `docs/adr/0009-artifact-first-default-diagram-selection-channel-agnostic.md` (`0007` amend)
> 출처: grill-with-docs + domain-modeling 세션 (2026-07-08) — 로컬 vs 아티팩트 도그푸딩 체크포인트

## 핸드오프 — 다음 세션 이어서 (2026-07-17, 커밋 완료)

**Goal:** 이슈 010 전체 S0~S6 구현 (artifact-first 빅뱅). 슬라이스 단위, "한 슬라이스 끝나면 멈추고 보고".

**First Action:** **S0~S6 전부 구현 완료·커밋 완료.** 남은 건 하나뿐:
- **육안 렌더검사(S1~S6 전부 미실행)** — 실제 스킬 구동해서 채널별 1회 로컬-vs-아티팩트 비교(특히
  context-health 10-카드 밀도). 게이트 아님, 착지 후 검증.

**커밋 상태 (2026-07-17 확인):** `b9d5ddf` "feat(vision-powers): artifact-first default for HTML
reports (ADR 0009)" — 14파일 587 insertions / 167 deletions, develop 브랜치, 워킹트리 클린. 버전
4.7.0으로 marketplace.json 범프 포함. 설치 캐시도 4.7.0으로 리포 소스와 동일(`.in_use` 마커만 차이)
— 007 세션들이 반복해 밟았던 "스테일 캐시가 구 로직 실행" 함정은 이 이슈엔 해당 없음.

**Current Progress (아래 슬라이스별 기록은 구현 당시[2026-07-11] 작성 — 전부 `b9d5ddf`에 포함됨):**
- **S0 완료:** 신규 `plugins/vision-powers/references/design-system/channel-decision.md`
  (SSOT). `scripts/config.js` 헤더 주석만 flip(코드 무변경). 4개 스킬(doc/diff/
  context-health/plugin-visual) arg-hint+Format표+Config-precedence 산문 flip, 전부 SSOT 인용. 이슈
  S0 AC 7개 체크됨.
- **S1 완료:** doc-visual body end-to-end 배선. HTML channel routing, 두 섹션 헤더 재라벨,
  Validation(content-only=기본/full=local), visual self-audit=local만, Publish 재작성, non-capable
  Fallback=풀 재생성, Error-handling 표, README 퀵스타트 `--local` 예시. 이슈 S1 AC 7개 체크됨.
  **육안 렌더검사는 미실행**(실제 doc-visual 구동 필요 — SKILL.md 로직 정합만 확인).
- **S2 완료:** diff-visual body end-to-end 배선(S1 패턴 복제). routing 프리앰블, 두 섹션
  헤더 재라벨, Publish 헤더 rename + 정본 고지(dashboard), Fallback=풀 재생성, README diff 퀵스타트
  3줄. cross-ref 2건 교정. 이슈 S2 AC 3개 체크. **육안 렌더검사 미실행**(SKILL.md 로직 정합만).
- **S3 완료:** context-health-visual body 배선. routing 프리앰블(+ `--local` 직교성 명시),
  두 섹션 헤더 재라벨, Publish 정본 고지(dashboard + env-scan 게시 고지 필수), Fallback=풀 재생성,
  README diagnose 퀵스타트 2줄. 이슈 S3 AC 3개 체크. **육안 렌더검사 미실행.**
- **S4 완료:** plugin-visual body 배선 = S1~S3 패턴 복제. routing 프리앰블(+ path-or-url
  입력이 채널 결정과 직교함 명시), 로컬/Artifact 두 섹션 헤더 재라벨 + 스테일 cross-ref 교정, Publish
  정본 고지(명사=wiki), Fallback=풀 로컬 wiki 재생성(fragment `open` 금지), README analyze 퀵스타트
  artifact-first + `--local` 줄. 이슈 S4 AC 2개 체크. **육안 렌더검사 미실행**(SKILL.md 로직 정합만).
- **S5 완료:** fact-check republish 배선 = report-manager 8단계 패턴. `allowed-tools`+`Artifact`,
  Artifact-channel 사이드카 감지, Phase 4 게이트 fragment=`--content-only` 분기, Phase 4.5 Republish 신설
  (edge case 2건 포함), Phase 5·README 반영. 이슈 S5 AC 5개 체크. **실제 republish E2E 미실행**(SKILL.md
  로직 정합만).
- **S6 완료:** 레퍼런스 리프레이밍 + 출시. diagram-type-selection·mermaid-patterns 스코프 주석
  (Mermaid=Local/md 렌더링 기법), README publishing 블록 artifact-first 3행 매트릭스 반전, plugin.json·
  marketplace.json description 반전, CHANGELOG 4.7.0(minor 근거), marketplace 버전 4.6.2→4.7.0. 이슈 S6
  AC 6개 체크. `plugin validate` 신규 경고 없음.

**정본 publish 고지 (S2~S4가 복제, 명사만 교체):**
`Published to claude.ai — design is delegated to Claude's built-in Artifact renderer, so it differs
from the local report's look; run --local for the local design-system + Mermaid version.`
구조=published·delegated·`--local` escape가 canonical. **스킬별 명사 매핑(확정):** doc-visual=`report`,
diff-visual=`dashboard`, context-health-visual=`dashboard`(파일 어휘가 일관되게 dashboard), 
plugin-visual=`wiki`(S4). ← 각 스킬 파일의 로컬출력 호칭을 따름.

**Decisions / 제약 (재논쟁 방지):**
- ⚠️ **README 공유 "Artifact publishing" 2×2 블록(`README.md` ~51-58줄)은 S6 소유.** S2~S4서 건드리지
  말 것 — 지금 그 표는 아직 "`--artifact` off(default)=local"로 스테일이나 S6 전역 반전에서 처리.
- ⚠️ **S2~S4는 html channel flip만.** doc-visual(S1)만 `--format md --artifact` 게시 지원, 나머지 셋은
  의도적 미지원 — md+artifact 게시 추가로 확대 해석 금지.
- **non-capable Fallback = 재생성**(fragment `open` 금지 = ADR 0009 §3). 이게 핵심 배선.
- **S5 fact-check = republish**(생성 아님): 대상이 게시된 아티팩트(사이드카 존재)면 같은 URL republish
  + post-edit 게이트 `--content-only` 전환. report-manager 8단계 패턴.
- 버전 범프는 **S6에서만** (minor 4.6.2→4.7.0).

**Next Steps:** S0~S6 전부 구현·커밋 완료 — 코드 작업 없음. 남은 건 **육안 렌더검사**(실제 스킬 구동,
채널별 1회 로컬-vs-아티팩트 비교, 특히 context-health 10-카드 밀도)뿐. 게이트가 아니라 착지 후 검증이라
이슈 종료를 막지는 않으나, ADR 0009의 "아티팩트 렌더가 로컬을 이긴다"는 근거가 doc-visual 1건 표본에
기대고 있으므로 나머지 3개 스킬에서 표본을 채우는 값이 있다.

---

## 배경

같은 소스를 두 채널로 렌더해 비교한 결과, built-in artifact-design가 로컬 design-system 룩을
디자인·가독성·가시성에서 이겼다(내용은 동률). ADR 0007이 "위임 디자인이 실망하면 Plan B"로 걸어둔
가정이 뒤집힌 것. 핵심 교훈: **Mermaid는 다이어그램 레이어가 아니라 하나의 렌더링 기법**이고, 진짜
자산은 "어떤 경우 어떤 다이어그램"이라는 **선택 지능**이다. ADR 0009는 이를 근거로 (a) capable
계정의 html에서 Artifact를 **기본 채널**로 승격, (b) Mermaid를 non-capable html·md **폴백**으로 강등
한다. 대상 스킬: `doc-visual`·`diff-visual`·`context-health-visual`·`plugin-visual` 기본 flip
(+ `fact-check`는 생성기가 아닌 제자리 검증 편집기라 "채널 신설"이 아니라 검증 후 아티팩트 대상
republish — S5 참조).

각 슬라이스는 **행동 + 문서 + 검증**을 관통하는 tracer-bullet 세로 절단이며, 독립적으로 데모·검증
가능하다. S2~S4는 S1 이후 병렬 가능.

## Decision (2026-07-10) — 전체 빅뱅 (A안)

grill-with-docs 세션 결정. **당일 초안(단계적 S0+S1)을 재검토해 전체 빅뱅으로 확정.** ADR 0009대로
S0~S6 전부 이번 라운드에 구현한다.

- **왜 단계적을 버렸나:** 단계적의 근거는 "스킬별 아티팩트 렌더 품질이 미검증(증거=doc-visual 1건)"
  이었다. 그런데 `--local`(force-local) 오버라이드가 있어 **어느 스킬에서 아티팩트 기본이 별로여도
  한 플래그로 로컬 복귀 + 언제든 비교 가능** — "나쁜 렌더"가 함정이 아니라 1회 타이핑으로 해결되는
  가역 상태다. 렌더 리스크가 값싸게 회수되므로 단계적으로 미룰 이유가 약하다. 도그푸딩도 아티팩트
  렌더 우위를 보였다.
- **범위 = S0~S6 전부.** S2~S4(diff·context-health·plugin flip)는 S1 패턴의 기계적 복제 — 단
  **html 채널 기본 flip에 한정**. doc-visual(S1)만 `--format md --artifact` 게시를 지원하고 나머지
  셋은 의도적으로 미지원이므로, "S1 복제"를 md+artifact 게시 추가로 확대 해석하지 말 것.
- **S5(fact-check)는 성격 다름 — 검수로 재정의됨.** fact-check는 리포트 생성기가 아니라 **제자리
  검증 편집기**라 "채널 신설"이 아니라 **"검증 후 대상이 게시된 아티팩트면 같은 URL로 republish"**가
  맞는 모델(S5 참조). 원래 "제일 무거운 신설"이라던 판단은 이 재정의로 뒤집힘 — 신규 렌더 경로가
  아니라 republish 배선이다.
- **전역 config 뒤집기 채택(S0 원안).** `config.js`가 `artifact` 키 부재를 **artifact-first로 해석**
  하도록 기본해석을 뒤집고(헤더 주석에 문서화), 4개 flip 스킬의 Config-precedence 산문을 여기에
  맞춘다. (단계적 초안의 "doc-visual 산문만" 축소는 폐기 — 전체를 뒤집으니 전역이 더 단순.)
- **완화책(조용한-게시 리스크) 전 스킬 공통:** (1) capable 계정 + html에서만 뒤집힘, (2) non-capable
  (API키/CI/`disableArtifact`)은 자동 로컬 degrade, (3) publish 시점에 "claude.ai에 게시함 — 로컬은
  `--local`" 1줄 고지, (4) `force-local`로 되돌림. 특히 **context-health는 환경 스캔이라** 게시 고지를
  빠뜨리지 말 것(리포트는 counts-only privacy guard 유지).
- **force-local 플래그 이름 = `--local` 확정** (`--no-artifact` 기각 — 더 김). 자연어 동치 포함.
- **구현 중 스킬별 렌더 1회 육안 확인**(특히 context-health 10-카드 밀도 — 해당 SKILL.md가 경고).
  게이트가 아니라 빌드 단계의 눈검사; 깨지면 그 자리서 고치고 진행.

---

## S0 — 프리팩터: 채널결정 계약 + force-local 오버라이드 + config 기본값

### What to build

스킬들이 각자 재유도하지 않도록 채널 선택 규칙을 **한 곳에 못박는다**. 결정표는
`(아티팩트 가능? × Format) → Channel + 폴백`:

| Format | capable | 결과 |
|---|---|---|
| html | yes | Artifact (기본 publish) |
| html | no | Local (design-system + Mermaid) |
| md | any | Local (design-system + Mermaid fence) |

capable 계정에서 로컬을 강제하는 **force-local 오버라이드 플래그 `--local`**을 도입한다(분석형 차트·
줌/팬 필요 시). 이번 요청의 명시적 신호(플래그·자연어)는 항상 config보다 우선. 결정표·플래그
의미론은 공유 레퍼런스 문구로 두어 S1~S5가 인용한다.

**기본값 뒤집기의 실제 위치(중요 — 검수 정정).** `config.js`는 순수 get/set/path 키-값 저장소라
**뒤집을 기본로직이 없다**(`readConfig()`는 키 부재 시 `{}` 반환). "artifact 키 부재 = off" 해석은
각 스킬의 Format 표(`--artifact | switch | off`)와 Config-precedence 산문에 있다. 따라서 전역 flip =
**4개 flip 스킬의 표/산문에서 "부재 = artifact-first"로 해석을 뒤집는 것** + `config.js`는 헤더 주석만
갱신(코드 변경 없음). fact-check는 config를 읽지 않으므로 이 flip 대상 아님(S5 참조).

**persistent force-local.** flip 후 `--local`은 1회성이다. 로컬을 상시 기본으로 원하는 유저를 위해
`config` 키 `artifact: false`를 **persistent force-local**로 정의한다(플래그 `--local`의 config 짝).
4개 스킬이 이 값을 존중해야 한다.

**`--artifact` 플래그 운명(결정).** 기본이 아티팩트가 되면 `--artifact`는 capable html에서 잉여다.
**제거하지 않고 명시적 alias/no-op로 유지**(제거 시 기존 유저 근육기억·자연어 트리거가 깨짐). 규칙:
capable html에서 `--artifact`는 no-op(이미 기본), non-capable에서는 여전히 publish를 **시도**,
`--artifact`와 `--local`을 동시 지정하면 **`--local` 우선**. 각 스킬 arg-hint의
`[--artifact (native design + publish)]` 문구는 기본화에 맞게 재서술.

**capability 판별 기전(중요 — 검수 정정).** 코드에 "capable이냐"를 사전 판별하는 프리미티브가 없다
(publish를 시도해봐야 앎). 그러므로 라우팅은 **낙관적 시도 후 실패 시 재생성**: 기본(capable 가정)에서
아티팩트 fragment를 author→publish 시도→**실패/도구부재면 non-capable로 간주하고 풀 design-system +
Mermaid 로컬 리포트를 재생성**(fragment를 그냥 open하지 않는다 — 그건 Mermaid 없는 페이지라 ADR 0009
§3의 "non-capable엔 design-system+Mermaid 로컬" 약속을 위반). 비용 = non-capable 세션서 1회 재생성.

### Acceptance criteria

- [x] force-local 플래그 이름 = **`--local` 확정** (자연어 동치 포함; `--no-artifact` 기각)
- [x] 전역 기본해석 뒤집기 = **4개 flip 스킬의 Format 표/Config-precedence 산문에서 "artifact 키 부재
      = artifact-first"로 서술** + `config.js`는 **헤더 주석만** 갱신(코드 무변경 — config.js엔 뒤집을
      기본로직 없음)
- [x] `config artifact: false` = **persistent force-local**로 정의, 4개 스킬이 존중
- [x] `--artifact` = **alias/no-op로 유지**(제거 아님): capable html no-op, non-capable publish 시도,
      `--local`과 동시 지정 시 `--local` 우선. arg-hint 문구 재서술
- [x] 명시적 요청 > config > 기본값 우선순위가 한 곳에 서술됨
- [x] **capability 판별 = 낙관적 시도 후 실패 시 재생성** 기전 계약에 명시: publish 실패/도구부재 →
      풀 design-system+Mermaid 로컬 리포트 **재생성**(fragment open 금지 — ADR 0009 §3 준수)
- [x] 결정표가 `docs/adr/0009`와 일치 (회귀 시 ADR이 SSOT)

> **S0 구현 완료 (2026-07-10).** SSOT 신설 `references/design-system/channel-decision.md`(결정표·
> 플래그 의미론·persistent force-local·optimistic-try-then-regenerate·precedence). `config.js` 헤더
> 주석만 갱신(코드 무변경). 4개 스킬 arg-hint+Format 표+Config-precedence 산문 flip, 전부 SSOT 인용.
> `--local` 도입, `--artifact` 는 no-op alias 유지. `plugin validate` 신규 경고 없음.

### Blocked by

None — can start immediately.

---

## S1 — doc-visual: artifact-first end-to-end (레퍼런스 구현)

### What to build

S0 계약을 doc-visual에 실제로 태운다. capable 계정 + html → **기본 Artifact publish**(플래그 없이),
force-local → 로컬 design-system + Mermaid, non-capable → 자동 degrade, md → 불변(Local). arg-hint·
publish 고지 문구·README 해당 행·SKILL 산문을 새 기본값에 맞게 갱신하고, 기존 gate·검증이 통과함을
확인한다. 나머지 3개 채널 스킬이 복제할 **검증된 패턴**이 된다.

### Acceptance criteria

- [x] capable html에서 플래그 없이 실행 → Artifact로 publish (HTML channel routing = default Artifact)
- [x] force-local 플래그 → 로컬 파일 + Mermaid (local design-system channel 섹션, `--local`)
- [x] non-capable 세션(publish 실패/도구부재) → **풀 design-system+Mermaid 로컬 리포트 재생성**
      (Mermaid 없는 fragment를 open하지 않음) + 1줄 사유 고지 (Fallback 블록 재작성)
- [x] md 출력 경로는 동작 불변 (md 섹션 미변경)
- [x] arg-hint·publish 고지·README 행이 "기본 아티팩트"를 정확히 반영
- [x] **publish 고지 문구 통일(1줄):** 정본 = "Published to claude.ai — design is delegated to
      Claude's built-in Artifact renderer, so it differs from the local report's look; run --local for
      the local design-system + Mermaid version." (publish 고지 + design 위임 겸함; 구조=published·
      delegated·`--local` escape가 canonical, S2~S4 명사만 교체)
- [x] 콘텐츠 gate 통과, 회귀 없음 (content-only=기본, full gate=local channel; `plugin validate` 통과)

### Blocked by

- S0

---

## S2 — diff-visual: artifact-first 패턴 적용

### What to build

S1에서 검증된 패턴을 diff-visual에 복제. 동작·문서·검증 항목 동일, 입력 슬라이스(diff)만 다름.

### Acceptance criteria

- [x] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작 (SKILL.md
      로직 배선 완료; 실제 렌더 육안검사는 미실행 — S1과 동일 caveat)
- [x] arg-hint·고지·README 갱신 (arg-hint는 S0서 flip; 정본 고지 dashboard 명사로 복제; README diff
      퀵스타트 3줄 artifact-first — S6 소유 2×2 블록 미접촉)
- [x] gate 통과, 회귀 없음 (`plugin validate` 신규 경고 없음; artifact-gate는 생성 시점 런타임 체크라
      본 슬라이스서 미구동)

### Blocked by

- S1

> **S2 구현 완료 (2026-07-11, 커밋 b9d5ddf).** diff-visual body 배선 = S1 doc-visual 패턴 복제.
> (1) "HTML channel routing (default = Artifact)" 프리앰블 신설, (2) 로컬 섹션 헤더 "(`--local` /
> non-capable fallback)"·Artifact 섹션 헤더 "(default on a capable account)" 재라벨 + 스테일
> "default HTML mode above" cross-ref 교정, (3) Publish 헤더 "Publish (Artifact channel — default
> for HTML)"로 rename + 정본 고지(dashboard 명사) + line-321 cross-ref 교정, (4) Fallback을 **풀 로컬
> design-system+Mermaid dashboard 재생성**(fragment `open` 금지, ADR 0009 §3)으로 재작성. Format 표/
> Config-precedence/arg-hint는 S0서 이미 flip돼 미접촉. **의도적 미포함:** 별도 Error-handling 표
> 신설 안 함 — diff-visual은 Gotchas + Fallback 문단 컨벤션이라 Fallback 재작성이 error 경로를 겸함.

---

## S3 — context-health-visual: artifact-first 패턴 적용

### What to build

S1 패턴을 context-health-visual에 복제. 현행 플래그(`--use-instructions-loaded-hook` + 008이 도입한
always-ask `/context` 프롬프트)와 `--local`이 충돌 없이 공존하는지 확인. (주의: `--paste-context`는
008/커밋 5676ca4에서 제거됨 — 존재하지 않는 플래그를 찾지 말 것.)

### Acceptance criteria

- [x] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작 (SKILL.md
      로직 배선 완료; 실제 렌더 육안검사 미실행 — S1/S2 동일 caveat)
- [x] 현행 플래그(`--use-instructions-loaded-hook`·always-ask /context 프롬프트)와 `--local` 공존 검증
      (셋 다 ground-truth-data 컨트롤로 채널과 직교 — routing 프리앰블에 명시. `--paste-context`는 파일에
      없음 확인)
- [x] arg-hint·고지·README 갱신, gate 통과, 회귀 없음 (arg-hint S0서 flip; 정본 고지 dashboard 명사 +
      **env-scan 게시 고지 필수** 강조; README diagnose 퀵스타트 2줄 artifact-first; `plugin validate`
      신규 경고 없음)

### Blocked by

- S1

> **S3 구현 완료 (2026-07-11, 커밋 b9d5ddf).** context-health-visual body 배선 = S1/S2 패턴 복제.
> (1) "HTML channel routing (default = Artifact)" 프리앰블 신설 + `--local`×`/context`×
> `--use-instructions-loaded-hook` 직교성 명시, (2) 로컬/Artifact 섹션 헤더 재라벨 + 스테일 cross-ref
> 교정, (3) Publish 정본 고지(명사=**dashboard** — 이 파일은 로컬출력을 일관되게 dashboard로 호칭;
> 핸드오프의 "report"는 오기) + **환경 스캔이라 게시 고지 절대 누락 금지** 강조(counts-only privacy
> guard는 불변), (4) Fallback을 **풀 로컬 dashboard 재생성**(fragment `open` 금지)으로 재작성. Format
> 표/Config-precedence/arg-hint는 S0서 flip돼 미접촉. Error-handling 표 신설 없음(이 스킬은 Gotchas +
> Fallback 문단 컨벤션 — S2와 동일 판단).

---

## S4 — plugin-visual: artifact-first 패턴 적용

### What to build

S1 패턴을 plugin-visual에 복제. path-or-url 입력에서도 채널 결정이 동일하게 적용되는지 확인.

### Acceptance criteria

- [x] capable html 기본 Artifact / force-local / non-capable degrade / md 불변 모두 동작 (SKILL.md
      로직 배선 완료; 실제 렌더 육안검사 미실행 — S1~S3 동일 caveat)
- [x] arg-hint·고지·README 갱신, gate 통과, 회귀 없음 (arg-hint는 S0서 flip; 정본 고지 wiki 명사로 복제;
      README analyze 퀵스타트 artifact-first + `--local` 줄 추가 — S6 소유 2×2 블록 미접촉; `plugin
      validate` 신규 경고 없음)

### Blocked by

- S1

> **S4 구현 완료 (2026-07-11, 커밋 b9d5ddf).** plugin-visual body 배선 = S1~S3 패턴 복제.
> (1) "HTML channel routing (default = Artifact)" 프리앰블 신설 + **path-or-url 입력(로컬경로/설치
> 플러그인명/GitHub URL)은 Phase 1서 동일 타깃 디렉터리로 수렴하므로 채널 결정 동일** 명시(S4 검증
> 포인트), (2) 로컬 섹션 헤더 "HTML report — local design-system channel (`--local` / non-capable
> fallback)"로 재라벨 + 스테일 "(the default)"/"default format" 프레이밍 제거, (3) Artifact 섹션 헤더
> "(`--artifact`)"→"(default on a capable account)" rename + "Same content decisions as Phase 5R
> above"→"the local design-system channel above" cross-ref 교정, (4) 정본 고지(명사=**wiki**)로 교체 +
> Fallback을 **풀 로컬 design-system+Mermaid wiki 재생성**(fragment `open` 금지, ADR 0009 §3)으로 재작성.
> Format 표/Config-precedence/arg-hint는 S0서 flip돼 미접촉. Error-handling 표 신설 없음(이 스킬은
> Gotchas + Fallback 문단 컨벤션 — S2/S3와 동일 판단).

---

## S5 — fact-check: 검증 후 대상이 게시된 아티팩트면 같은 URL로 republish (생성 아님)

### What to build

**검수 정정 — 원래 "채널 신설" 프레이밍 폐기.** fact-check는 리포트 **생성기가 아니다**:
`disable-model-invocation: true`, `allowed-tools`에 `Artifact`/`Skill(artifact-design)` 없음(`Edit`
있음), 동작은 "기존 리포트에서 주장 추출→소스 대조→**제자리 수정**→검증 요약 섹션 주입". 리포트를
author하지 않으므로 S0의 `capable × format → channel` 결정표·force-local·degrade·md 경로가 **매핑되지
않는다**.

맞는 모델 = **report-manager 8단계(republish-content-only)**. 검증 대상이 이미 게시된
`.artifact.html` fragment(옆에 `<report>.artifact.json` 사이드카 존재)면, 제자리 편집 후 **같은
claude.ai URL로 `url=` republish** + 사이드카 갱신. `gotchas.md`의 명시적 carve-out에 따라 이 경로는
artifact-design 프리로드·`Skill(artifact-design)` 권한 **불필요**. 대상이 로컬 파일이면 현행대로
제자리 편집만(채널 선택 없음 — 대상의 기존 채널을 따라감).

### Acceptance criteria

- [x] `allowed-tools`에 `Artifact` 추가 (artifact-design 프리로드·Skill 권한은 불필요)
- [x] 대상이 게시된 아티팩트 fragment(사이드카 존재) → 편집 후 **같은 URL로 republish** + 사이드카 갱신
- [x] fragment 대상일 때 post-edit 게이트를 **`--content-only`로 전환**(현행은 항상 full 게이트 —
      `SKILL.md:207` — fragment를 오탐)
- [x] 대상이 로컬 파일/비아티팩트 → 현행 제자리 편집 동작 불변 (채널 결정 없음)
- [x] README에 fact-check republish 동작 반영 (arg-hint에 새 채널 플래그 **불필요** — 대상 따라감)

### Blocked by

- S0 (사이드카/URL 계약 참조), report-manager 8단계 패턴

> **S5 구현 완료 (2026-07-11, 커밋 b9d5ddf).** fact-check body 배선 = report-manager 8단계(republish-content-only)
> 패턴 적용. (1) `allowed-tools`에 `Artifact` 추가(`Skill(artifact-design)` 미추가 — gotchas carve-out:
> content-only republish는 design 로드·권한 불필요), (2) Target File Detection에 "Artifact-channel
> detection" 신설 — `<target>.artifact.json` 사이드카 존재 = 게시된 fragment, 없으면 로컬 제자리 편집
> 불변(채널 결정 아님 = 대상의 기존 채널 따라감, SSOT/ADR 0009 §Scope 인용), (3) Phase 4 게이트 재검사를
> fragment면 `--content-only`로 분기(현행 항상 full 오탐 교정), (4) Phase 4.5 Republish 신설 = 사이드카
> url/title/favicon 읽어 `Artifact` `url=` republish + `write-artifact-sidecar.js` 갱신 + edge case 2건
> (사이드카 없는 `.artifact.html`, republish 에러 시 fresh publish + stale-link 고지), (5) Phase 5 헤더에
> republish URL 반영, README fact-check 행에 republish 동작 반영. `plugin validate` 신규 경고 없음
> (기존 no-version 경고 11개만). **실제 republish E2E 미실행**(게시된 fragment + claude.ai 계정 필요 —
> SKILL.md 로직 정합만 확인).

---

## S6 — 레퍼런스 리프레이밍 + 출시

### What to build

"다이어그램 선택 = 채널무관, Mermaid = 강등된 렌더링 기법" 프레이밍을 설계 레퍼런스
(`diagram-type-selection.md`·`mermaid-patterns.md`의 스코프 주석)와 README 2×2 채널 표에 반영. 전
스킬 착지 후 CHANGELOG 항목 추가 + marketplace 버전 minor 범프 + `plugin.json`/`marketplace.json`
description 갱신, `unset CLAUDECODE && claude plugin validate .`로 최종 검증.

### Acceptance criteria

- [x] diagram-type-selection·mermaid-patterns 스코프 주석이 Mermaid=렌더링기법(Local/md 전용)임을 명시
- [x] README 채널 표가 최종 매트릭스(capable html→Artifact / non-capable→Local / md→Local) 반영
- [x] **README·manifest 스테일 문구 반전(구체):** README의 "Add `--artifact` to … instead of a local
      file" 문단·"Prefer never typing the flag?" 줄, `plugin.json`/`marketplace.json` description의
      "publish them as claude.ai Artifacts **via --artifact**"·"**so you don't need the flag every
      time**" — 전부 artifact-first 기본으로 반전(이제 `--local`이 예외 플래그)
- [x] CHANGELOG에 항목 추가, marketplace.json 버전 범프. **minor(4.6.2→4.7.0) vs major 판단 명시:**
      기본 출력 위치가 로컬파일→claude.ai URL로 바뀌는 건 user-visible이나, 자동 degrade + `--local`로
      구동작 복원 + 제거된 플래그 없음 → **minor로 처리**(이 근거를 CHANGELOG에 1줄). 이견 시 major.
- [x] `plugin.json`/`marketplace.json` description이 "artifact-first 기본"을 반영
- [x] `claude plugin validate .` 신규 경고 없음, 테스트 회귀 없음

### Blocked by

- S1, S2, S3, S4, S5

> **S6 구현 완료 (2026-07-11, 커밋 b9d5ddf).** 레퍼런스 리프레이밍 + 출시 배선.
> (1) `diagram-type-selection.md`에 "채널무관, Mermaid syntax 열=Local/md 렌더링 기법" 스코프 주석 신설,
> (2) `mermaid-patterns.md`에 "Local/md 전용 렌더링 기법, Artifact 채널 미사용" 스코프 주석 신설, (3)
> README "Artifact publishing" 블록을 artifact-first 3행 매트릭스(capable html→Artifact / `--local`·
> non-capable→Local / md→Local)로 반전 + `--local` 예외 플래그·config `artifact: false` 문구, md+artifact
> 는 doc-visual 단독 예외로 1줄 명시, (4) `plugin.json`·`marketplace.json` description 반전("publish as
> claude.ai Artifacts by default; add --local…"), (5) CHANGELOG `## 4.7.0` 항목 추가(minor 근거 1줄
> 포함), (6) marketplace.json 버전 4.6.2→4.7.0 범프. `plugin validate` 신규 경고 없음(기존 no-version 11개
> 만), JSON parse OK. **육안 렌더검사(S1~S5 미실행분)는 여전히 남음** — 실제 스킬 구동 필요.
