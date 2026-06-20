# vision-powers 시각 레버리지 강화: Kami/taste-skill 증명 패턴 흡수

> 상태: 구현 대기 · 생성: 2026-06-20
> 용어집: `plugins/vision-powers/CONTEXT.md`
> 근거 레퍼런스: `references/Kami`, `references/taste-skill`
> 선행 이슈: `docs/issues/001-vision-powers-redesign.md` (파이프라인 폐기 → 모델 직접작성)

## What to build

vision-powers의 사명(**장황한 AI 출력 → 한눈에 보이는 시각 산출물**)을 더 잘 해내도록, 검증된 두 레퍼런스에서 패턴을 끌어와 보강한다.

- **taste-skill** → "디자인 판단은 모델에 위임 + 나쁜 디폴트(Tells)는 이름 붙여 차단" (=개선 **A**)
- **Kami** → "렌더해서 눈으로 확인 안 했으면 안 끝난 것" (=개선 **B**)
- 검수에서 나온 작은 모순·빈틈 청소 (=개선 **C**)

**핵심 불변식 (절대 깨지 않음):** 디자인 취향·레이아웃·CSS는 **계속 모델이 결정**한다. 이 작업은 디자인을 강제하지 않는다 — CONTEXT.md "Leverage vs Delegation" 그대로, 스킬은 *레버리지*(가드레일·검증)만 더한다. "빨강 써"가 아니라 "장황하게 흘리지 마".

**왜 지금:** 현재 게이트(`artifact-gate.js`)는 HTML 코드(텍스트)만 검사한다. 콘텐츠가 장황하게 흘렀는지(A), 렌더된 그림이 한눈에 들어오는지(B)는 아무도 안 본다. 두 빈틈을 메운다.

### 적용 범위 (스킬별로 무엇이 붙나)

| 스킬 | A (Tells) | B (self-audit) | C |
|---|---|---|---|
| doc-visual | ✓ | ✓ | — |
| diff-visual | ✓ | ✓ | — |
| plugin-visual | ✓ | ✓ (HTML) | 템플릿 문구 + md 경량체크 |
| context-health-visual | ✓ | ✓ | — |
| report-manager (refine) | ✓ | ✓ | MCP 실패 고지 |
| fact-check | — | — | summary 게이트 재검 |

> fact-check는 **새 구조를 저작하지 않고** 기존 리포트의 사실만 교정·보존한다 → 저작용 가드레일(Tells)·self-audit 불필요, C만 적용.

### 슬라이싱 원칙 (tracer bullet)

각 SKILL.md는 **정확히 한 슬라이스**만 편집한다(파일 충돌 0). doc-visual을 먼저 끝까지 끌고 가 패턴을 증명(demoable)한 뒤 나머지 스킬로 팬아웃 → de-risk.

---

## Slice 1 — 공유 레퍼런스 2종 (foundation)

**Type:** AFK · **Blocked by:** None

### What to build

배선 없이 공유 문서 2개만 신설. 나머지 슬라이스가 이걸 가리킨다.

> **경로 주의 (필수):** 신규 파일은 **`plugins/vision-powers/references/design-system/`**에 둔다 — 기존 `semantic-tokens.md`/`artifact-gate.md`와 같은 폴더. 최상위 `references/`는 **gitignore된 외부 레퍼런스 디렉터리**(Kami·taste-skill 거주)이므로 거기 두면 ① 커밋/배포 안 됨 ② 스킬이 참조하는 `${CLAUDE_PLUGIN_ROOT}/references/design-system/...` 경로가 안 풀린다. 아래 파일명은 전부 이 플러그인 내부 경로 기준.

