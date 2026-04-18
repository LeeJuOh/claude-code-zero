# vision-powers 2026-04-18 커밋 감사

> 범위: 오늘자 커밋 4개(6837860, 8c958fd, f124c30, 0d0bfe4). 코드 수정 없이 발견 사항만 정리.

## 대상 커밋

| SHA | 주제 |
|---|---|
| `6837860` | 2.15.0 — HTML+MD parity, aesthetic rotation, CSS recipe recovery |
| `8c958fd` | environment-health observational redesign + docs accuracy |
| `f124c30` | environment-health doc drift fix (area counts, schema tier flags) |
| `0d0bfe4` | 2.16.0 — diagram argumentation, visual self-audit, feedback harvesting |

## 발견 총계

| Severity | 건수 |
|---|---|
| Critical | 2 |
| Major | 8 |
| Minor | 10 |
| (검증 후 기각) | 1 |

Critical 2건 모두 직접 코드/문서로 재확인함.

---

## Critical

### C1. validate-report.js 일반 노드 라벨 검사에서 `&` 누락
**파일:** `plugins/vision-powers/scripts/validate-report.js:136`

line 136의 정규식 `/[(){}:;/\\<>]/`에 `&`가 빠져 있음. 반면 line 164의 sequenceDiagram 메시지 검사는 `[{}\[\]<>&]`로 `&`를 포함. Mermaid 파서는 flowchart/graph의 unquoted `&`에서도 깨지므로, 일반 노드 라벨에 `Profit & Loss` 같은 값이 들어오면 정적 검증을 통과하고 5b 시각 감사에서야 걸림. line 136 문자 집합에 `&` 추가 권장.

### C2. Step 5b 종료 코드 분기 지시가 암묵적
**파일:** `plugins/vision-powers/references/report-generation-workflow.md:122-138`

`Bash(node scripts/render-report.js ...)`만 제시하고 종료 코드를 어떻게 잡아서 분기하는지 에이전트 기준 지시가 없음. 현재 문구상 "If the render script succeeded" 판단을 에이전트 추론에 의존. Chrome 미탐지 시 조용히 5b를 스킵하거나 역으로 실패한 PNG를 통과시킬 여지가 있음. 명시적 `echo "EXIT=$?"` 또는 `|| echo FAIL` 패턴을 문서에 박아두는 편이 안전.

---

## Major

### M1. environment-health SKILL.md의 "4 observational" vs 실제 5개 드리프트
**파일:**
- `plugins/vision-powers/skills/environment-health/SKILL.md:6, 19-20` — "5 graded areas plus 4 observational"
- `references/section-structure.md:51` — `observational: ["Plugin Inventory", "Startup Context Budget", "Trigger Collisions", "Hook Complexity", "Plugin Components"]` (5개)
- `references/health-criteria.md` — §1, §2, §5, §6, §9 관측(observational) (5개)

f124c30이 스키마/예시를 잡았으나 SKILL.md 프런트매터 + body 문장 자체는 여전히 "4 observational". 관측 영역이 5개(§1,§2,§5,§6,§9)이므로 프런트매터 description의 "4 observational"을 "5 observational"로 수정 필요. body 19–20줄도 동일.

### M2. environment-health SKILL.md의 section-structure 참조 문구
**파일:** `SKILL.md:331` — "8-section HTML report"

§9 Plugin Components 추가로 9-section으로 변경됐고 line 197은 `{expected-sections}: 9`로 이미 일치. 331줄 문구만 stale.

### M3. diagram-argumentation.md ↔ anti-slop-rules.md Generic Diagram Labels 중복
**파일:**
- `references/design-system/diagram-argumentation.md:19-34` (Evidence Artifacts)
- `references/design-system/anti-slop-rules.md:26-52` (Generic Diagram Labels)

같은 규칙을 두 장소에서 서로 다른 프레임("evidence artifacts" vs "no generic labels")으로 규정. 두 파일 모두 같은 금지 라벨(`Component`, `Data`, `API`, `Service` …) + 유사 수정 예시 포함. 두 파일 모두 `visual-report-writer`에 함께 로드되므로 컨텍스트 낭비 + 한쪽만 갱신될 때 drift 위험. 권장: anti-slop-rules에는 집행(플랫 금지 목록), diagram-argumentation에는 철학("왜 이게 중요한가")만 두고 상호 참조.

