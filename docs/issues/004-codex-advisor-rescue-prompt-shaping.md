# codex-advisor: rescue 적응적 프롬프트 셰이핑 (B2) + provenance 백필

> 상태: 완료 (0911ddd, v1.73.0 — codex-advisor 4.5.0) · 생성: 2026-06-21 · 완료: 2026-06-21
> 용어집: `docs/context/codex-advisor.md`
> 결정 근거: `docs/adr/0004-codex-advisor-prompt-ownership.md`
> 출처: grill-with-docs 세션 (프롬프트 소유권 분석)

## What to build

codex-advisor의 task 경로 중 **rescue만** 프롬프트가 헐벗었다(raw passthrough). verify/research는
공식 `gpt-5-4-prompting` 블록을 vendor해 구조화돼 있는데, rescue는 사용자 텍스트를 그대로
Codex `task`에 던진다 → write 작업인데 `action_safety` 안전망이 없고, 사용자가 대충 승인하면
공식 경로보다 프롬프트 품질이 낮다.

ADR 0004의 결정(**B2**)을 구현한다: rescue 스킬의 자체 LM이 작업유형별로 적절한 블록을 골라
**사용자 텍스트는 verbatim 유지**한 채 감싸고, Phase 1.5에서 승인받는다. 동시에 vendored 블록의
**provenance 부채**(출처 표기 0, 재싱크 트리거 없음)를 갚는다.

**핵심 불변식 (절대 깨지 않음):**
- 사용자의 단어는 **다시 쓰지 않는다**. `<task>` 안에 원문 그대로. 스캐폴딩만 추가 → 원래 우려
  ("래퍼가 Codex를 잘못된 방향으로 오도")를 만들지 않는다.
- native 경로(review/adversarial)는 **건드리지 않는다** — 프롬프트는 Codex 서버 소유.
- task 경로의 blind-payload / 더블체크 독립성 / Pattern A·B는 그대로 유지.

### 슬라이싱 원칙 (tracer bullet)

S1이 rescue 한 스킬을 end-to-end로 끌고 가 패턴을 demoable하게 증명한다(rescue 블록을 다는 곳이라
rescue의 출처 주석도 S1에서 같이 단다). S2는 verify/research 두 파일에만 출처 주석을 달아 rescue와
파일 충돌 0. S3는 verify/research output-contract 태그 정정(nit-A). S4는 릴리즈 마무리.
S1·S2는 병렬 가능; S3는 S2와 같은 파일(verify/research)이라 S2 뒤 순차.

---

## Slice 1 — rescue 적응적 셰이핑 (tracer 증명)

**Type:** AFK · **Blocked by:** None

### What to build

`skills/codex-rescue/SKILL.md`를 수정해 Phase 1에서 작업유형별 블록을 선택하고, Phase 1.5에서
감싼 프롬프트를 미리보기로 승인받고, Phase 2에서 그 감싼 프롬프트를 전송한다.

블록 선택 규칙 (전부 `gpt-5-4-prompting` prompt-blocks.md vendored 집합에서):

- **`<task>`** — 항상. 사용자의 승인된 작업 텍스트를 **원문 그대로** 넣는다(요약·재작성 금지).
- **`--write` ON (구현/수정):** `<completeness_contract>` + `<verification_loop>` + `<action_safety>`
- **`--write` OFF (읽기전용 조사):** `<completeness_contract>` + `<grounding_rules>`

Phase 1.5 draft는 기존 "bare 텍스트" 대신 **감싼 XML 전체**를 보여준다(verify/research와 동일 톤).
Phase 2 heredoc은 bare 텍스트가 아니라 감싼 프롬프트를 PROMPT_FILE에 쓴다.

> 왜 정적 템플릿이 아니라 적응적인가: rescue의 작업유형은 **가변**(구현/디버그/조사)이라 고정
> 템플릿 하나로 못 덮는다. verify/research는 작업이 고정이라 정적이 맞다. 독립성 논리가 rescue엔
> 안 통하는 이유(더블체크가 diff에 후행)는 ADR 0004 참조.

### Acceptance criteria