- **`plugins/vision-powers/references/design-system/anti-slop-tells.md`** — explainer 행동 슬롭 7종(요약흘림·linear dump·억지 다이어그램·제네릭 라벨·균일 밀도·장식·accent 남발)을 taste-skill 방식(이름 + 왜 슬롭 + Before→After)으로. 색/CSS 슬롭은 이미 `semantic-tokens.md` + 게이트가 잡으므로 중복 금지 — 행동 슬롭만, 기계 검사 항목은 기존 파일로 cross-ref. CONTEXT.md "Slop" 정의와 연결.
- **`plugins/vision-powers/references/design-system/visual-self-audit.md`** — `render-report.js` → PNG → Read(멀티모달)로 봄 → 밀도/위계/Mermaid 깨짐/오버플로 확인 → 수정·재렌더(최대 2회) 루프. **카미식 결정론 측정 스크립트는 안 만든다**(HTML엔 고정 캔버스 없어 여백%·페이지수 정의 불가 + 디자인 기계화는 위임 원칙 위배) — 이 결정과 이유를 문서에 명시. `render-report.js` 기본 height 8000px라 초장문 리포트는 잘릴 수 있다는 한계도 적는다. 재렌더 루프는 매 회 Chrome 스폰 + 기본 `--wait 12000ms`라 느리니, 빠른 감사엔 작은 `--wait`를 넘기라는 팁도 적는다.

### Acceptance criteria

- [ ] 두 파일이 **`plugins/vision-powers/references/design-system/`** 안에 신설(최상위 gitignore된 `references/` 아님) — `git status`에 추적 대상으로 뜨는지 확인
- [ ] 내부 일관 + 기존 design-system 파일과 cross-ref 정확
- [ ] anti-slop-tells: 색/CSS 슬롭과 중복 0 (행동 슬롭만)
- [ ] visual-self-audit: 결정론 측정 미채택 이유 + Chrome 부재 시 graceful skip + height 한계 명시
- [ ] 디자인 강제 0 — 전부 "위임 유지 + 나쁜 디폴트 차단" 프레이밍
- [ ] (정성 검토) 두 문서가 그 자체로 읽혀야 함 — 기계검증 대상 아님

### Blocked by

None — can start immediately.

---

## Slice 2 — doc-visual 끝까지 (tracer 증명)

**Type:** AFK · **Blocked by:** Slice 1

### What to build

플래그십 doc-visual 하나에 A+B를 **end-to-end**로 붙여 패턴 전체를 demoable하게 증명한다. 이후 팬아웃의 레퍼런스 구현이 됨.

- A: anti-slop-tells.md를 doc-visual 본문 "Key rules"/Reference 표에서 참조.
- B: Validation 흐름에서 게이트 통과 후 self-audit 스텝 추가 — render → Read PNG → 확인 → 수정. Chrome 없으면 스킵+경고(배포 안 막음).

### Acceptance criteria

- [ ] doc-visual이 anti-slop-tells.md + visual-self-audit.md를 참조
- [ ] 게이트 뒤 self-audit 스텝 명시 (render-report.js → PNG → Read → 수정 루프)
- [ ] **실제 데모**: 샘플 md → 리포트 생성 → 게이트 통과 → PNG 렌더 → 모델이 읽고 밀도/위계/Mermaid 확인까지 한 바퀴 — **단 Chrome(또는 `CHROME_BIN`) 있을 때만 풀 데모**. 없으면 `render-report.js`가 exit 1 → self-audit 스텝은 graceful-skip 경로만 검증(배포 안 막힘). "demoable" 게이트를 Chrome 부재로 가짜 차단하지 말 것
- [ ] 디자인 강제 0 (위임 유지)

### Blocked by

- Slice 1

---

## Slice 3 — diff-visual 팬아웃

**Type:** AFK · **Blocked by:** Slice 2

### What to build

Slice 2에서 증명한 패턴을 diff-visual에 동일 적용 (A + B). diff-visual 고유 다이어그램(파일맵·변경분류)에 맞춰 Tells/self-audit 표현만 조정.

### Acceptance criteria

- [ ] diff-visual이 두 공유 ref 참조 + 게이트 뒤 self-audit 스텝
- [ ] HTML·md 양쪽에서 일관 (self-audit는 HTML만)
- [ ] 디자인 강제 0

### Blocked by

- Slice 2

---

## Slice 4 — plugin-visual 팬아웃 + C(템플릿 문구·md 체크)