### M4. 디자인 체크리스트가 런타임으로 강제되지 않음
**파일:**
- `references/design-system/diagram-argumentation.md:124-139` (10-item 체크리스트)
- `scripts/validate-report.js`

Isomorphism / Education / Evidence / No Generic Labels 체크 중 *Generic Labels만* 정적 grep으로 집행 가능한데, validate-report.js는 문법(rgba/color/파서 브레이커)만 체크하고 라벨 금지 목록은 미검사. 체크리스트가 "선언만 되고 집행 안 되는 규범"이 되면 장기적으로 무시됨. `\b(Component|Data|API|Service|Module|Database|Event|Message|Process|Step)\b`를 Mermaid 블록 내부에서 grep하는 저렴한 정적 규칙 추가 고려.

### M5. README의 "visual self-audit"와 실제 워크플로의 구속력 불일치
**파일:** `plugins/vision-powers/README.md:48` vs `references/report-generation-workflow.md:136-138`

README는 "inspects the rendered image before delivery — catching broken Mermaid diagrams, blank Chart.js canvases, and layout breaks"라고 단언. 실제 워크플로는 Chrome 미설치 시 best-effort로 skip("do not block — static validation alone is acceptable"). 사용자 기대와 실제 보장이 다름. README에 "best-effort, skipped if Chrome unavailable" 문구 한 줄 추가 권장.

### M6. fact-check 스킬의 aesthetic rotation 미커버
**파일:** `plugins/vision-powers/skills/fact-check/SKILL.md`

2.15.0 커밋 메시지는 "Every generation skill ... rotate palette/font"인데 fact-check에는 `aesthetic-hint` 관련 문구가 없음. fact-check의 `--format html` 경로가 자체적으로 visual-report-writer에 라우팅된다면 aesthetic-rotation.js 호출 지시가 문서에 있어야 함. 없으면 fact-check 리포트만 같은 팔레트로 고정됨.

### M7. fact-check `--format md` 모드 의미 모호
**파일:** `plugins/vision-powers/skills/fact-check/SKILL.md:30, 140+, 210-226`

`--format` 플래그는 받지만 본문 흐름은 "기존 문서에 verification block 삽입"을 전제. diff-visual/plan-visual처럼 standalone md 리포트 템플릿은 없음. `--format md`의 계약(= standalone 리포트 vs = 삽입 모드)을 한 문장으로 박아두는 편이 혼란을 줄임.

### M8. report-manager의 refine 트리거 문구 부재
**파일:** `plugins/vision-powers/skills/report-manager/SKILL.md:3-9` (description)

description 앞쪽 subcommand 목록에는 `refine`이 있으나, "이런 상황에서 트리거" 예시 구절("fix section 3", "update my findings" 같은 것)이 description에 포함돼 있지 않아 auto-trigger 커버리지가 낮음. 앞쪽에 refine 트리거 구절 1~2개 추가하면 개선.

### M9. report-manager refine의 MCP 탐지 신호 모호
**파일:** `skills/report-manager/SKILL.md:121-130`

"if `mcp__claude-in-chrome__*` tools are callable in this session"까지만 적고 실제 판별 방법을 명시하지 않음. 에이전트는 결국 한 번 호출해보고 에러로 확인함. "먼저 `tabs_context_mcp`를 호출해 성공하면 Path A, 에러 반환이면 Path B"처럼 명시 권장.

---

## Minor

### m1. health-criteria.md status tally 예시 stale
**파일:** `skills/environment-health/references/health-criteria.md:451`
예시 객체에 observational이 2개만 나열. section-structure.md와 맞추어 5개 다 나열.

### m2. diagram-argumentation 체크리스트 Variety 규칙 모호
**파일:** `references/design-system/diagram-argumentation.md:133`
"no two diagrams use identical patterns" — 동일성 기준이 명시되지 않음. "same Mermaid type? same visual structure?" 예시와 예외 규정 필요.

### m3. diagram-argumentation의 Isomorphism/Education Test에 실패 예시 부재
**파일:** `diagram-argumentation.md:11-15`
통과 예시만 있고 실패→수정 예시가 없어 적용 방법이 구체적이지 않음.

### m4. anti-slop-rules.md 길이가 실용 한도 근접
**파일:** `references/design-system/anti-slop-rules.md` (127줄, 8개 섹션)
승인 목록(Approved Aesthetics / Palettes / Dark Mode)과 금지 목록을 분리하면 단일 리포트당 로드되는 규범 컨텍스트가 깔끔해짐.