- [ ] Phase 1이 `--write` on/off로 블록 집합을 분기 (write→completeness+verification+action_safety, 읽기전용→completeness+grounding)
- [ ] 사용자 작업 텍스트가 `<task>` 안에 **verbatim** 보존 (패러프레이즈/요약 0)
- [ ] 쓰는 블록 이름이 전부 vendored 집합과 일치 (phantom 블록 0)
- [ ] Phase 1.5 draft가 **감싼 XML 전체**를 fenced 블록으로 표시 (bare 텍스트 아님)
- [ ] Phase 2 heredoc이 감싼 프롬프트를 PROMPT_FILE에 기록
- [ ] **`--no-preview` 경로도 래핑 유지** — 래핑은 Phase 1 블록선택에서 일어나므로 preview를 건너뛰어도 감싼 프롬프트가 전송돼야 한다. `SKILL.md:154` 주석 "(or the original if --no-preview)"이 bare 텍스트를 암시해 stale → "감싼(승인 없이 자동 래핑된) 프롬프트"로 정정
- [ ] **데모**: `/codex-rescue "implement rate limiter" --write` → 미리보기에 `<task>implement rate limiter</task>` + completeness + verification + action_safety 노출 → 승인 → companion `task`가 구조화 프롬프트 수신. 읽기전용(`--write` 생략 또는 조사형 요청)은 grounding 분기 확인
- [ ] blind-payload / Pattern B / `--resume-last`·`--fresh` 라우팅 / 독립성(Phase 1-3 소스 안 읽음) 회귀 없음
- [ ] rescue SKILL.md 본문(line 9–18 "translator" 서술)을 adaptive shaping 반영해 갱신 — "raw passthrough / clean task invocation" 함의 제거. (살아있는 raw 서술은 `docs/context/codex-advisor.md:46` "Subcommand `task` pipes stdin **raw** — `readTaskPrompt`…"에 있고, 이건 companion 메커니즘 서술이라 셰이핑 후에도 참 → **건드리지 않는다**. `docs/reference/gotchas.md`는 codex/rescue 언급 자체가 없으니 대상 아님)
- [ ] rescue 블록 바로 위 자기완결 출처 주석 1줄: `# blocks copied from official gpt-5-4-prompting (prompt-blocks.md); re-sync if the official guide updates` (중앙 정본 파일·ADR 포인터 없음)

### Blocked by

None — can start immediately.

---

## Slice 2 — provenance 백필 (verify/research 출처 주석)

**Type:** AFK · **Blocked by:** None

### What to build

vendored 블록의 출처를 **블록 바로 옆 주석**(co-location)으로 명시해 provenance 부채를 갚는다.
현재 `grep gpt-5-4-prompting` 하면 플러그인 subtree(skills/scripts/references/README)에서 아무것도
안 나온다 → 메인테이너가 이 블록이 공식 가이드에서 왔다는 것도, 공식 plugin이 프롬프팅 가이드를
버전업하면 재싱크해야 한다는 것도 모른다.

긴 근거·용어 정의는 이미 `docs/adr/0004` + `docs/context/codex-advisor.md`에 있음(둘 다 **레포 전용**,
플러그인엔 ship 안 됨). 그래서 필요한 건 **코드 옆 표지**뿐 — 중앙 정본 파일·companion-usage.md
절·ADR 포인터 전부 안 만든다.

- **`skills/codex-verify`·`codex-research` SKILL.md** 각 프롬프트 블록 바로 위 한 줄 자기완결 주석:
  `# blocks copied from official gpt-5-4-prompting (prompt-blocks.md); re-sync if the official guide updates`
- rescue의 같은 주석은 **S1에서** 처리한다(블록을 다는 곳이라 자연히 같이). 그래서 S2는
  verify/research 두 파일만 — rescue 파일을 안 건드려 S1과 충돌 0.

> **ADR 0004 대비 의도적 축소(명시):** ADR Consequences(0004:88)는 provenance 대상으로
> verify/research/rescue/`companion-usage.md` **4곳**을 든다. 이 이슈는 `companion-usage.md`를
> co-location 논리로 **의도적 제외**한다 → ADR의 그 항목은 미이행. 은근슬쩍 누락이 아니라
> 의식적 선택임을 여기 박아둔다(미래 감사가 "ADR 미준수"로 오판하지 않게).

> 왜 co-location인가: provenance는 **블록을 재vendor할 때만** 바뀌고, 그 시점이 곧 이 스킬 파일을
> 고치는 순간이다 → 주석을 블록 옆에 두면 재싱크하며 못 지나친다(드리프트 0). 중앙 파일은 떨어져
> 있어 한쪽만 고치고 까먹기 쉽다. 복제 자체는 ADR 0004의 의도된 결정(결정성·미리보기·독립성);
> 부채는 복제가 아니라 **출처 표기 누락**이다. 이 슬라이스는 표기만 추가하고 블록 내용은 안 건드린다.

### Acceptance criteria

- [ ] `grep -rn "gpt-5-4-prompting" plugins/codex-advisor/{skills,scripts,references,README.md}` 가
      이제 provenance 마커를 찾음 (이전엔 0)
- [ ] verify·research 각 블록 위 자기완결 출처 주석 (출처 + 재싱크 트리거를 한 줄에)
- [ ] 중앙 정본 파일 **신설 0** · companion-usage.md/CONTEXT 의존 **0** · ADR 포인터 **0** (자기완결)
- [ ] 블록 **내용**은 변경 0 (표기만 추가)

### Blocked by

