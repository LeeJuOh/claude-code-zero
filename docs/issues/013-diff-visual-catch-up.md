# 이슈 013 — diff-visual Catch-up 전환 구현 (슬라이스 S1~S4)

> 상태: **ready-for-agent** — 구현 착수 전 · 생성: 2026-08-22
> 스펙 (PRD): `docs/specs/013-diff-visual-catch-up.md` — 문제 정의, 유저 스토리, 결정 D1~D12 전부 스펙 참조
> 대상 플러그인: `plugins/vision-powers/` (v4.7.1 → v4.8.0)
> Seam: `skills/diff-visual/SKILL.md` 단일. 스크립트(`extract-hunks.js`, `artifact-gate.js`, 사이드카)·디자인 레퍼런스 무변경. 검증은 실제 diff로 생성 + 게이트 + 육안.
> 용어집: `docs/context/vision-powers.md` — **Catch-up / Literate diff / Quiz** · ADR: 0010

## Slices (tracer bullets)

의존 순서: S1 → S2 → S3. S4는 S1 이후 언제든.

### S1 — SKILL.md 섹션 교체: 4섹션 Catch-up, HTML 두 채널 (스토리 1~13, 16, 17; 결정 D1~D9, D12)

**What to build**: "Report structure" 표와 로컬/Artifact 채널 본문을 Background → Intuition → Code →
Quiz 4섹션으로 교체. 삭제 섹션 7개의 서술·다이어그램 매핑 제거. Key Changes의 추출 규칙(ADR 0005,
`structured-blocks.md` 참조)은 Code 섹션의 literate diff로 이전 — 파일 단위가 아니라 이해 순서, 줄 범위
추출, 전체 diff는 접힌 부록. Intuition에 전/후 흐름도(예시 데이터 필수), Code 첫 블록에 조건부 의존
전/후 그림(사실만, 판단 금지, 무변경 시 생략). Quiz 규칙(5문항·중난도·함정 금지·어절 수 균일·클릭
피드백, 인라인 JS — Artifact CSP 내). Data Gathering에 "Background용 주변 코드 넓은 탐색" 단계 추가.
문체 한 줄(Kleppmann) 추가. "When to run" 두 줄 상단 추가. 뒷단 절차(Format/Scope/Language/Intent/
fact sheet/게이트/발행/사이드카/PNG 자가점검) 무변경.

**Acceptance criteria** (실제 diff 2종 — 의존 변화 있음/없음 — 으로 Artifact·`--local` 각각 생성):
- [ ] 리포트 섹션이 정확히 Background / Intuition / Code / Quiz 순, 목차 있음, 탭 없음
- [ ] Background 깊은 층이 `<details>` 접힘, 좁은 층 펼침
- [ ] Intuition에 장난감 데이터 예시 + 전/후 흐름도 2장, 흐름도에 예시 데이터 문자열 존재
- [ ] Code의 코드 블록이 `extract-hunks.js` 출력과 byte 동일(모델 타이핑 0건), 전체 diff 부록 접힘
- [ ] 의존 변화 있는 diff → 전/후 의존 그림 존재, 없는 diff → 부재
- [ ] 리포트 전체에 판단 어휘(should / bad / 좋다 / 나쁘다 / 권장) 0건
- [ ] 삭제 섹션 제목(Overview, File Map, Hot Spots, Change Classification, Dependency Shift, New Components, Architecture Impact) 0건 — SKILL.md와 산출물 모두
- [ ] Quiz 5문항, 각 문항 보기 어절 수 동일, 클릭 시 정오답+보기별 설명, Artifact 페이지에서 동작
- [ ] SKILL.md 상단에 When to run 두 줄 + Kleppmann 문체 한 줄
- [ ] `artifact-gate.js`(로컬 full / Artifact `--content-only`) 통과, 로컬 채널 PNG 자가점검 수행

**Blocked by**: None — can start immediately.

### S2 — md 모드 4섹션 + 접힌 퀴즈 (스토리 14, 15; 결정 D6, D8)

**What to build**: `--format md` 템플릿을 4섹션으로 교체. Background 깊은 층은 "(아는 독자는 건너뛰기)"
표시. Code는 ` ```diff ` 펜스(`extract-hunks.js --json`). Quiz는 문항 + 보기 나열, 정답·설명은 접힌
블록(`<details>` 또는 구분선 아래). 300행 캡 유지. 번역 규칙(산문 번역, 코드·경로 원문) 유지.

**Acceptance criteria**:
- [ ] `--format md` 산출물이 4섹션 순서, 300행 이내
- [ ] 퀴즈 정답이 첫 화면에 노출되지 않음(접힘/분리)
- [ ] 코드 펜스 내용이 `extract-hunks.js --json` 출력과 동일
- [ ] 한국어 요청 시 산문·퀴즈 한국어, 코드·경로·커밋 해시 원문

**Blocked by**: S1 — 섹션 정의를 공유.

### S3 — description·README·버전·핸드오프 정리 (스토리 18, 19; 결정 D10, D11)

**What to build**: `plugin.json`·`marketplace.json` 양쪽 description의 diff-visual 구절을 "리뷰 전
따라잡기(배경·직관·literate diff·퀴즈)"로 교체 — "split-diff, File Map change-flags" 문구 제거.
SKILL.md frontmatter description 동일 취지로. README diff-visual 절을 "왜 필요한가(에이전트 코드에
아는 시스템이 없다) → Quick Start → 섹션 4개 → When to run"으로 재작성. `marketplace.json` 4.7.1 →
4.8.0. 핸드오프 문서 상단에 "→ spec 013으로 대체됨" 한 줄.

**Acceptance criteria**:
- [ ] 두 매니페스트 description 일치, "File Map change-flags"·"split-diff" 0건, "catch up"/"quiz" 포함
- [ ] README diff-visual 절에 삭제 섹션 언급 0건, When to run 존재
- [ ] `marketplace.json` 4.8.0
- [ ] `unset CLAUDECODE && claude plugin validate .` 통과
- [ ] 핸드오프 문서에 대체 표시

**Blocked by**: S1, S2 — 문서가 최종 동작을 기술.

### S4 — 문체 비교 실험 (스토리 20; 결정 D9) — 선택

**What to build**: 같은 diff로 Kleppmann 한 줄 있음/없음 두 번 생성, Readability·Visibility 축으로 유저
육안 비교. 결과를 ADR 0010 Consequences에 한 줄 추가(유지/삭제). 코드 변경 없음.

**Acceptance criteria**:
- [ ] 두 산출물 경로와 유저 판정 한 줄이 ADR 0010에 기록

**Blocked by**: S1.