**Type:** AFK · **Blocked by:** Slice 2

### What to build

A+B 적용 + plugin-visual에만 해당하는 C 2건. plugin-visual SKILL.md를 어차피 이 슬라이스가 건드리므로 C도 여기 합쳐 충돌 회피.

- A+B: HTML 모드(Phase 5R)에 두 ref + self-audit.
- C-1: md 모드 "report-template.md 써" ↔ HTML 모드 "No templates" **문구 모순 해소**. md 템플릿은 *정보구조 스키마*지 미감 아님을 명확히 — **삭제 아님, 표현만**.
- C-2: md 모드 인라인 배포 전 leftover `{placeholder}`·죽은 링크 **경량 체크 가이드**.

### Acceptance criteria

- [ ] plugin-visual HTML 모드가 두 ref 참조 + self-audit
- [ ] "No templates" 문구 모순 해소 (md 스키마 유지)
- [ ] md 경량 체크 가이드 추가
- [ ] 디자인 강제 0

### Blocked by

- Slice 2

---

## Slice 5 — context-health-visual 팬아웃

**Type:** AFK · **Blocked by:** Slice 2

### What to build

A+B 동일 적용. context-health-visual 고유(quadrant·timeline 대시보드)에 맞춰 조정.

### Acceptance criteria

- [ ] context-health-visual이 두 ref 참조 + 게이트 뒤 self-audit
- [ ] 디자인 강제 0

### Blocked by

- Slice 2

---

## Slice 6 — report-manager + fact-check (보조 스킬)

**Type:** AFK · **Blocked by:** Slice 2

### What to build

서로 다른 파일이라 한 슬라이스에 묶어도 충돌 없음.

- **report-manager (refine 경로)**: 섹션 재저작에 Tells 적용 + refine 후 self-audit + 브라우저 피드백 수확 실패 시 **"못 가져왔어요" 고지**(지금 SKILL.md:134는 조용히 ask-flow로 fallback — 고지 한 줄만 추가, 차단 금지).
  - ⚠️ **변수 함정:** report-manager는 게이트를 `${CLAUDE_SKILL_DIR}/../../scripts/...`(SKILL.md:100) 상대형으로 부른다(다른 스킬은 `${CLAUDE_PLUGIN_ROOT}/scripts/...`). render-report.js 배선도 **같은 `${CLAUDE_SKILL_DIR}/../..` 형**을 쓸 것 — `${CLAUDE_PLUGIN_ROOT}` 섞으면 경로 깨짐.
- **fact-check**: 덧붙이는 verification summary도 최종 출력에 **게이트 재검**(C). **단 게이트는 HTML 전용** → `--format html`(또는 HTML 입력 자동감지)로 HTML 요약을 주입했을 때만 재검. md 요약 주입 시엔 재검 무의미(스킵). Tells/self-audit 저작 배선은 안 함(구조 보존 스킬).

### Acceptance criteria

- [ ] report-manager refine: Tells 참조 + self-audit(`${CLAUDE_SKILL_DIR}/../..` 변수 일관) + MCP 실패 고지
- [ ] fact-check: HTML 포맷 summary 삽입 후 게이트 재검 명시 (md 포맷은 스킵)
- [ ] 디자인 강제 0

### Blocked by

- Slice 2

---

## Slice 7 — 릴리즈 마무리

**Type:** AFK · **Blocked by:** Slice 3, 4, 5, 6

### What to build

동작 변경(self-audit 스텝 + 새 레퍼런스) 반영. SemVer minor = 4.4.0 → **4.5.0**.

### Acceptance criteria

- [ ] `marketplace.json` 버전 4.5.0 (local 플러그인 = 여기만)
- [ ] `plugin.json` + `marketplace.json` description 갱신 (제거된 기능 없으니 추가만)
- [ ] `README.md` 반영
- [ ] `plugins/vision-powers/CHANGELOG.md` 4.5.0 항목 (기존 파일, 최신 4.4.0 위에 추가)
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과

### Blocked by

- Slice 3, 4, 5, 6