None — S1과 다른 파일(verify/research)이라 병렬 가능.

---

## Slice 3 — verify/research output-contract 태그 정정 (nit-A)

**Type:** AFK · **Blocked by:** Slice 2 (같은 파일 verify/research SKILL.md → 순차)

### What to build

verify·research가 **출력 shape**를 정의하는 블록에 `<compact_output_contract>` 태그를 쓰는데,
카탈로그상 출력 shape 전용 태그는 `<structured_output_contract>`다 (compact = "스키마 대신 간결
산문"). 두 스킬 몸통은 출력 스키마다 — verify: `PASS/FAIL + P1/P2 verdict`, research: 구조화 분석
(facts/inferences/open-Q + risks/tradeoffs). → `structured_output_contract`가 카탈로그상 정확.
**태그명만 교체, 몸통 텍스트는 0 변경.**

> 왜 별도 슬라이스: S2 불변식이 "블록 내용 변경 0"이라 태그 rename(=내용 변경)을 거기 못 섞는다.
> 이건 **의도된** 내용 변경이라 독립 슬라이스. rescue는 compact_output_contract를 안 써 대상 아님.
> 기능 영향 없음(Codex는 몸통을 읽음, 태그명은 약신호) — 카탈로그 충실도/일관성 정리용 nit.
>
> nit-B(research 블록 중복 의혹)는 검수 결과 **존재하지 않음**(오독) → 작업 없음.

대상 (각 파일 heredoc + Phase 1.5 미리보기 **양쪽**, 미러 유지):
- `skills/codex-verify/SKILL.md` — 여는/닫는 태그 짝 둘 다
- `skills/codex-research/SKILL.md` — 여는/닫는 태그 짝 둘 다

연쇄(태그명 목록이 stale해짐):
- `references/companion-usage.md` §8 예시(:411) — 예시 블록명도 동기화
- `docs/context/codex-advisor.md` vendored 블록 목록(:51) — **살아있는 용어집**이라 실제 반영
- `docs/adr/0004`(:53) 목록 — **시점 박제, 안 건드림**(결정 당시 기록)

### Acceptance criteria

- [ ] verify·research에 `compact_output_contract` 0건, `structured_output_contract`로 대체 — 여는/닫는 태그 짝 일치 (깨진 XML 0)
- [ ] heredoc과 Phase 1.5 미리보기 블록 **동일**(미러)
- [ ] 블록 **몸통 텍스트** 변경 0 (태그명만)
- [ ] `structured_output_contract`가 카탈로그 prompt-blocks.md에 실재 확인 (phantom 0)
- [ ] companion-usage.md 예시 + docs/context 용어집 목록 동기화; ADR은 미변경

### Blocked by

- Slice 2 (verify/research 파일 공유 → S2 뒤 순차)

---

## Slice 4 — 릴리즈 마무리

**Type:** AFK · **Blocked by:** Slice 1, Slice 2, Slice 3

### What to build

동작 변경(rescue 셰이핑) 반영. SemVer minor = 4.4.0 → **4.5.0** (feature).

> 버전 규칙: codex-advisor는 local(`./`) 소스 → 버전은 `marketplace.json`에만. `plugin.json`엔
> 버전 안 박음. 단 **description은 양쪽 다** 갱신.
>
> 범위: 이 슬라이스는 **콘텐츠 편집 + validate까지만**. develop→main `--no-ff` merge / 태그 /
> `git fetch` 사전점검 같은 git-flow는 이 이슈 범위 밖 — `docs/release-workflow.md` 8단계로 처리.

- `marketplace.json` codex-advisor 버전 4.5.0
- `marketplace.json` + `plugin.json` description 갱신 (rescue가 이제 구조화 프롬프트 — 추가만,
  제거 기능 없음)
- `README.md`: **제거할 rescue-raw 서술 없음**(grep 0 확인됨). README:121이 이미 "rescue는 전송
  프롬프트를 그대로 보여준다"고 해 셰이핑 후에도 참 → 고칠 모순 없음. 변경은 "rescue가 이제 블록을
  감싼다"는 **선택적 긍정 언급**에 한함. 없는 raw 문구 사냥/날조 금지.
- `unset CLAUDECODE && claude plugin validate .` 통과

### Acceptance criteria

- [ ] `marketplace.json` codex-advisor version = 4.5.0
- [ ] `plugin.json` + `marketplace.json` description 일치 + rescue 셰이핑 반영
- [ ] README에 제거할 rescue-raw 서술이 **없음** 확인(grep 0) → 변경은 선택적 긍정 언급에 한함, 날조 금지 (vacuous AC 방지)
- [ ] `claude plugin validate .` 통과
- [ ] (있으면) CHANGELOG 4.5.0 항목 (rescue 셰이핑 + S3 태그 정정 포함)

### Blocked by

- Slice 1, Slice 2, Slice 3