### m5. render-report.js Windows Chrome 경로 탐색 없음
**파일:** `plugins/vision-powers/scripts/render-report.js:62-65`
macOS/Linux 경로만 시도, Windows는 곧바로 null 반환. DX 관점 minor. `Program Files\Google\Chrome\Application\chrome.exe` 계열 후보 2개 추가면 해결.

### m6. stateDiagram 라벨 정규식이 quoted만 커버
**파일:** `scripts/validate-report.js:155-158`
unquoted state label은 검사 못함. 실무상 거의 quoted이므로 작지만 문서로 범위 명시 권장.

### m7. report-manager localStorage 키 format 미문서화
**파일:** `skills/report-manager/SKILL.md:111`
`vp-feedback-<pathname>`에서 `file://` URL의 pathname이 전체 파일 경로라는 점과 URL 인코딩 여부가 불명확.

### m8. report-manager fallback "Copy 버튼 부재 시" 처리 부재
**파일:** `skills/report-manager/SKILL.md:134`
구버전 리포트는 feedback bar 자체가 없을 수 있음. "Copy 버튼이 보이지 않으면 직접 설명을 요청" 같은 3차 fallback 문구 추가 권장.

### m9. report-manager argument-hint가 refine 인자 모호
**파일:** `skills/report-manager/SKILL.md:10`
`<list|open|delete|search|refine> [filter] [--all]` — `refine`이 `[filter]`나 `[--all]`을 쓰는지 불명. refine은 다른 subcommand와 인자 구조가 다르므로 명시 필요.

### m10. agent-extension-visualizing의 `--format` 문서 포맷이 타 스킬과 상이
**파일:** `skills/agent-extension-visualizing/SKILL.md:56-64`
diff-visual, plan-visual, project-recap은 "Format Detection" 표준 섹션으로 통일, agent-extension-visualizing은 "Output Format Detection" 다른 구조. 5개 생성 스킬 간 학습 가능한 템플릿을 깨므로 동일 구조로 정렬 권장.

---

## 기각된 파인딩

### YAML `argument-hint` sequence trap
하위 에이전트가 `[--format html|md]`가 YAML sequence로 파싱될 위험을 지적했으나, 실제 값 7개가 전부 `"..."` 문자열로 감싸져 있어 무효. skill-creator-pro 체크리스트의 "plain string" 요건도 이미 충족.

---

## 칭찬할 점

- **환경 헬스 리디자인의 철저함**: 모든 graded 임계값이 official docs 앵커로 귀속, heuristic은 명시적으로 heuristic으로 표기. `gotchas` 16개 중 다수가 실제 도그푸드 실수 기반.
- **Step 5a/5b 분리의 필요성**: 정적/시각 패스 분리는 명확하고 문서 구조도 깔끔. render-report.js의 Chrome 미탐지 시 graceful 폴백 경로는 잘 설계.
- **diagram-argumentation.md의 Pattern Map 표**: Isomorphism, Multi-Zoom, Evidence Artifacts 세 축을 단일 표로 액셔너블하게 정리. 2.16.0의 개념적 중심.
- **aesthetic-rotation 파이프라인**: `assemble-report.js`에서 메타데이터 추출→회전 상태 기록까지 원샷 자동화, 메타데이터 부재 시에도 조용히 폴백.
- **f124c30 드리프트 픽스의 범위 선택**: 스키마, 예시 tally, `area_type` 플래그까지 일관되게 갱신. 잔여 드리프트 2건(SKILL.md frontmatter 카운트, 331줄 참조)을 제외하면 잘 수습.

---

## 권장 후속 작업 우선순위

1. **C1, C2 즉시 수정** — validate-report.js `&` 추가, workflow.md 종료코드 분기 명시
2. **M1, M2 수정** — environment-health 카운트/섹션 수 일관성 (2분 작업)
3. **M3, M4 결정** — diagram-argumentation ↔ anti-slop 중복 해결 + Generic Label 정적 검증 추가
4. **M5, M7, M9 문서만 정비** — README 문구 1줄, fact-check --format md 계약 1줄, MCP 탐지 문구 1줄
5. **M6, M8 신규 작업** — fact-check aesthetic rotation 연결 + report-manager description 트리거 확장
6. Minor 10건은 다음 마이너 릴리즈(2.16.x) 정리 묶음으로

---

감사 완료. 이 문서는 `docs/enhancement/` 트리 아래 보관.
